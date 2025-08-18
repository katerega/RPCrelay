to run your RPC MVP server based on your api/src/index.js. Here's a step-by-step guide for a typical Node.js + Express + MongoDB setup:

1. Install Dependencies

Make sure you’re in your api folder:

cd api
npm install


This installs all packages in your package.json (express, mongoose, cors, helmet, morgan, compression, etc).

2. Configure Environment

Create a .env file or ensure your config.js (cfg) has the proper settings:

export const cfg = {
  port: 3000,
  mongoUri: 'mongodb://localhost:27017/rpc-mvp',  // your MongoDB URI
  corsOrigin: '*',  // or specific domains
  adminBootstrapToken: 'your-admin-token-here'
};


✅ Make sure MongoDB is running locally or replace the URI with a hosted MongoDB Atlas URI.

3. Run MongoDB

If using local MongoDB:

# On Linux / Mac
sudo service mongod start

# On Windows, start MongoDB service or use MongoDB Compass


Check that it’s running:

mongo --eval 'db.runCommand({ connectionStatus: 1 })'

4. Start the Server

Use Node or Nodemon:

# For plain Node
node src/index.js

# Or with nodemon (auto-restart on changes)
npx nodemon src/index.js


You should see:

Mongo connected
Server running on port 3000

5. Test the Endpoints

Health Check

curl http://localhost:3000/health
# Returns: { "ok": true }


Admin Issue Key

curl -X POST http://localhost:3000/admin/issue-key \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your-admin-token-here" \
  -d '{"label":"test-client","plan":"trial"}'


Set Key Status

curl -X POST http://localhost:3000/admin/set-status \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your-admin-token-here" \
  -d '{"key":"dgk_xyz123","status":"suspended"}'


Call Protected API
Use your issued API key with your authKey middleware:

curl -H "x-api-key: dgk_xyz123" http://localhost:3000/api/your-endpoint

6. Optional: Run in Development Mode

Install dotenv and nodemon for faster dev workflow:

npm install dotenv nodemon --save-dev


Then add a start:dev script in package.json:

"scripts": {
  "start": "node src/index.js",
  "start:dev": "nodemon src/index.js"
}


Run:

npm run start:dev






1. Prepare Your Servers

Each server should have Node.js, MongoDB access (or connect to a central MongoDB), and network connectivity.

Ideally, servers are in the same LAN or datacenter for low latency.

2. Run Multiple Instances

On each physical server, run your index.js:

node /path/to/api/src/index.js


Optionally, run multiple Node processes per server using PM2 to utilize all CPU cores:

npm install -g pm2
pm2 start src/index.js -i max  # runs as many processes as CPU cores

3. Load Balancing

Since you don’t have a cloud load balancer, you can use:

Option A: Nginx as Reverse Proxy

Install Nginx on a gateway server.

Configure upstream servers:

upstream rpc_servers {
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
    server 192.168.1.12:3000;
}

server {
    listen 80;
    server_name rpc.yourdomain.com;

    location / {
        proxy_pass http://rpc_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}


Nginx will distribute requests round-robin across your servers.

Option B: HAProxy

More advanced load balancing: supports least connections, health checks, failover.

Example config:

frontend rpc_front
    bind *:80
    default_backend rpc_back

backend rpc_back
    balance roundrobin
    server rpc1 192.168.1.10:3000 check
    server rpc2 192.168.1.11:3000 check
    server rpc3 192.168.1.12:3000 check

4. Scaling Logic (Semi-Automatic)

Since you don’t have cloud auto-scaling:

Monitor CPU, RAM, and relay usage per server.

When a server reaches ~70–80% load:

Add another physical server.

Start the Node.js process on it.

Add it to your Nginx/HAProxy config.

When load drops, you can remove servers to save power/cost.

✅ Optionally, you can script this with Ansible or Bash for faster deployment across multiple servers.

5. Database Considerations

All servers connect to one central MongoDB.

If writes become too heavy, consider:

MongoDB Replica Set for high availability.

Sharding for horizontal write scaling.

6. Optional Enhancements

Monitoring: Use Prometheus + Grafana or Netdata to watch CPU, memory, relay counts.

Caching: Redis for repeated JSON-RPC responses to reduce CPU/network load.

Health Checks: Nginx / HAProxy can remove a server from rotation if it becomes unresponsive.

✅ Summary for Physical Servers

Deploy Node.js app on multiple servers (PM2 recommended).

Use Nginx or HAProxy as load balancer.

Connect all instances to central MongoDB.

Monitor load, add/remove servers manually or semi-automatically.

Optional: add caching, health checks, and monitoring for stability.







concrete setup example for your RPC MVP running on physical servers. I’ll assume 3 servers for simplicity, each running your Node.js app on port 3000.

1. Server Details
Server	IP Address	Role
RPC1	192.168.1.10	Node.js app instance
RPC2	192.168.1.11	Node.js app instance
RPC3	192.168.1.12	Node.js app instance
LB	192.168.1.1	Nginx load balancer
Mongo	192.168.1.20	Central MongoDB

All Node servers connect to the same MongoDB at 192.168.1.20:27017.

2. Deploy Node.js App on Each Server

Install Node.js and PM2:

# On RPC1, RPC2, RPC3
git clone https://your-repo-url.git
cd api
npm install
npm install -g pm2

# Start the app on all CPU cores
pm2 start src/index.js -i max --name rpc-mvp
pm2 save
pm2 startup


-i max runs as many Node processes as CPU cores.

PM2 ensures your app restarts if it crashes.

3. Configure Nginx on Load Balancer

Install Nginx on the LB server (192.168.1.1) and edit /etc/nginx/conf.d/rpc.conf:

upstream rpc_servers {
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
    server 192.168.1.12:3000;
}

server {
    listen 80;
    server_name rpc.yourdomain.com;

    location / {
        proxy_pass http://rpc_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}


Restart Nginx:

sudo nginx -t
sudo systemctl restart nginx


Requests to http://rpc.yourdomain.com now distribute across your 3 servers.

4. Health Checks

Nginx automatically routes traffic, but you can add passive health checks to remove dead servers:

server 192.168.1.10:3000 max_fails=3 fail_timeout=30s;
server 192.168.1.11:3000 max_fails=3 fail_timeout=30s;
server 192.168.1.12:3000 max_fails=3 fail_timeout=30s;


Nginx will skip servers that fail more than 3 times in 30 seconds.

5. Scaling Up

When traffic increases:

Add a new server, e.g., RPC4 192.168.1.13.

Install Node.js, PM2, deploy the app, connect to MongoDB.

Add it to Nginx upstream block:

server 192.168.1.13:3000;


Reload Nginx:

sudo nginx -s reload


Now requests distribute across 4 servers.

6. Optional Monitoring

Install Netdata or Prometheus + Grafana on LB or a monitoring server.

Watch CPU, memory, network, and relay counts.

Alerts help you know when to add/remove servers.

7. Optional Caching

Deploy Redis to cache frequent JSON-RPC responses.

Connect your Node.js app to Redis to reduce CPU and MongoDB writes.

✅ Summary Architecture
[Clients]
   |
   v
[Nginx Load Balancer] <-- Health checks & round-robin
   |      |      |
   v      v      v
[RPC1]  [RPC2]  [RPC3]  <-- Node.js app (PM2)
   \      |      /
    \     |     /
     \    |    /
      [MongoDB] <-- Central DB for API keys & usage


Each Node instance reports usage to MongoDB.

LB distributes traffic evenly.

Add servers as relay demand grows.





simple dashboard for your RPC MVP clients to track their relay usage, limits, and billing. This can be a web page or API endpoint that shows real-time usage.

1. Extend MongoDB Schema

Assuming your ApiKey model currently looks like this:

import mongoose from 'mongoose';

const ApiKeySchema = new mongoose.Schema({
  key: String,
  label: String,
  plan: String,
  status: { type: String, default: 'active' },
});
export default mongoose.model('ApiKey', ApiKeySchema);


Add relay tracking:

const ApiKeySchema = new mongoose.Schema({
  key: String,
  label: String,
  plan: String,
  status: { type: String, default: 'active' },
  relaysUsed: { type: Number, default: 0 },      // total relays used
  lastReset: { type: Date, default: Date.now },  // for monthly reset
});

export default mongoose.model('ApiKey', ApiKeySchema);

2. Update Middleware to Track Usage

In auth.js (your authKey middleware):

import ApiKey from './models/ApiKey.js';

export async function authKey(req, res, next) {
  const key = req.header('x-api-key');
  if (!key) return res.status(401).json({ error: 'API key required' });

  const apiKey = await ApiKey.findOne({ key, status: 'active' });
  if (!apiKey) return res.status(403).json({ error: 'Invalid or suspended key' });

  // Increment relay usage
  apiKey.relaysUsed += 1; // increment per request
  await apiKey.save();

  req.apiKey = apiKey;
  next();
}


You can increment by 1 relay or batch count depending on how your system measures “relays.”

3. Create Dashboard Endpoint

Add in router.js or a new route file:

import express from 'express';
import ApiKey from './models/ApiKey.js';
import { authKey } from './auth.js';

const router = express.Router();

// Client usage dashboard
router.get('/dashboard', authKey, async (req, res) => {
  const apiKey = req.apiKey;

  // Example limit for trial / paid plans
  const relayLimit = apiKey.plan === 'trial' ? 20000000 : 100000000; 

  res.json({
    key: apiKey.key,
    label: apiKey.label,
    plan: apiKey.plan,
    status: apiKey.status,
    relaysUsed: apiKey.relaysUsed,
    relayLimit,
    relaysRemaining: relayLimit - apiKey.relaysUsed,
    lastReset: apiKey.lastReset,
  });
});

export default router;


Clients can GET /api/dashboard with their x-api-key to see usage.

4. Optional: Web Frontend

Simple HTML + JS page:

<!DOCTYPE html>
<html>
<head>
  <title>RPC Dashboard</title>
</head>
<body>
  <h1>My RPC Usage</h1>
  <div id="dashboard"></div>

  <script>
    const apiKey = 'dgk_xxx123';
    fetch('https://rpc.yourdomain.com/api/dashboard', {
      headers: { 'x-api-key': apiKey }
    })
    .then(res => res.json())
    .then(data => {
      document.getElementById('dashboard').innerHTML = `
        <p>Plan: ${data.plan}</p>
        <p>Status: ${data.status}</p>
        <p>Relays Used: ${data.relaysUsed}</p>
        <p>Relays Remaining: ${data.relaysRemaining}</p>
        <p>Last Reset: ${new Date(data.lastReset).toLocaleString()}</p>
      `;
    });
  </script>
</body>
</html>


You can host this on the same domain or a separate dashboard domain.

5. Automate Monthly Reset

Add a cron job to reset relaysUsed per API key:

import cron from 'node-cron';
import ApiKey from './models/ApiKey.js';

cron.schedule('0 0 1 * *', async () => {
  await ApiKey.updateMany({}, { relaysUsed: 0, lastReset: new Date() });
  console.log('Monthly relay usage reset');
});


✅ Result:

Clients log in with their API key.

See real-time relay usage, remaining relays, plan info.

You can bill automatically once they hit the 20M threshold.
