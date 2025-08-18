// plans define rate limit & concurrency per API key
export const PLANS = {
    trial: { rpm: 1200, burst: 300, concurrency: 5 }, // 20 rps avg
    basic: { rpm: 6000, burst: 1500, concurrency: 20 }, // 100 rps avg
    pro: { rpm: 30000, burst: 6000, concurrency: 60 }, // 500 rps avg
    ultra: { rpm: 120000, burst: 24000, concurrency: 200 } // 2000 rps avg
};

export function planOrDefault(name){
    return PLANS[name] || PLANS.trial;
}