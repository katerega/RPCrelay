import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configuration
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000';
const API_TIMEOUT = 10000; // 10 seconds

// Static data
const PLANS = {
  trial: { price: 50, description: '7-day trial shared access, $50' },
  basic: { price: 250, description: 'Monthly shared access, $250' },
  dedicated: { price: 500, description: 'Monthly dedicated node, $500' },
  ultra: { price: 1000, description: 'Ultra-low latency private node, $1000' },
};

// API client
const api = axios.create({
  baseURL: API_BASE,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default function App() {
  const [plans, setPlans] = useState(PLANS);
  const [form, setForm] = useState({
    username: '',
    contact: '',
    plan: 'trial',
  });
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/plans');
        setPlans(response.data);
      } catch (err) {
        console.warn('Using default plans due to API error:', err);
        // Fallback to static plans if API fails
        setPlans(PLANS);
      }
    };

    fetchPlans();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.username.trim()) {
      setError({ message: 'Username is required' });
      return false;
    }

    if (!form.contact.trim()) {
      setError({ message: 'Contact information is required' });
      return false;
    }

    if (!form.contact.includes('@') && !form.contact.startsWith('@')) {
      setError({ message: 'Please provide a valid email or Telegram handle (starting with @)' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setPurchaseResult(null);

    try {
      const response = await api.post('/purchase', form);
      setPurchaseResult(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError({
          message: err.response?.data?.error || 'Purchase failed',
          details: err.response?.data,
        });
      } else {
        setError({
          message: 'An unexpected error occurred',
          details: err,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>DigPeg Ultra Relay Pass</h1>
      <p style={styles.description}>
        Sub-200ms latency RPC endpoints for Base, BSC, Arbitrum, and Ethereum — optimized for arbitrage bots, NFT snipers, and DeFi traders.
      </p>

      <h2 style={styles.sectionTitle}>Plans</h2>
      <ul style={styles.plansList}>
        {Object.entries(plans).map(([key, plan]) => (
          <li key={key} style={styles.planItem}>
            <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {plan.description}
          </li>
        ))}
      </ul>

      {error && (
        <div style={styles.errorMessage}>
          <p>{error.message}</p>
        </div>
      )}

      {!purchaseResult ? (
        <>
          <h2 style={styles.sectionTitle}>Purchase Access</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label htmlFor="username" style={styles.label}>
                Username / Bot Name:
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. AlphaBot123"
                disabled={loading}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="contact" style={styles.label}>
                Contact (Email or Telegram handle):
              </label>
              <input
                id="contact"
                name="contact"
                type="text"
                value={form.contact}
                onChange={handleChange}
                placeholder="e.g. your.email@example.com or @telegramuser"
                disabled={loading}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="plan" style={styles.label}>
                Select Plan:
              </label>
              <select
                id="plan"
                name="plan"
                value={form.plan}
                onChange={handleChange}
                disabled={loading}
                style={styles.select}
              >
                {Object.entries(plans).map(([key, plan]) => (
                  <option key={key} value={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)} (${plan.price})
                  </option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              style={loading ? styles.buttonLoading : styles.button}
            >
              {loading ? 'Processing...' : 'Purchase'}
            </button>
          </form>
        </>
      ) : (
        <div style={styles.successMessage}>
          <h3>Purchase Registered!</h3>
          <p>Complete your payment to:</p>
          <pre style={styles.paymentAddress}>{purchaseResult.paymentAddress}</pre>
          <p>We will send your private RPC endpoint to {form.contact} once payment is confirmed.</p>
          <p><strong>Your User ID:</strong> {purchaseResult.userId}</p>
          <p>Thank you for choosing DigPeg Ultra Relay!</p>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    color: '#333',
  },
  title: {
    color: '#2c3e50',
    marginBottom: '15px',
  },
  description: {
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  sectionTitle: {
    color: '#2c3e50',
    margin: '20px 0 10px',
  },
  plansList: {
    marginBottom: '20px',
    paddingLeft: '20px',
  },
  planItem: {
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
  },
  select: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
    backgroundColor: 'white',
  },
  button: {
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  buttonLoading: {
    padding: '12px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'not-allowed',
    marginTop: '10px',
  },
  errorMessage: {
    color: '#e74c3c',
    backgroundColor: '#fadbd8',
    padding: '10px',
    borderRadius: '4px',
    margin: '15px 0',
  },
  successMessage: {
    marginTop: '30px',
    backgroundColor: '#d5f5e3',
    padding: '15px',
    borderRadius: '5px',
    color: '#27ae60',
  },
  paymentAddress: {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    borderRadius: '4px',
    overflowX: 'auto',
  },
};