const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const pool = require('../db');

// GET /api/tokens/plans — public
router.get('/plans', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plans ORDER BY price_inr ASC');
    res.json({ plans: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use(requireAuth);

// GET /api/tokens/balance
router.get('/balance', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    res.json({ balance: rows[0]?.tokens_balance ?? 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tokens/subscription — full subscription info
router.get('/subscription', async (req, res) => {
  try {
    const { rows: userRows } = await pool.query(
      `SELECT u.tokens_balance, u.active_plan_id,
              p.id AS plan_id, p.name AS plan_name, p.price_inr, p.tokens AS plan_tokens, p.price_per_token, p.popular
       FROM users u
       LEFT JOIN plans p ON p.id = u.active_plan_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const user = userRows[0];

    const { rows: subs } = await pool.query(
      `SELECT s.id, s.tokens_purchased, s.amount_paid_inr, s.status, s.created_at,
              p.name AS plan_name, p.price_inr, p.tokens AS plan_tokens
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    const { rows: txns } = await pool.query(
      'SELECT id, type, amount, description, created_at FROM token_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );

    res.json({
      balance: user?.tokens_balance ?? 0,
      active_plan: user?.plan_id
        ? {
            id: user.plan_id,
            name: user.plan_name,
            price_inr: user.price_inr,
            tokens: user.plan_tokens,
            price_per_token: user.price_per_token,
            popular: user.popular,
          }
        : null,
      subscriptions: subs,
      transactions: txns,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tokens/transactions
router.get('/transactions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, type, amount, description, created_at FROM token_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ transactions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tokens/purchase
router.post('/purchase', async (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ error: 'planId required' });
  try {
    const { rows: planRows } = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (!planRows.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRows[0];

    await pool.query(
      'UPDATE users SET tokens_balance = tokens_balance + $1, active_plan_id = $2 WHERE id = $3',
      [plan.tokens, plan.id, req.user.id]
    );
    await pool.query(
      'INSERT INTO subscriptions (user_id, plan_id, tokens_purchased, amount_paid_inr) VALUES ($1, $2, $3, $4)',
      [req.user.id, plan.id, plan.tokens, plan.price_inr]
    );
    await pool.query(
      'INSERT INTO token_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'purchase', plan.tokens, `Purchased ${plan.name} plan — ₹${plan.price_inr}`]
    );

    const { rows: balRows } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, balance: balRows[0].tokens_balance, tokens_added: plan.tokens, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
