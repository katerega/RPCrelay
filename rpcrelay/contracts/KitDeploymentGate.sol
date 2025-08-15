// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStakingRegistry {
    function hasStake(address user) external view returns (bool);
}

interface IPrepaidBilling {
    function balanceOf(address user) external view returns (uint256);
    function costForCalls(uint256 calls) external view returns (uint256);
}

contract KitDeploymentGate {
    address public stakingRegistry;
    IPrepaidBilling public billing;
    uint256 public minInitialCalls; // minimum calls prepaid on deploy (e.g., 100k calls)

    event KitDeployed(address indexed developer, string kitType, string chain, string apiKey);

    constructor(address registryAddress, address billingAddress, uint256 _minInitialCalls) {
        stakingRegistry = registryAddress;
        billing = IPrepaidBilling(billingAddress);
        minInitialCalls = _minInitialCalls;
    }

    function setMinInitialCalls(uint256 v) external {
        // TODO onlyOwner - add Ownable in production
        minInitialCalls = v;
    }

    function deployKit(string memory kitType, string memory chain, string memory apiKey) external {
        require(IStakingRegistry(stakingRegistry).hasStake(msg.sender), "Stake required before deployment");

        // ensure user has prepaid minimum credits
        uint256 needed = billing.costForCalls(minInitialCalls);
        require(billing.balanceOf(msg.sender) >= needed, "Insufficient prepaid credits for initial usage");

        // Emit event that triggers backend to actually spin up the kit and associate API key
        emit KitDeployed(msg.sender, kitType, chain, apiKey);
    }
}
