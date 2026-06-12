require('dotenv').config();
const express = require('express');
const cors = require('cors');
const leadsRouter = require('./routes/leads');
const analyticsRouter = require('./routes/analytics');
const authRouter = require('./routes/auth');
const tokensRouter = require('./routes/tokens');
const adminRouter = require('./routes/admin');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return cb(null, true);
    if (process.env.ADMIN_URL && origin === process.env.ADMIN_URL) return cb(null, true);
    if (/\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/tokens', tokensRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      city VARCHAR(100),
      business_name VARCHAR(255),
      gst VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gst VARCHAR(20)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS generation_runs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      keywords TEXT[] NOT NULL DEFAULT '{}',
      total_found INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'done',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE generation_runs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done'`);
  await pool.query(`ALTER TABLE generation_runs ADD COLUMN IF NOT EXISTS tokens_charged INTEGER NOT NULL DEFAULT 0`);
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
  // Keep a user's leads after they delete their account: snapshot the owner and
  // null-out the FK (ON DELETE SET NULL) instead of cascade-deleting the rows.
  await pool.query(`ALTER TABLE user_leads ADD COLUMN IF NOT EXISTS owner_email TEXT`);
  await pool.query(`ALTER TABLE user_leads ADD COLUMN IF NOT EXISTS owner_name TEXT`);
  await pool.query(`ALTER TABLE user_leads ALTER COLUMN user_id DROP NOT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE user_leads DROP CONSTRAINT IF EXISTS user_leads_user_id_fkey`).catch(() => {});
  await pool.query(`ALTER TABLE user_leads ADD CONSTRAINT user_leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`).catch(() => {});
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
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS invoice_number TEXT`);
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`);
  // Razorpay reconciliation — store the real payment/order ids per purchase
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT`);
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`);
  // Safety constraints
  await pool.query(`ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS tokens_balance_non_negative CHECK (tokens_balance >= 0)`).catch(() => {});
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_invoice_number_unique ON subscriptions (invoice_number) WHERE invoice_number IS NOT NULL`);
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
  // Outscraper usage tracking — one row per generation run, used to estimate
  // vendor cost on the admin dashboard. enterprise_calls = records returned
  // (cost driver, ~$3/1000); pro_calls is unused (kept for compatibility).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      run_id INTEGER,
      pro_calls INTEGER NOT NULL DEFAULT 0,
      enterprise_calls INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS api_usage_created_at_idx ON api_usage (created_at)`);
  // Outscraper account recharges — manually logged top-ups, to track credit balance
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outscraper_recharges (
      id SERIAL PRIMARY KEY,
      amount_usd NUMERIC(10,2) NOT NULL,
      note TEXT DEFAULT '',
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
