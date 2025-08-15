// after wallet connected (ethers v6)
const depositCredits = async ({ billingAddress, stableAddress, amount }) => {
  const stableAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
  const billingAbi = ["function depositCredits(uint256 amount) external"];
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const stable = new ethers.Contract(stableAddress, stableAbi, signer);
  const billing = new ethers.Contract(billingAddress, billingAbi, signer);
  const amountMinor = ethers.parseUnits(amount.toString(), 6); // if USDC
  await stable.approve(billingAddress, amountMinor);
  await billing.depositCredits(amountMinor);
};

// generate apiKey (client side) — also store on server for mapping
const apiKey = cryptoRandomString(); // use secure randomness
await kitContract.deployKit("swap-dex", "bsc-testnet", apiKey);
