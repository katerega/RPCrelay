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