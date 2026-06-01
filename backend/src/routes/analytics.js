const express = require('express');
const router = express.Router();
const { getAllLeads } = require('../services/sheetsService');
const requireAuth = require('../middleware/auth');
const pool = require('../db');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT spreadsheet_id, google_refresh_token FROM users WHERE id = $1', [req.user.id]);
    const spreadsheetId = rows[0]?.spreadsheet_id;
    const refreshToken = rows[0]?.google_refresh_token || null;

    if (!spreadsheetId) {
      return res.json({ total: 0, today: 0, thisWeek: 0, thisMonth: 0, withPhone: 0, withWebsite: 0, chartData: [] });
    }

    const leads = await getAllLeads(spreadsheetId, refreshToken);
    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const leadsThisMonth = leads.filter(l => new Date(l.timestamp) >= monthAgo);

    const byDate = {};
    leadsThisMonth.forEach(lead => {
      const label = new Date(lead.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      byDate[label] = (byDate[label] || 0) + 1;
    });
    const chartData = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      total: leads.length,
      today: leads.filter(l => new Date(l.timestamp).toDateString() === todayStr).length,
      thisWeek: leads.filter(l => new Date(l.timestamp) >= weekAgo).length,
      thisMonth: leadsThisMonth.length,
      withPhone: leads.filter(l => l.phone).length,
      withWebsite: leads.filter(l => l.website).length,
      chartData,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
