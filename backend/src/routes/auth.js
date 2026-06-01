const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { verifySheetAccess, ensureHeaders } = require('../services/sheetsService');

function getOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function extractSheetId(input) {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input.trim();
}

function getServiceAccountEmail() {
  try {
    const sa = JSON.parse(fs.readFileSync(path.resolve(process.env.SERVICE_ACCOUNT_PATH || './service-account.json'), 'utf8'));
    return sa.client_email;
  } catch { return null; }
}

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hash]
    );
    const id = result.rows[0].id;
    const token = jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name, email, spreadsheet_id: null } });
  } catch (err) {
    console.error('[auth/signup]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, spreadsheet_id: user.spreadsheet_id } });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, spreadsheet_id, (google_refresh_token IS NOT NULL) AS google_connected, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/service-account — returns the service account email for the UI
router.get('/service-account', (req, res) => {
  const email = getServiceAccountEmail();
  res.json({ email });
});

// GET /api/auth/google/url — generate Google OAuth consent URL
router.get('/google/url', requireAuth, (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ error: 'Google OAuth not configured on this server.' });
  }
  const state = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
    state,
  });
  res.json({ url });
});

// GET /api/auth/google/callback — exchange code for tokens
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    const { userId } = jwt.verify(state, process.env.JWT_SECRET);
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (tokens.refresh_token) {
      await pool.query('UPDATE users SET google_refresh_token = $1 WHERE id = $2', [tokens.refresh_token, userId]);
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/google/success`);
  } catch (err) {
    console.error('[google/callback]', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/google/error`);
  }
});

// PATCH /api/auth/sheet — save or update linked sheet
router.patch('/sheet', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Sheet URL required' });
  const spreadsheetId = extractSheetId(url);

  // Use the user's OAuth token if they've connected Google
  const { rows: userRows } = await pool.query('SELECT google_refresh_token FROM users WHERE id = $1', [req.user.id]);
  const refreshToken = userRows[0]?.google_refresh_token || null;

  try {
    await verifySheetAccess(spreadsheetId, refreshToken);
  } catch (err) {
    if (refreshToken) {
      return res.status(400).json({ error: 'Cannot access this sheet. Make sure the URL is correct and you own this sheet.' });
    }
    const saEmail = getServiceAccountEmail();
    return res.status(400).json({
      error: `Cannot access this sheet. Connect your Google account (recommended) or share the sheet with ${saEmail || 'the service account'} as Editor.`,
      serviceAccountEmail: saEmail,
      needsGoogleConnect: !refreshToken,
    });
  }

  try {
    await ensureHeaders(spreadsheetId, refreshToken);
  } catch (err) {
    return res.status(400).json({ error: `Sheet found but write access denied: ${err.message}` });
  }

  try {
    await pool.query('UPDATE users SET spreadsheet_id = $1 WHERE id = $2', [spreadsheetId, req.user.id]);
    res.json({ success: true, spreadsheet_id: spreadsheetId });
  } catch (err) {
    console.error('[auth/sheet]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
