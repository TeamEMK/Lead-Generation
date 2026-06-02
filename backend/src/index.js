require('dotenv').config();
const express = require('express');
const cors = require('cors');
const leadsRouter = require('./routes/leads');
const analyticsRouter = require('./routes/analytics');
const authRouter = require('./routes/auth');
const tokensRouter = require('./routes/tokens');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server
    if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true); // local dev
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return cb(null, true); // prod
    if (/\.vercel\.app$/.test(origin)) return cb(null, true); // Vercel preview deploys
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/tokens', tokensRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS generation_runs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      keywords TEXT[] NOT NULL DEFAULT '{}',
      total_found INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Global deduplicated lead data — shared across users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      place_id TEXT NOT NULL DEFAULT '',
      business_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Drop stale columns from old schema if they exist
  await pool.query(`ALTER TABLE leads DROP COLUMN IF EXISTS user_id`);
  await pool.query(`ALTER TABLE leads DROP COLUMN IF EXISTS run_id`);
  await pool.query(`ALTER TABLE leads DROP COLUMN IF EXISTS keyword`);
  await pool.query(`ALTER TABLE leads DROP COLUMN IF EXISTS status`);
  await pool.query(`ALTER TABLE leads DROP COLUMN IF EXISTS timestamp`);
  // Ensure new columns exist
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS place_id TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS business_name TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`);
  // Partial unique index: deduplicate by place_id only when it's non-empty
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS leads_place_id_unique ON leads(place_id) WHERE place_id != ''
  `);
  // Per-user lead assignments (keyword + status are user-specific)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_leads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      run_id INTEGER REFERENCES generation_runs(id) ON DELETE SET NULL,
      keyword TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, lead_id)
    )
  `);
  // Pricing plans — must exist before subscriptions and before the FK on users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      price_inr INTEGER NOT NULL,
      tokens INTEGER NOT NULL,
      price_per_token NUMERIC(6,2) NOT NULL,
      popular BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_balance INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_plan_id INTEGER REFERENCES plans(id)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      tokens_purchased INTEGER NOT NULL,
      amount_paid_inr INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      invoice_number TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS invoice_number TEXT`);
  // Token transaction log
  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    INSERT INTO plans (name, price_inr, tokens, price_per_token, popular) VALUES
      ('Starter', 3000, 2400, 1.25, false),
      ('Growth',  5000, 5000, 1.00, true),
      ('Scale',  10000, 13500, 0.75, false)
    ON CONFLICT (name) DO NOTHING
  `);
  console.log('DB ready');
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDb().catch(err => console.error('DB init failed (will retry on next request):', err.message));
});
