const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const requireAuth = require('../middleware/auth');
const pool = require('../db');

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

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

// POST /api/tokens/create-order — create Razorpay order before checkout
router.post('/create-order', async (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ error: 'planId required' });
  try {
    const { rows: planRows } = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (!planRows.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRows[0];
    const amountWithGst = Math.round(plan.price_inr * 1.18);
    const gatewayFee = Math.round(amountWithGst * 0.02);
    const totalAmount = amountWithGst + gatewayFee;

    const order = await getRazorpay().orders.create({
      amount: totalAmount * 100,
      currency: 'INR',
      receipt: `u${req.user.id}_p${planId}_${Date.now()}`,
      notes: { planId: String(planId), userId: String(req.user.id) },
    });

    res.json({ orderId: order.id, amount: totalAmount, amountWithGst, gatewayFee, currency: 'INR' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      `SELECT s.id, s.tokens_purchased, s.amount_paid_inr, s.status, s.created_at, s.invoice_number, s.expires_at,
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

// GET /api/tokens/status — lightweight: balance + active plan expiry
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.tokens_balance, s.expires_at, p.name AS plan_name
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE u.id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    const row = rows[0];
    const expiresAt = row?.expires_at ?? null;
    const msLeft = expiresAt ? new Date(expiresAt) - new Date() : null;
    const daysRemaining = msLeft !== null ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : null;
    res.json({
      balance: row?.tokens_balance ?? 0,
      plan_name: row?.plan_name ?? null,
      expires_at: expiresAt,
      days_remaining: daysRemaining,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tokens/purchase — verify Razorpay payment then activate subscription
router.post('/purchase', async (req, res) => {
  const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!planId) return res.status(400).json({ error: 'planId required' });
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification data missing' });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: planRows } = await client.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (!planRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planRows[0];

    // Generate invoice number inside transaction with lock to prevent duplicates
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const { rows: cntRows } = await client.query(
      `SELECT COUNT(*) AS cnt FROM subscriptions
       WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2`,
      [yyyy, parseInt(mm)]
    );
    const counter = String(parseInt(cntRows[0].cnt) + 1).padStart(3, '0');
    const invoiceNumber = `JM/${yyyy}${mm}${dd}${counter}`;

    await client.query(
      `UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    await client.query(
      'UPDATE users SET tokens_balance = tokens_balance + $1, active_plan_id = $2 WHERE id = $3',
      [plan.tokens, plan.id, req.user.id]
    );

    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const amountWithGst = Math.round(plan.price_inr * 1.18);
    const gatewayFee = Math.round(amountWithGst * 0.02);
    const totalAmountPaid = amountWithGst + gatewayFee;

    await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, tokens_purchased, amount_paid_inr, invoice_number, expires_at, razorpay_payment_id, razorpay_order_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.id, plan.id, plan.tokens, totalAmountPaid, invoiceNumber, expiresAt, razorpay_payment_id, razorpay_order_id]
    );
    await client.query(
      'INSERT INTO token_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'purchase', plan.tokens, `${plan.name} plan activated — ₹${totalAmountPaid} (incl. GST + gateway fee) · expires ${expiresAt.toLocaleDateString('en-IN')}`]
    );

    await client.query('COMMIT');

    const { rows: balRows } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, balance: balRows[0].tokens_balance, tokens_added: plan.tokens, plan, invoiceNumber });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
