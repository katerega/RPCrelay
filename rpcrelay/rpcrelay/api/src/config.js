import dotenv from 'dotenv';
dotenv.config();

export const cfg = {
    port: Number(process.env.PORT || 8080),
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rpc_relay',
    redisUrl: process.env.REDIS_URL || null,
    adminBootstrapToken: process.env.ADMIN_BOOTSTRAP_TOKEN || '',
    corsOrigin: process.env.ALLOWED_ORIGIN || '*',
    upstreams:{
        ethereum: (process.env.ETHEREUM_UPSTREAM ||'').split(',').filter(Boolean),
        bsc: (process.env.BSC_UPSTREAM ||'').split(',').filter(Boolean),
        arbitrum: (process.env.ARBITRUM_UPSTREAM ||'').split(',').filter(Boolean),
        base: (process.env.BASE_UPSTREAM ||'').split(',').filter(Boolean)
    }


}