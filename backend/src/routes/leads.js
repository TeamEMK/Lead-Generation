const express = require('express');
const router = express.Router();
const { searchPlaces } = require('../services/mapsService');
const { appendLeads, getAllLeads, updateLeadStatuses, deleteLeads } = require('../services/sheetsService');
const { scrapeEmailsForLeads } = require('../services/emailScraperService');
const requireAuth = require('../middleware/auth');
const pool = require('../db');

const KEYWORD_DELAY_MS = 600;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getUserSheetInfo(userId) {
  const { rows } = await pool.query('SELECT spreadsheet_id, google_refresh_token FROM users WHERE id = $1', [userId]);
  return {
    spreadsheetId: rows[0]?.spreadsheet_id || null,
    refreshToken: rows[0]?.google_refresh_token || null,
  };
}

router.use(requireAuth);

// POST /api/leads/generate — SSE streaming
router.post('/generate', async (req, res) => {
  const { spreadsheetId, refreshToken } = await getUserSheetInfo(req.user.id);
  if (!spreadsheetId) return res.status(400).json({ error: 'No Google Sheet linked to your account' });

  const { keywords, scrapeEmails = false } = req.body;
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Keywords array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  function send(data) { res.write(`data: ${JSON.stringify(data)}\n\n`); }

  const allLeads = [];
  const kwDurations = [];

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    const kwStart = Date.now();
    send({ type: 'searching', keyword, index: i, total: keywords.length });

    let found = [];
    try {
      found = await searchPlaces(keyword);
    } catch (err) {
      console.error(`searchPlaces error for "${keyword}":`, err.message);
      send({ type: 'keyword_error', keyword, index: i, total: keywords.length, message: err.message });
      kwDurations.push(Date.now() - kwStart);
      if (i < keywords.length - 1) await sleep(KEYWORD_DELAY_MS);
      continue;
    }

    if (scrapeEmails && found.length > 0) {
      send({ type: 'scraping', keyword, index: i, total: keywords.length, count: found.length });
      try { found = await scrapeEmailsForLeads(found); }
      catch (err) { console.error(`email scrape error for "${keyword}":`, err.message); }
    }

    allLeads.push(...found);
    const elapsed = Date.now() - kwStart;
    kwDurations.push(elapsed);
    const avgMs = kwDurations.reduce((a, b) => a + b, 0) / kwDurations.length;
    const etaMs = Math.round((keywords.length - i - 1) * avgMs);
    send({ type: 'keyword_done', keyword, index: i, total: keywords.length, found: found.length, totalSoFar: allLeads.length, elapsedMs: elapsed, etaMs });
    if (i < keywords.length - 1) await sleep(KEYWORD_DELAY_MS);
  }

  send({ type: 'saving' });
  let saved = 0, skipped = 0;
  try {
    if (allLeads.length > 0) {
      const result = await appendLeads(allLeads, spreadsheetId, refreshToken);
      saved = result.saved;
      skipped = result.skipped;
    }
  } catch (err) {
    console.error('appendLeads error:', err.message);
    send({ type: 'error', message: `Failed to save leads: ${err.message}` });
  }

  send({ type: 'done', saved, skipped, leads: allLeads });
  res.end();
});

// GET /api/leads
router.get('/', async (req, res) => {
  const { spreadsheetId, refreshToken } = await getUserSheetInfo(req.user.id);
  if (!spreadsheetId) return res.json({ leads: [], count: 0 });
  try {
    const leads = await getAllLeads(spreadsheetId, refreshToken);
    res.json({ leads, count: leads.length });
  } catch (err) {
    console.error('Fetch leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/export
router.get('/export', async (req, res) => {
  const { spreadsheetId, refreshToken } = await getUserSheetInfo(req.user.id);
  if (!spreadsheetId) return res.status(400).json({ error: 'No Google Sheet linked' });
  try {
    const leads = await getAllLeads(spreadsheetId, refreshToken);
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address', 'Status'];
    const rows = leads.map(l => [esc(l.timestamp), esc(l.keyword), esc(l.businessName), esc(l.phone), esc(l.website), esc(l.email), esc(l.address), esc(l.status)].join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send([headers.join(','), ...rows].join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/status
router.patch('/status', async (req, res) => {
  const { spreadsheetId, refreshToken } = await getUserSheetInfo(req.user.id);
  if (!spreadsheetId) return res.status(400).json({ error: 'No Google Sheet linked' });
  try {
    const { rowIndices, status } = req.body;
    if (!Array.isArray(rowIndices) || rowIndices.length === 0) return res.status(400).json({ error: 'rowIndices array required' });
    if (!['real', 'fake', ''].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await updateLeadStatuses(rowIndices, status, spreadsheetId, refreshToken);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads
router.delete('/', async (req, res) => {
  const { spreadsheetId, refreshToken } = await getUserSheetInfo(req.user.id);
  if (!spreadsheetId) return res.status(400).json({ error: 'No Google Sheet linked' });
  try {
    const { rowIndices } = req.body;
    if (!Array.isArray(rowIndices) || rowIndices.length === 0) return res.status(400).json({ error: 'rowIndices array required' });
    await deleteLeads(rowIndices, spreadsheetId, refreshToken);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
