import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { cfg } from './config.js';

let limiter;

if(cfg.redisUrl){
    const Redis = new Redis(cfg.redisUrl);
    limiter = new RateLimiterRedis({
        storeClient: redis,
        KeyPrefix: 'rlf',
        points: 1, // will be overridden per request dynamically
        duration: 1
    });
} else {
    limiter = new RateLimiterMemory({points:1, duration: 1});
}


export async function rateLimitPerKey(req, res, next){
    const{ planCfg } = req; // {rpm, burst}
    const key = `k:${req.apiKey.key}`;
    // allow bursts: use points = burst per 60s window
    const points = planCfg.burst;
    try{
        await limiter.consume(key, 1, {customDuration: 60, customPoints: points});
        next();

    } catch{
        return res.status(429).json({error: 'Rate limit exceeded'});
    }
}


