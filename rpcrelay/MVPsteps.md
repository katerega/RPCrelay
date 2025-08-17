RPC Relay MVP — Multi‑Chain, API‑Key Auth, Rate Limits, Usage

A production‑lean MVP JSON‑RPC relay you can run today. Features:

Multi‑chain routing (Ethereum, BSC, Arbitrum, Base) via /rpc/:chain

Private API keys with plan‑based rate limits and concurrency caps

Round‑robin + failover across multiple upstream providers per chain

Low latency via keep‑alive + compression

Usage metering (per key, per chain, per day) in MongoDB

Admin API to issue/suspend keys and set plans

Docker Compose stack (API + MongoDB + optional Redis)

cURL/Web3 usage examples

Stack: Node 20 + Express, MongoDB (Mongoose), rate‑limiter‑flexible, Axios. Optional Redis if you want distributed rate‑limits.


FOLDER LAYOOUT
rpc-relay/
├─ api/
│  ├─ package.json
│  ├─ Dockerfile
│  ├─ src/
│  │  ├─ index.js
│  │  ├─ config.js
│  │  ├─ plans.js
│  │  ├─ chains.js
│  │  ├─ auth.js
│  │  ├─ limiter.js
│  │  ├─ router.js
│  │  ├─ models/
│  │  │  ├─ ApiKey.js
│  │  │  └─ Usage.js
│  │  └─ utils/
│  │     ├─ rrPool.js
│  │     ├─ meter.js
│  │     └─ httpAgent.js
│  └─ .env.example
├─ deploy/
│  └─ docker-compose.yml
└─ README.md

api/.env.example
PORT=8080
NODE_ENV=production
MONGO_URI=mongodb://mongo:27017/rpc_relay
# If you want Redis-backed rate limits across replicas:
REDIS_URL=redis://redis:6379

# Admin bootstrap secret to create first admin call:
ADMIN_BOOTSTRAP_TOKEN=change-this-strong-token

# Upstreams (comma separated) — add at least one per chain
ETHEREUM_UPSTREAMS=https://mainnet.infura.io/v3/YOUR_KEY,https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_UPSTREAMS=https://bsc-dataseed1.binance.org,https://bsc-dataseed.binance.org
ARBITRUM_UPSTREAMS=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_UPSTREAMS=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# CORS allowed origin for your dashboards/clients (or *)
ALLOWED_ORIGIN=*







api/package.json
{
  "name": "rpc-relay-api",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "http-status-codes": "^2.3.0",
    "ioredis": "^5.4.1",
    "mongoose": "^8.6.0",
    "morgan": "^1.10.0",
    "rate-limiter-flexible": "^5.0.0"
  }
}



api/src/config.js
import dotenv from 'dotenv';
dotenv.config();

export const cfg = {
  port: Number(process.env.PORT || 8080),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rpc_relay',
  redisUrl: process.env.REDIS_URL || null,
  adminBootstrapToken: process.env.ADMIN_BOOTSTRAP_TOKEN || '',
  corsOrigin: process.env.ALLOWED_ORIGIN || '*',
  upstreams: {
    ethereum: (process.env.ETHEREUM_UPSTREAMS || '').split(',').filter(Boolean),
    bsc: (process.env.BSC_UPSTREAMS || '').split(',').filter(Boolean),
    arbitrum: (process.env.ARBITRUM_UPSTREAMS || '').split(',').filter(Boolean),
    base: (process.env.BASE_UPSTREAMS || '').split(',').filter(Boolean)
  }
};





api/src/plans.js
// Plans define rate limit & concurrency per API key
export const PLANS = {
  trial: { rpm: 1200, burst: 300, concurrency: 5 },     // 20 rps avg
  basic: { rpm: 6000, burst: 1500, concurrency: 20 },   // 100 rps avg
  pro:   { rpm: 30000, burst: 6000, concurrency: 60 },  // 500 rps avg
  ultra: { rpm: 120000, burst: 24000, concurrency: 200 } // 2000 rps avg
};

export function planOrDefault(name) {
  return PLANS[name] || PLANS.trial;
}







api/src/chains.js
import { cfg } from './config.js';

export const CHAINS = {
  ethereum: cfg.upstreams.ethereum,
  bsc: cfg.upstreams.bsc,
  arbitrum: cfg.upstreams.arbitrum,
  base: cfg.upstreams.base
};

export function assertChain(name) {
  if (!CHAINS[name] || CHAINS[name].length === 0) {
    throw new Error(`Chain ${name} not configured or no upstreams`);
  }
}






api/src/models/ApiKey.js
import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  key: { type: String, index: true, unique: true },
  label: { type: String },
  plan: { type: String, default: 'trial' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ApiKey', apiKeySchema);






api/src/models/Usage.js
import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema({
  key: { type: String, index: true },
  chain: { type: String },
  date: { type: String, index: true }, // YYYY-MM-DD
  calls: { type: Number, default: 0 },
  fail: { type: Number, default: 0 },
  p50: { type: Number, default: 0 },
  p95: { type: Number, default: 0 }
});

export default mongoose.model('Usage', usageSchema);






api/src/utils/httpAgent.js
import http from 'node:http';
import https from 'node:https';

export const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 256 });
export const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 256 });



api/src/utils/rrPool.js
// Simple round-robin pool per chain
const counters = new Map();

export function nextUpstream(chain, list) {
  const i = counters.get(chain) || 0;
  const url = list[i % list.length];
  counters.set(chain, i + 1);
  return url;
}




api/src/utils/meter.js
import Usage from '../models/Usage.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function recordUsage({ key, chain, ok, ms }) {
  const date = today();
  await Usage.updateOne(
    { key, chain, date },
    { $inc: { calls: 1, fail: ok ? 0 : 1 } },
    { upsert: true }
  );
  // NOTE: p50/p95 aggregation job can be added later; this MVP stores counts.
}




api/src/auth.js
import ApiKey from './models/ApiKey.js';
import { planOrDefault } from './plans.js';

export async function authKey(req, res, next) {
  const apiKey = req.header('x-api-key') || req.query.api_key;
  if (!apiKey) return res.status(401).json({ error: 'Missing x-api-key' });
  const doc = await ApiKey.findOne({ key: apiKey });
  if (!doc) return res.status(401).json({ error: 'Invalid API key' });
  if (doc.status !== 'active') return res.status(403).json({ error: 'API key suspended' });
  req.apiKey = doc;
  req.planCfg = planOrDefault(doc.plan);
  next();
}







api/src/limiter.js
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { cfg } from './config.js';

let limiter;

if (cfg.redisUrl) {
  const redis = new Redis(cfg.redisUrl);
  limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rlf',
    points: 1, // will be overridden per request dynamically
    duration: 1
  });
} else {
  limiter = new RateLimiterMemory({ points: 1, duration: 1 });
}

export async function rateLimitPerKey(req, res, next) {
  const { planCfg } = req; // { rpm, burst }
  const key = `k:${req.apiKey.key}`;
  // Allow bursts: use points = burst per 60s window
  const points = planCfg.burst;
  try {
    await limiter.consume(key, 1, { customDuration: 60, customPoints: points });
    next();
  } catch {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
}








api/src/router.js
import express from 'express';
import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import { CHAINS, assertChain } from './chains.js';
import { nextUpstream } from './utils/rrPool.js';
import { recordUsage } from './utils/meter.js';
import { httpAgent, httpsAgent } from './utils/httpAgent.js';

const router = express.Router();

router.post('/rpc/:chain', async (req, res) => {
  const chain = String(req.params.chain || '').toLowerCase();
  try {
    assertChain(chain);
  } catch (e) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: e.message });
  }

  const upstreams = CHAINS[chain];
  const started = Date.now();
  let lastErr = null;

  for (let i = 0; i < upstreams.length; i++) {
    const target = nextUpstream(chain, upstreams);
    try {
      const r = await axios.post(target, req.body, {
        timeout: 8000,
        httpAgent,
        httpsAgent,
        headers: { 'content-type': 'application/json' }
      });
      const ms = Date.now() - started;
      recordUsage({ key: req.apiKey.key, chain, ok: true, ms }).catch(()=>{});
      return res.status(r.status).json(r.data);
    } catch (err) {
      lastErr = err;
      // try next upstream
    }
  }

  const ms = Date.now() - started;
  recordUsage({ key: req.apiKey.key, chain, ok: false, ms }).catch(()=>{});
  return res.status(StatusCodes.BAD_GATEWAY).json({ error: 'All upstreams failed', details: lastErr?.message });
});

export default router;








api/src/index.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { cfg } from './config.js';
import ApiKey from './models/ApiKey.js';
import router from './router.js';
import { authKey } from './auth.js';
import { rateLimitPerKey } from './limiter.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(compression());
app.use(helmet());
app.use(cors({ origin: cfg.corsOrigin }));
app.use(morgan('tiny'));

mongoose.connect(cfg.mongoUri).then(() => console.log('Mongo connected')).catch((e)=>{
  console.error('Mongo error', e.message);
  process.exit(1);
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Admin bootstrap: create an API key by POSTing header x-admin-token
app.post('/admin/issue-key', async (req, res) => {
  const token = req.header('x-admin-token');
  if (!token || token !== cfg.adminBootstrapToken) return res.status(401).json({ error: 'unauthorized' });
  const { label = 'client', plan = 'trial' } = req.body || {};
  const key = 'dgk_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const doc = await ApiKey.create({ key, label, plan });
  res.json({ key: doc.key, plan: doc.plan, label: doc.label });
});

// Suspend / resume
app.post('/admin/set-status', async (req, res) => {
  const token = req.header('x-admin-token');
  if (!token || token !== cfg.adminBootstrapToken) return res.status(401).json({ error: 'unauthorized' });
  const { key, status } = req.body || {};
  if (!key || !['active','suspended']

  








