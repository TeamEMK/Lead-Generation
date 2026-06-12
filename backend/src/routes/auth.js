const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

router.post('/signup', async (req, res) => {
  const { name, email, password, phone, city, businessName, gst } = req.body;
  if (!name || !email || !password || !phone || !city || !businessName)
    return res.status(400).json({ error: 'Name, email, password, mobile, city and business name are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone, city, business_name, gst, tokens_balance) VALUES ($1, $2, $3, $4, $5, $6, $7, 30) RETURNING id',
      [name, email, hash, phone, city, businessName, gst || null]
    );
    const id = result.rows[0].id;
    await pool.query(
      'INSERT INTO token_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [id, 'bonus', 30, 'Welcome bonus — 30 free tokens']
    );
    const token = jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name, email } });
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
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, city, business_name, gst, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile — update profile fields
router.put('/profile', requireAuth, async (req, res) => {
  const { name, phone, city, businessName, gst } = req.body;
  if (!name || !phone || !city || !businessName)
    return res.status(400).json({ error: 'Name, phone, city and business name are required' });
  if (!/^\d{10}$/.test(phone))
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET name=$1, phone=$2, city=$3, business_name=$4, gst=$5 WHERE id=$6
       RETURNING id, name, email, phone, city, business_name, gst, created_at`,
      [name, phone, city, businessName, gst || null, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('[auth/profile]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/auth/account — permanently delete account and all data
router.delete('/account', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required to confirm deletion' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    // Snapshot the owner onto their leads so they stay visible in admin after
    // the account is gone (the FK then SET NULLs user_id on delete).
    await pool.query(
      `UPDATE user_leads SET owner_email = u.email, owner_name = u.name
       FROM users u WHERE user_leads.user_id = $1 AND u.id = $1`,
      [req.user.id]
    );
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/account delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
