import Usage from '../models/Usage.js'

function today(){
    return new Date().toISOString().slice(0, 10);

}

export async function recordUsage({key, chain, ok, ms }){
    const date = today();
    await Usage.updateOne(
        {key, chain, date },
        {$inc: {calls: 1, fail: ok ? 0 : 1}},
        {upsert: true}
    );
    // NOTE: p50/p95 aggregation job can be added later , this MVP stores counts 
}