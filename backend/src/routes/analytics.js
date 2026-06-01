const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const pool = require('../db');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ul.assigned_at AS timestamp, l.phone, l.website, ul.status
       FROM user_leads ul
       JOIN leads l ON l.id = ul.lead_id
       WHERE ul.user_id = $1`,
      [req.user.id]
    );

    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const leadsThisMonth = rows.filter(l => new Date(l.timestamp) >= monthAgo);

    const byDate = {};
    leadsThisMonth.forEach(lead => {
      const label = new Date(lead.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      byDate[label] = (byDate[label] || 0) + 1;
    });
    const chartData = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      total: rows.length,
      today: rows.filter(l => new Date(l.timestamp).toDateString() === todayStr).length,
      thisWeek: rows.filter(l => new Date(l.timestamp) >= weekAgo).length,
      thisMonth: leadsThisMonth.length,
      withPhone: rows.filter(l => l.phone).length,
      withWebsite: rows.filter(l => l.website).length,
      chartData,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
