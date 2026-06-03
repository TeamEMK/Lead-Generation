const express = require('express');
const router = express.Router();
const { searchPlaces } = require('../services/mapsService');
const { scrapeEmailsForLeads } = require('../services/emailScraperService');
const requireAuth = require('../middleware/auth');
const pool = require('../db');

const KEYWORD_DELAY_MS = 600;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

router.use(requireAuth);

// Helper: save a batch of leads to DB, returns { saved, skipped }
async function saveLeads(leads, userId, runId) {
  let saved = 0, skipped = 0;
  for (const lead of leads) {
    const placeId = lead.placeId || '';
    const leadRes = await pool.query(
      `INSERT INTO leads (place_id, business_name, phone, website, email, address)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING id`,
      [placeId, lead.businessName || '', lead.phone || '', lead.website || '', lead.email || '', lead.address || '']
    );
    let leadId = leadRes.rows[0]?.id;
    if (!leadId && placeId) {
      const ex = await pool.query('SELECT id FROM leads WHERE place_id = $1', [placeId]);
      leadId = ex.rows[0]?.id;
    }
    if (!leadId) { skipped++; continue; }
    const ul = await pool.query(
      `INSERT INTO user_leads (user_id, lead_id, run_id, keyword)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, lead_id) DO NOTHING RETURNING id`,
      [userId, leadId, runId, lead.keyword || '']
    );
    if (ul.rows.length > 0) saved++; else skipped++;
  }
  return { saved, skipped };
}

// POST /api/leads/generate — SSE streaming with per-keyword token check + pause/resume
router.post('/generate', async (req, res) => {
  const { keywords, scrapeEmails = false } = req.body;
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Keywords array is required' });
  }

  // Token gate — check before opening SSE stream
  const { rows: balRows } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
  let remainingTokens = balRows[0]?.tokens_balance ?? 0;
  if (remainingTokens <= 0) {
    return res.status(402).json({ error: 'Insufficient tokens. Please recharge your account to continue.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  function send(data) { res.write(`data: ${JSON.stringify(data)}\n\n`); }

  // Create run record for this session
  const runRes = await pool.query(
    'INSERT INTO generation_runs (user_id, keywords, total_found) VALUES ($1, $2, $3) RETURNING id',
    [req.user.id, keywords, 0]
  );
  const runId = runRes.rows[0].id;

  const allLeads = [];
  const kwDurations = [];
  let totalSaved = 0, totalSkipped = 0;

  for (let i = 0; i < keywords.length; i++) {
    // Re-fetch balance before each keyword for accuracy
    const { rows: b } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    remainingTokens = b[0]?.tokens_balance ?? 0;

    if (remainingTokens <= 0) {
      // Tokens exhausted — pause here and return remaining keywords
      const { rows: finalBal } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
      send({
        type: 'token_exhausted',
        remainingKeywords: keywords.slice(i),
        savedSoFar: totalSaved,
        tokenBalance: finalBal[0]?.tokens_balance ?? 0,
        leads: allLeads,
      });
      res.end();
      return;
    }

    const keyword = keywords[i];
    const kwStart = Date.now();
    send({ type: 'searching', keyword, index: i, total: keywords.length });

    let found = [];
    try {
      found = await searchPlaces(keyword, count => {
        send({ type: 'cell_progress', keyword, index: i, total: keywords.length, partialCount: count });
      });
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

    // Save this keyword's leads immediately (up to remaining tokens)
    const toSave = found.slice(0, remainingTokens);
    const { saved, skipped } = await saveLeads(toSave, req.user.id, runId);
    totalSaved += saved;
    totalSkipped += skipped; // only count actual per-user duplicates, not token-limited leads

    if (saved > 0) {
      await pool.query(
        'UPDATE users SET tokens_balance = tokens_balance - $1 WHERE id = $2',
        [saved, req.user.id]
      );
      await pool.query(
        'INSERT INTO token_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'usage', -saved, `Generated ${saved} lead${saved !== 1 ? 's' : ''} (${keyword})`]
      );
    }

    allLeads.push(...found);
    const elapsed = Date.now() - kwStart;
    kwDurations.push(elapsed);
    const avgMs = kwDurations.reduce((a, b) => a + b, 0) / kwDurations.length;
    const etaMs = Math.round((keywords.length - i - 1) * avgMs);

    // Check if we ran out of tokens after saving this keyword
    const { rows: postSave } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    const balanceAfter = postSave[0]?.tokens_balance ?? 0;

    send({ type: 'keyword_done', keyword, index: i, total: keywords.length, found: found.length, totalSoFar: allLeads.length, elapsedMs: elapsed, etaMs, tokenBalance: balanceAfter });

    if (balanceAfter <= 0 && i < keywords.length - 1) {
      // Ran out exactly at end of this keyword — remaining keywords can't be processed
      send({
        type: 'token_exhausted',
        remainingKeywords: keywords.slice(i + 1),
        savedSoFar: totalSaved,
        tokenBalance: balanceAfter,
        leads: allLeads,
      });
      await pool.query('UPDATE generation_runs SET total_found = $1 WHERE id = $2', [totalSaved, runId]);
      res.end();
      return;
    }

    if (i < keywords.length - 1) await sleep(KEYWORD_DELAY_MS);
  }

  await pool.query('UPDATE generation_runs SET total_found = $1 WHERE id = $2', [totalSaved, runId]);

  const { rows: finalBalRows } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
  const newBalance = finalBalRows[0]?.tokens_balance ?? 0;

  send({ type: 'done', saved: totalSaved, skipped: totalSkipped, tokenBalance: newBalance, leads: allLeads });
  res.end();
});

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ul.id, ul.keyword, ul.assigned_at AS timestamp,
              l.business_name, l.phone, l.website, l.email, l.address
       FROM user_leads ul
       JOIN leads l ON l.id = ul.lead_id
       WHERE ul.user_id = $1
       ORDER BY ul.assigned_at DESC`,
      [req.user.id]
    );
    const leads = rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      keyword: r.keyword,
      businessName: r.business_name,
      phone: r.phone,
      website: r.website,
      email: r.email,
      address: r.address,
    }));
    res.json({ leads, count: leads.length });
  } catch (err) {
    console.error('Fetch leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/history
router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, keywords, total_found, created_at FROM generation_runs WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ runs: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/history/:runId — leads for a specific run
router.get('/history/:runId', async (req, res) => {
  try {
    const runId = parseInt(req.params.runId, 10);
    // Verify ownership
    const { rows: run } = await pool.query(
      'SELECT id, keywords, total_found, created_at FROM generation_runs WHERE id = $1 AND user_id = $2',
      [runId, req.user.id]
    );
    if (!run.length) return res.status(404).json({ error: 'Run not found' });

    const { rows } = await pool.query(
      `SELECT ul.id, ul.keyword, ul.assigned_at AS timestamp,
              l.business_name, l.phone, l.website, l.email, l.address
       FROM user_leads ul
       JOIN leads l ON l.id = ul.lead_id
       WHERE ul.run_id = $1 AND ul.user_id = $2
       ORDER BY ul.assigned_at ASC`,
      [runId, req.user.id]
    );
    const leads = rows.map(r => ({
      id: r.id, timestamp: r.timestamp, keyword: r.keyword,
      businessName: r.business_name, phone: r.phone, website: r.website,
      email: r.email, address: r.address,
    }));
    res.json({ run: run[0], leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/export
router.get('/export', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ul.assigned_at AS timestamp, ul.keyword,
              l.business_name, l.phone, l.website, l.email, l.address
       FROM user_leads ul
       JOIN leads l ON l.id = ul.lead_id
       WHERE ul.user_id = $1
       ORDER BY ul.assigned_at DESC`,
      [req.user.id]
    );
    const esc = v => `"${String(v || '').replace(/"/g, '""')}"`;
    const headers = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address'];
    const csvRows = rows.map(r => [
      esc(r.timestamp), esc(r.keyword), esc(r.business_name),
      esc(r.phone), esc(r.website), esc(r.email), esc(r.address),
    ].join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send([headers.join(','), ...csvRows].join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads — ids are user_leads.id
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    await pool.query('DELETE FROM user_leads WHERE id = ANY($1) AND user_id = $2', [ids, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/all — wipe every lead for this user from the DB
router.delete('/all', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM user_leads WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, deleted: rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
