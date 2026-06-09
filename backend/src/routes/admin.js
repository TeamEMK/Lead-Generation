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

// ── Google Places API (New) pricing — used to estimate GCP cost from call counts
const PRICE_PRO_USD = 0.032;   // Text Search Pro (viewport lookup) per call
const PRICE_ENT_USD = 0.035;   // Text Search Enterprise (lead search) per call
const FREE_PRO = 5000;         // free Pro calls per month
const FREE_ENT = 1000;         // free Enterprise calls per month
const USD_INR = parseFloat(process.env.USD_INR_RATE) || 88;

// Full owner overview — money, tokens, users, GCP cost estimate, 30-day trend, top users
router.get('/overview', async (req, res) => {
  try {
    const [users, subs, tokensUsed, tokensRemaining, leads, api,
           revByDay, leadsByDay, apiByDay, topUsers] = await Promise.all([
      pool.query(`SELECT COUNT(*) total,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') new_30d,
                    COUNT(*) FILTER (WHERE active_plan_id IS NOT NULL) with_plan
                  FROM users`),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE status = 'active') active,
                    COALESCE(SUM(amount_paid_inr), 0) revenue_total,
                    COALESCE(SUM(amount_paid_inr) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', NOW())), 0) revenue_month,
                    COALESCE(SUM(tokens_purchased), 0) tokens_sold
                  FROM subscriptions`),
      pool.query(`SELECT COALESCE(-SUM(amount), 0) used FROM token_transactions WHERE type = 'usage'`),
      pool.query(`SELECT COALESCE(SUM(tokens_balance), 0) remaining FROM users`),
      pool.query(`SELECT COUNT(*) total,
                    COUNT(*) FILTER (WHERE assigned_at >= date_trunc('month', NOW())) this_month
                  FROM user_leads`),
      pool.query(`SELECT
                    COALESCE(SUM(pro_calls), 0) pro_total,
                    COALESCE(SUM(enterprise_calls), 0) ent_total,
                    COALESCE(SUM(pro_calls) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', NOW())), 0) pro_month,
                    COALESCE(SUM(enterprise_calls) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', NOW())), 0) ent_month
                  FROM api_usage`),
      pool.query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') d, SUM(amount_paid_inr) v
                  FROM subscriptions WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY 1`),
      pool.query(`SELECT to_char(date_trunc('day', assigned_at), 'YYYY-MM-DD') d, COUNT(*) v
                  FROM user_leads WHERE assigned_at > NOW() - INTERVAL '30 days' GROUP BY 1`),
      pool.query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') d,
                    SUM(pro_calls) p, SUM(enterprise_calls) e
                  FROM api_usage WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY 1`),
      pool.query(`SELECT u.id, u.name, u.email,
                    COALESCE((SELECT -SUM(amount) FROM token_transactions t WHERE t.user_id = u.id AND t.type = 'usage'), 0) tokens_used,
                    COALESCE((SELECT COUNT(*) FROM user_leads ul WHERE ul.user_id = u.id), 0) leads,
                    COALESCE((SELECT SUM(pro_calls) FROM api_usage a WHERE a.user_id = u.id), 0) pro_calls,
                    COALESCE((SELECT SUM(enterprise_calls) FROM api_usage a WHERE a.user_id = u.id), 0) ent_calls
                  FROM users u ORDER BY tokens_used DESC LIMIT 8`),
    ]);

    const u = users.rows[0], s = subs.rows[0], a = api.rows[0], l = leads.rows[0];
    const N = v => parseInt(v, 10) || 0;
    const costInr = (pro, ent) => (pro * PRICE_PRO_USD + ent * PRICE_ENT_USD) * USD_INR;

    const proTotal = N(a.pro_total), entTotal = N(a.ent_total);
    const proMonth = N(a.pro_month), entMonth = N(a.ent_month);
    const costTotal = costInr(proTotal, entTotal);                                  // gross list price
    const billProMonth = Math.max(0, proMonth - FREE_PRO);
    const billEntMonth = Math.max(0, entMonth - FREE_ENT);
    const costMonth = costInr(billProMonth, billEntMonth);                          // after free tier
    const revenueMonth = parseFloat(s.revenue_month) || 0;

    // 30-day trend, oldest → newest
    const revMap = Object.fromEntries(revByDay.rows.map(r => [r.d, parseFloat(r.v) || 0]));
    const leadMap = Object.fromEntries(leadsByDay.rows.map(r => [r.d, N(r.v)]));
    const apiMap = Object.fromEntries(apiByDay.rows.map(r => [r.d, { p: N(r.p), e: N(r.e) }]));
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 86400000);
      const key = dt.toISOString().slice(0, 10);
      const ap = apiMap[key] || { p: 0, e: 0 };
      trend.push({
        date: key,
        revenue: revMap[key] || 0,
        leads: leadMap[key] || 0,
        calls: ap.p + ap.e,
        cost_inr: Math.round(costInr(ap.p, ap.e) * 100) / 100,
      });
    }

    const top_users = topUsers.rows.map(r => ({
      name: r.name, email: r.email,
      tokens_used: N(r.tokens_used),
      leads: N(r.leads),
      calls: N(r.pro_calls) + N(r.ent_calls),
      cost_inr: Math.round(costInr(N(r.pro_calls), N(r.ent_calls)) * 100) / 100,
    }));

    res.json({
      users: { total: N(u.total), new_30d: N(u.new_30d), with_plan: N(u.with_plan) },
      subscriptions: { active: N(s.active) },
      revenue: { total: parseFloat(s.revenue_total) || 0, this_month: revenueMonth },
      tokens: {
        sold: N(s.tokens_sold),
        used: N(tokensUsed.rows[0].used),
        remaining: N(tokensRemaining.rows[0].remaining),
      },
      leads: { total: N(l.total), this_month: N(l.this_month) },
      api: {
        pro_total: proTotal, ent_total: entTotal, calls_total: proTotal + entTotal,
        pro_month: proMonth, ent_month: entMonth, calls_month: proMonth + entMonth,
        cost_total_inr: Math.round(costTotal * 100) / 100,
        cost_month_inr: Math.round(costMonth * 100) / 100,
      },
      profit: { this_month: Math.round((revenueMonth - costMonth) * 100) / 100 },
      pricing: {
        usd_inr: USD_INR, price_pro_usd: PRICE_PRO_USD, price_ent_usd: PRICE_ENT_USD,
        free_pro: FREE_PRO, free_ent: FREE_ENT,
      },
      trend,
      top_users,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
