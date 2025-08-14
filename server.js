// server.js (basic Express server)

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/digpeg_rpc', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const UserSchema = new mongoose.Schema({
  username: String,
  contact: String, // email or Telegram handle
  plan: String,
  paymentStatus: { type: String, default: 'pending' }, // pending, paid
  rpcEndpoint: String,
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', UserSchema);

const plans = {
  trial: { price: 50, durationDays: 7, description: '7-day trial shared access' },
  basic: { price: 250, description: 'Monthly shared access' },
  dedicated: { price: 500, description: 'Monthly dedicated node' },
  ultra: { price: 1000, description: 'Ultra-low latency private node' },
};

// Endpoint: Get plans
app.get('/plans', (req, res) => {
  res.json(plans);
});

// Endpoint: Purchase plan (register user & plan)
app.post('/purchase', async (req, res) => {
  const { username, contact, plan } = req.body;
  if (!username || !contact || !plans[plan]) {
    return res.status(400).json({ error: 'Missing or invalid data' });
  }
  const user = new User({ username, contact, plan });
  await user.save();

  // Return payment instructions (simulate)
  return res.json({
    message: 'User registered. Please complete payment.',
    paymentAddress: 'USDT:0xYourPaymentAddressHere',
    userId: user._id,
  });
});

// Endpoint: Confirm payment & issue RPC endpoint (simulate payment confirmation)
app.post('/confirm-payment', async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.paymentStatus === 'paid') return res.json({ message: 'Already paid' });

  user.paymentStatus = 'paid';

  // Assign RPC endpoint based on plan
  // (In reality, generate or fetch real private endpoints from your infra)
  const endpoints = {
    trial: 'https://trial.rpc.digpeg.io/' + user._id,
    basic: 'https://basic.rpc.digpeg.io/' + user._id,
    dedicated: 'https://dedicated.rpc.digpeg.io/' + user._id,
    ultra: 'https://ultra.rpc.digpeg.io/' + user._id,
  };

  user.rpcEndpoint = endpoints[user.plan];
  await user.save();

  // TODO: Send email/Telegram notification here with endpoint & setup guide

  res.json({ message: 'Payment confirmed, RPC endpoint issued.', rpcEndpoint: user.rpcEndpoint });
});

app.listen(3000, () => {
  console.log('DigPeg RPC Relay MVP server running on port 3000');
});
