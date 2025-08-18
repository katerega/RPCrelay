import http from 'node:http';
import https from 'node:https';

export const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 256});
export const httspAgent = new https.Agent({keepAlive:true, maxSockets: 256});


