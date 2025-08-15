// gateway/meter.js (Node.js pseudocode)
const express = require('express');
const bodyParser = require('body-parser');
const LRU = require('lru-cache');
const ethers = require('ethers');
const { AbiCoder } = require('ethers');

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

// Load mapping from apiKey -> { userAddress, chain, plan }
const apiKeyMap = new Map(); // loaded from DB when deployment event occurs

// local counters (atomic in production: Redis INCR)
const COUNTER_WINDOW_MS = 60_000; // count per minute window (or smaller)
const counters = new Map(); // apiKey -> {count: number, lastFlush: timestamp}

// batching config
const FLUSH_INTERVAL = 30 * 1000; // flush every 30s
const GASLESS_BATCH_THRESHOLD = 1000; // number of calls before immediate billing

// web3 / billing contract setup
const BILLING_CONTRACT_ADDRESS = process.env.BILLING_CONTRACT;
const GATEWAY_PRIVATE_KEY = process.env.GATEWAY_PRIVATE_KEY; // gateway EOA authorized in PrepaidBilling
const provider = new ethers.providers.JsonRpcProvider(process.env.GATEWAY_RPC);
const gatewayWallet = new ethers.Wallet(GATEWAY_PRIVATE_KEY, provider);
const billingAbi = [ "function consumeCredits(address user, uint256 amount, string calldata apiKey) external" ];
const billingContract = new ethers.Contract(BILLING_CONTRACT_ADDRESS, billingAbi, gatewayWallet);

// price per call param (mirror on-chain)
const PRICE_PER_CALL = BigInt(process.env.PRICE_PER_CALL || "50"); // in USDC minor units

// helper: record a call
function recordCall(apiKey) {
  const now = Date.now();
  let entry = counters.get(apiKey);
  if (!entry) {
    entry = { count: 0, lastFlush: now };
    counters.set(apiKey, entry);
  }
  entry.count += 1;
}

// API proxy endpoint (simplified)
app.post('/rpc/:apiKey', async (req, res) => {
  const { apiKey } = req.params;
  const mapping = apiKeyMap.get(apiKey);
  if (!mapping) return res.status(401).send({ error: 'invalid api key' });

  // Proxy to the real chain RPC (use per-chain provider)
  const chainRpcUrl = mapping.chainRpc;
  // proxy logic omitted for brevity, but you'd forward req.body to chain RPC and return response
  // after successful proxy, record usage
  recordCall(apiKey);

  // return proxied response (placeholder)
  return res.json({ ok: true });
});

// Periodic flusher: consumes credits on-chain in batches
setInterval(async () => {
  // snapshot current counters and reset
  const snapshot = Array.from(counters.entries());
  for (const [apiKey, data] of snapshot) {
    if (data.count === 0) continue;
    const mapping = apiKeyMap.get(apiKey);
    if (!mapping) {
      counters.delete(apiKey);
      continue;
    }
    // compute cost = count * PRICE_PER_CALL
    const calls = BigInt(data.count);
    const cost = calls * PRICE_PER_CALL; // cost is in token minor units (USDC 6d)
    try {
      // call consumeCredits on-chain. Gateways must be authorized on contract
      const tx = await billingContract.consumeCredits(mapping.userAddress, cost.toString(), apiKey);
      await tx.wait(1);
      // reset counter
      counters.set(apiKey, { count: 0, lastFlush: Date.now() });
      // optional: emit invoice record to DB
    } catch (err) {
      console.error('billing error for', apiKey, err);
      // If billing fails due to insufficent funds, mark apiKey as suspended and notify user
      // (use billingContract.balanceOf to check)
    }
  }
}, FLUSH_INTERVAL);

app.listen(3000, () => console.log('gateway listening 3000'));
