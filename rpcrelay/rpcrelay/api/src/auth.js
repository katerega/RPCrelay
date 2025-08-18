import ApiKey from './models/ApiKey.js';
import {planOrDefault} from './plans.js';

export async function authKey(req, res, next){
    const apiKey = req.header('x-api-key') || req.query.api_key;
    if(!apiKey) return res.status(401).json({error:'Missing x-api-key'});
    const doc = await ApiKey.findOne({key: apiKey});
    if(!doc) return res.status(401).json({error: 'Invalid API key'});
    if(doc.status !=='active') return res.status(403).json({error: 'API Key suspended'});
    req.apiKey = doc;
    req.planCfg = planOrDefault(doc.plan);
    next();
}