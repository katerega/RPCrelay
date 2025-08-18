import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { cfg } from './config.js';
import ApiKey from './models/ApiKey.js';
import router from './router.js';
import { authKey } from './auth.js';
import { rateLimitPerKey } from './limiter.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(compression());
app.use(helmet());
app.use(cors({ origin: cfg.corsOrigin }));
app.use(morgan('tiny'));

// Connect to MongoDB
mongoose.connect(cfg.mongoUri)
  .then(() => console.log('Mongo connected'))
  .catch((e) => {
    console.error('Mongo error', e.message);
    process.exit(1);
  });

// Health check endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

// Admin bootstrap: create an API key by POSTing header x-admin-token
app.post('/admin/issue-key', async (req, res) => {
  const token = req.header('x-admin-token');
  if (!token || token !== cfg.adminBootstrapToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { label = 'client', plan = 'trial' } = req.body || {};
  const key = 'dgk_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const doc = await ApiKey.create({ key, label, plan });
  res.json({ key: doc.key, plan: doc.plan, label: doc.label });
});

// Suspend / resume API key
app.post('/admin/set-status', async (req, res) => {
  const token = req.header('x-admin-token');
  if (!token || token !== cfg.adminBootstrapToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { key, status } = req.body || {};
  if (!key || !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid key or status' });
  }

  const doc = await ApiKey.findOne({ key });
  if (!doc) return res.status(404).json({ error: 'API key not found' });

  doc.status = status;
  await doc.save();
  res.json({ key: doc.key, status: doc.status, label: doc.label });
});

// Protected API routes
app.use('/api', authKey, rateLimitPerKey, router);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = cfg.port || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
