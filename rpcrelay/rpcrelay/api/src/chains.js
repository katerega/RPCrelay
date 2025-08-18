import {cfg} from './config.js';

export const CHAINS = {
    ethereum: cfg.upstreams.ethereum,
    bsc: cfg.upstreams.bsc,
    arbitrum: cfg.upstreams.arbitrum,
    base: cfg.upstreams.base 
}

export function assertChain(name){
    if(!CHAINS[name] || CHAINS[name].length ===0){
        throw new Error('Chain ${name} not configured or no upstreams');
    }
}