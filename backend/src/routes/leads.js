const express = require('express');
const router = express.Router();
const { searchPlaces } = require('../services/mapsService');
const { scrapeEmailsForLeads } = require('../services/emailScraperService');
const requireAuth = require('../middleware/auth');
const pool = require('../db');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// In-memory set of cancelled runIds — workers check this to stop early
const cancelledRuns = new Set();

router.use(requireAuth);

// POST /api/leads/cancel — stop a running generation
router.post('/cancel', async (req, res) => {
  const { runId } = req.body;
  if (!runId) return res.status(400).json({ error: 'runId required' });
  const { rows } = await pool.query(
    `SELECT id FROM generation_runs WHERE id = $1 AND user_id = $2`,
    [runId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Run not found' });
  cancelledRuns.add(Number(runId));
  await pool.query(`UPDATE generation_runs SET status = 'cancelled' WHERE id = $1`, [runId]);
  res.json({ ok: true });
});

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
  const { keywords, scrapeEmails = false, runId: existingRunId } = req.body;
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Keywords array is required' });
  }
  // Single keyword only — use the first non-empty entry, ignore the rest
  const singleKeyword = String(keywords[0] ?? '').trim();
  if (!singleKeyword) {
    return res.status(400).json({ error: 'A keyword is required' });
  }
  const keywordsToProcess = [singleKeyword];

  // Token gate — check before opening SSE stream
  const { rows: balRows } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
  let remainingTokens = balRows[0]?.tokens_balance ?? 0;
  if (remainingTokens <= 0) {
    return res.status(402).json({ error: 'No tokens remaining. Please renew your plan to continue.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Heartbeat every 30s; track disconnect so send() never throws and loop keeps running
  let clientConnected = true;
  const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 30000);
  res.on('close', () => { clientConnected = false; clearInterval(heartbeat); });

  function send(data) {
    if (!clientConnected) return;
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { clientConnected = false; }
  }

  // Reuse existing run on retry/resume — also resets error→running so no new history entry is created
  let runId = null;
  if (existingRunId) {
    const { rows } = await pool.query(
      `UPDATE generation_runs SET status = 'running' WHERE id = $1 AND user_id = $2 AND status IN ('running', 'error') RETURNING id`,
      [existingRunId, req.user.id]
    );
    runId = rows[0]?.id ?? null;
  }
  if (!runId) {
    const runRes = await pool.query(
      `INSERT INTO generation_runs (user_id, keywords, total_found, status) VALUES ($1, $2, $3, 'running') RETURNING id`,
      [req.user.id, keywordsToProcess, 0]
    );
    runId = runRes.rows[0].id;
  }
  send({ type: 'started', runId });

  // Single keyword per run — concurrency kept for the queue helper, effectively 1
  const CONCURRENCY = 1;
  let totalSaved = 0, totalSkipped = 0, totalCharged = 0;
  const apiCalls = { pro: 0, enterprise: 0 };  // Google Places API calls, for GCP cost estimate
  let globalTokenExhausted = false;
  let completedCount = 0;
  const completedIndices = new Set();
  const kwDurations = [];
  let lastKnownBalance = remainingTokens;

  async function processKeyword(keyword, i) {
    if (globalTokenExhausted || cancelledRuns.has(runId)) return;

    // Check balance before starting this keyword
    const { rows: b } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    lastKnownBalance = b[0]?.tokens_balance ?? 0;
    if (lastKnownBalance <= 0) { globalTokenExhausted = true; return; }

    const kwStart = Date.now();
    send({ type: 'searching', keyword, index: i, total: keywordsToProcess.length });

    let tokenExhaustedMidSearch = false;
    const seenPlaceIds = new Set();
    let kwSaved = 0;
    let kwCharged = 0;

    try {
      await searchPlaces(
        keyword,
        count => {
          if (!globalTokenExhausted && !cancelledRuns.has(runId))
            send({ type: 'cell_progress', keyword, index: i, total: keywordsToProcess.length, partialCount: count });
        },
        async (batchLeads) => {
          if (globalTokenExhausted || cancelledRuns.has(runId)) return false;

          const fresh = batchLeads.filter(l => {
            if (!l.placeId || seenPlaceIds.has(l.placeId)) return false;
            seenPlaceIds.add(l.placeId);
            return true;
          });

          if (fresh.length === 0) return true;

          // Atomic token deduction — safe across parallel workers
          const { rows: atomicRows } = await pool.query(`
            WITH locked AS (SELECT tokens_balance FROM users WHERE id = $1 FOR UPDATE),
            updated AS (
              UPDATE users SET tokens_balance = GREATEST((SELECT tokens_balance FROM locked) - $2, 0)
              WHERE id = $1 RETURNING tokens_balance
            )
            SELECT (SELECT tokens_balance FROM locked) AS old_bal, tokens_balance AS new_bal FROM updated
          `, [req.user.id, fresh.length]);

          if (!atomicRows.length || atomicRows[0].old_bal <= 0) {
            tokenExhaustedMidSearch = true;
            globalTokenExhausted = true;
            return false;
          }

          const actuallyDeducted = atomicRows[0].old_bal - atomicRows[0].new_bal;
          lastKnownBalance = atomicRows[0].new_bal;

          // Tokens stay deducted even for cross-run duplicates — they are charged but
          // NOT stored (saveLeads silently drops rows that already exist in user_leads).
          kwCharged += actuallyDeducted;
          totalCharged += actuallyDeducted;

          const toSave = fresh.slice(0, actuallyDeducted);
          const { saved, skipped } = await saveLeads(toSave, req.user.id, runId);
          totalSaved += saved;
          totalSkipped += skipped;
          kwSaved += saved;

          send({ type: 'token_update', tokenBalance: lastKnownBalance, totalSaved });

          if (lastKnownBalance <= 0) {
            tokenExhaustedMidSearch = true;
            globalTokenExhausted = true;
            return false;
          }
          return true;
        },
        (tier) => { if (tier === 'pro' || tier === 'enterprise') apiCalls[tier]++; }
      );
    } catch (err) {
      console.error(`searchPlaces error for "${keyword}":`, err.message);
      send({ type: 'keyword_error', keyword, index: i, total: keywordsToProcess.length, message: err.message });
    }

    if (kwSaved > 0 || kwCharged > 0) {
      await pool.query(
        'UPDATE generation_runs SET total_found = total_found + $1, tokens_charged = tokens_charged + $2 WHERE id = $3',
        [kwSaved, kwCharged, runId]
      );
    }

    if (!tokenExhaustedMidSearch) {
      completedCount++;
      completedIndices.add(i);
      const elapsed = Date.now() - kwStart;
      kwDurations.push(elapsed);
      const avgMs = kwDurations.reduce((a, b) => a + b, 0) / kwDurations.length;
      const remaining = keywordsToProcess.length - completedCount;
      // ETA accounts for parallelism: remaining / workers × avg time per keyword
      const etaMs = Math.round((remaining / Math.min(CONCURRENCY, remaining + 1)) * avgMs);
      send({ type: 'keyword_done', keyword, index: i, total: keywordsToProcess.length, found: kwSaved, totalSoFar: totalSaved, elapsedMs: elapsed, etaMs, tokenBalance: lastKnownBalance });
    }
  }

  // Queue-based parallel workers — each worker picks keywords until queue is empty
  const queue = keywordsToProcess.map((kw, i) => ({ kw, i }));
  async function worker() {
    while (queue.length > 0 && !globalTokenExhausted && !cancelledRuns.has(runId)) {
      const item = queue.shift();
      if (!item) break;
      await processKeyword(item.kw, item.i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, keywordsToProcess.length) }, () => worker()));

  // Record Google Places API usage for this run (admin GCP cost estimate)
  if (apiCalls.pro > 0 || apiCalls.enterprise > 0) {
    await pool.query(
      'INSERT INTO api_usage (user_id, run_id, pro_calls, enterprise_calls) VALUES ($1, $2, $3, $4)',
      [req.user.id, runId, apiCalls.pro, apiCalls.enterprise]
    ).catch(err => console.error('api_usage insert failed:', err.message));
  }

  // Final state
  const wasCancelled = cancelledRuns.has(runId);
  if (wasCancelled) cancelledRuns.delete(runId);

  if (wasCancelled) {
    // Already marked 'cancelled' by the cancel endpoint; just notify client
    if (totalCharged > 0) {
      await pool.query(
        'INSERT INTO token_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'usage', -totalCharged, `Generated ${totalSaved} lead${totalSaved !== 1 ? 's' : ''}, ${totalCharged} token${totalCharged !== 1 ? 's' : ''} used (stopped)`]
      );
    }
    const { rows: finalBal } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    send({ type: 'cancelled', savedSoFar: totalSaved, tokenBalance: finalBal[0]?.tokens_balance ?? 0 });
  } else if (globalTokenExhausted) {
    const remainingKeywords = keywordsToProcess.filter((_, i) => !completedIndices.has(i));
    if (totalCharged > 0) {
      await pool.query(
        'INSERT INTO token_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'usage', -totalCharged, `Generated ${totalSaved} lead${totalSaved !== 1 ? 's' : ''}, ${totalCharged} token${totalCharged !== 1 ? 's' : ''} used (paused)`]
      );
    }
    const { rows: finalBal } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    await pool.query(`UPDATE generation_runs SET status = 'paused' WHERE id = $1`, [runId]);
    send({ type: 'token_exhausted', remainingKeywords, savedSoFar: totalSaved, tokenBalance: finalBal[0]?.tokens_balance ?? 0 });
  } else {
    await pool.query(`UPDATE generation_runs SET status = 'done' WHERE id = $1`, [runId]);
    if (totalCharged > 0) {
      await pool.query(
        'INSERT INTO token_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'usage', -totalCharged, `Generated ${totalSaved} lead${totalSaved !== 1 ? 's' : ''}, ${totalCharged} token${totalCharged !== 1 ? 's' : ''} used`]
      );
    }
    const { rows: finalBalRows } = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]);
    send({ type: 'done', saved: totalSaved, skipped: totalSkipped, tokenBalance: finalBalRows[0]?.tokens_balance ?? 0 });
  }
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

// GET /api/leads/active — returns current running run if any (for reconnect after refresh)
router.get('/active', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT gr.id, gr.keywords, gr.total_found, gr.created_at, u.tokens_balance
       FROM generation_runs gr
       JOIN users u ON u.id = gr.user_id
       WHERE gr.user_id = $1 AND gr.status = 'running'
       ORDER BY gr.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.json({ active: false });
    const run = rows[0];
    res.json({
      active: true,
      runId: run.id,
      keywords: run.keywords,
      totalFound: run.total_found,
      tokenBalance: run.tokens_balance,
      startedAt: run.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/history
router.get('/history', async (req, res) => {
  try {
    // Auto-cleanup runs stuck as 'running' for >30 minutes (browser was closed mid-run)
    await pool.query(
      `UPDATE generation_runs SET status = 'error' WHERE user_id = $1 AND status = 'running' AND created_at < NOW() - INTERVAL '30 minutes'`,
      [req.user.id]
    );
    const { rows } = await pool.query(
      'SELECT id, keywords, total_found, tokens_charged, status, created_at FROM generation_runs WHERE user_id = $1 ORDER BY created_at DESC',
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
      'SELECT id, keywords, total_found, tokens_charged, status, created_at FROM generation_runs WHERE id = $1 AND user_id = $2',
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
