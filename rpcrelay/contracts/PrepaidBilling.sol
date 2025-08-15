// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amt) external returns (bool);
    function transfer(address to, uint256 amt) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PrepaidBilling {
    address public owner;
    address public gateway;             // address allowed to consume credits
    IERC20 public stable;               // USDC (6 decimals) or other stable token
    uint256 public pricePerCall;        // price per RPC call in token smallest units (eg USDC 6d)

    mapping(address => uint256) public credits; // credits in token units

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Consumed(address indexed user, uint256 amount, uint256 newBalance, string apiKey);
    event Refunded(address indexed user, uint256 amount, uint256 newBalance);
    event GatewaySet(address indexed oldGateway, address indexed newGateway);
    event PricePerCallSet(uint256 oldPrice, uint256 newPrice);
    event OwnerSet(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() { require(msg.sender == owner, "owner only"); _; }
    modifier onlyGateway() { require(msg.sender == gateway, "gateway only"); _; }

    constructor(address _stable, address _gateway, uint256 _pricePerCall) {
        owner = msg.sender;
        stable = IERC20(_stable);
        gateway = _gateway;
        pricePerCall = _pricePerCall;
    }

    // deposit stable token to credit account (user must approve first)
    function depositCredits(uint256 amount) external {
        require(amount > 0, "zero deposit");
        require(stable.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        credits[msg.sender] += amount;
        emit Deposited(msg.sender, amount, credits[msg.sender]);
    }

    // gateway consumes credits on behalf of user when serving API calls
    // apiKey optional for off-chain mapping/audit
    function consumeCredits(address user, uint256 amount, string calldata apiKey) external onlyGateway {
        require(amount > 0, "zero amount");
        require(credits[user] >= amount, "insufficient credits");
        credits[user] -= amount;
        emit Consumed(user, amount, credits[user], apiKey);
    }

    // user can request refund of remaining credits to their address
    function refund(uint256 amount) external {
        require(amount > 0, "zero amount");
        require(credits[msg.sender] >= amount, "insufficient credits");
        credits[msg.sender] -= amount;
        require(stable.transfer(msg.sender, amount), "transfer failed");
        emit Refunded(msg.sender, amount, credits[msg.sender]);
    }

    // admin functions
    function setGateway(address newGateway) external onlyOwner {
        address old = gateway;
        gateway = newGateway;
        emit GatewaySet(old, newGateway);
    }

    function setPricePerCall(uint256 newPrice) external onlyOwner {
        uint256 old = pricePerCall;
        pricePerCall = newPrice;
        emit PricePerCallSet(old, newPrice);
    }

    function withdrawTo(address to, uint256 amount) external onlyOwner {
        require(stable.transfer(to, amount), "transfer failed");
    }

    function transferOwnership(address newOwner) external onlyOwner {
        address old = owner;
        owner = newOwner;
        emit OwnerSet(old, newOwner);
    }

    // View helpers
    function balanceOf(address user) external view returns (uint256) {
        return credits[user];
    }

    // compute estimated cost for number of calls: calls * pricePerCall
    function costForCalls(uint256 calls) public view returns (uint256) {
        return calls * pricePerCall;
    }
}
