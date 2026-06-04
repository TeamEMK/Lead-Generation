const express = require('express');
const router = express.Router();
const pool = require('../db');

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  const secret = process.env.ADMIN_TOKEN;
  if (!secret || !auth || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

// Stats overview
router.get('/stats', async (req, res) => {
  try {
    const [users, activeSubs, totalRev, monthRev, totalLeads] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'"),
      pool.query('SELECT COALESCE(SUM(amount_paid_inr), 0) AS total FROM subscriptions'),
      pool.query(`SELECT COALESCE(SUM(amount_paid_inr), 0) AS total FROM subscriptions
                  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
                  AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())`),
      pool.query('SELECT COUNT(*) FROM user_leads'),
    ]);
    res.json({
      total_users: parseInt(users.rows[0].count),
      active_subscriptions: parseInt(activeSubs.rows[0].count),
      total_revenue: parseFloat(totalRev.rows[0].total),
      month_revenue: parseFloat(monthRev.rows[0].total),
      total_leads: parseInt(totalLeads.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All users
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.city, u.business_name, u.gst,
             u.tokens_balance, u.created_at,
             p.name AS active_plan,
             (SELECT COUNT(*) FROM subscriptions s WHERE s.user_id = u.id) AS sub_count
      FROM users u
      LEFT JOIN plans p ON p.id = u.active_plan_id
      ORDER BY u.created_at DESC
    `);
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.invoice_number, s.tokens_purchased, s.amount_paid_inr,
             s.status, s.created_at, s.expires_at,
             p.name AS plan_name, p.price_inr,
             u.name AS user_name, u.email AS user_email
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `);
    res.json({ subscriptions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All token transactions
router.get('/transactions', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.type, t.amount, t.description, t.created_at,
             u.name AS user_name, u.email AS user_email
      FROM token_transactions t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC
      LIMIT 1000
    `);
    res.json({ transactions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invoices (subscriptions with invoice number)
router.get('/invoices', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.invoice_number, s.amount_paid_inr, s.created_at, s.status,
             p.name AS plan_name, p.price_inr, p.tokens AS plan_tokens,
             u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
             u.city AS user_city, u.business_name, u.gst AS user_gst
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      JOIN users u ON u.id = s.user_id
      WHERE s.invoice_number IS NOT NULL
      ORDER BY s.created_at DESC
    `);
    res.json({ invoices: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
