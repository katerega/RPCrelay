// simple round-robin pools per chain
const counters = new Map();

export function nextUpstream(chain, list){
    const i = counters.get(chain) || 0;
    const url = list[1 % list.length];
    counters.set(chain, i + 1);
    return url;
}