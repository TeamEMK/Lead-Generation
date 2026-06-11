const axios = require('axios');

// Outscraper Google Maps API — sole lead source. One async job per keyword
// returns up to HARD_CAP businesses; no grid, no viewport, no region tiers —
// just the raw keyword. We bill the user per delivered lead (tokens), and
// Outscraper bills us per returned record (~$3 / 1000), so we never over-fetch:
// the job is capped at the caller's token budget and the lead count scales with it.
//
// Docs / official client: https://api.app.outscraper.com  (X-API-KEY header)

const BASE = 'https://api.app.outscraper.com';
const HARD_CAP = 500;          // max leads pulled per keyword (Google Maps per-query ceiling)
const POLL_INTERVAL_MS = 4000; // between status polls
const MAX_POLLS = 75;          // ~5 min ceiling for a job to finish
const STREAM_CHUNK = 25;       // leads per onBatch chunk (drives live token updates)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function apiKey() {
  const key = process.env.OUTSCRAPER_API_KEY;
  if (!key) throw new Error('OUTSCRAPER_API_KEY is not set');
  return key;
}

// Normalise one Outscraper place into our lead shape.
function mapPlace(p) {
  return {
    timestamp:    new Date().toISOString(),
    businessName: p.name || '',
    phone:        p.phone || p.phone_number || '',
    website:      p.site || p.website || '',
    email:        p.email_1 || '',                       // only present with enrichment
    address:      p.full_address || p.address || '',
    placeId:      p.place_id || p.google_id || '',
    keyword:      '',                                     // set by caller
  };
}

// Submit the async job and return its request id.
async function submitJob(query, limit) {
  const res = await axios.get(`${BASE}/maps/search-v3`, {
    headers: { 'X-API-KEY': apiKey() },
    params: {
      query,
      organizationsPerQueryLimit: limit,
      dropDuplicates: true,
      language: 'en',
      async: true,
    },
    timeout: 30000,
  });
  const id = res.data?.id;
  if (!id) throw new Error(`Outscraper did not return a request id: ${JSON.stringify(res.data).slice(0, 200)}`);
  return { id, resultsUrl: res.data.results_location || `${BASE}/requests/${id}` };
}

// Poll until the job finishes; returns the flat array of place objects.
async function pollResults(resultsUrl) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const res = await axios.get(resultsUrl, {
      headers: { 'X-API-KEY': apiKey() },
      timeout: 30000,
    });
    const body = res.data || {};
    const status = body.status;

    if (status === 'Success' || (!status && Array.isArray(body.data))) {
      // data is an array-of-arrays (one inner array per submitted query).
      return Array.isArray(body.data) ? body.data.flat() : [];
    }
    if (status === 'Error' || status === 'Failed') {
      throw new Error(`Outscraper job failed: ${body.error || status}`);
    }
    // 'Pending' / 'In Progress' → keep polling
  }
  throw new Error('Outscraper job timed out');
}

// searchPlaces — the single entry point used by the leads route.
//   opts.maxResults  — token budget; the job is capped at min(this, HARD_CAP)
//   onProgress(count) — running total delivered so far
//   onBatch(leads)    — per-chunk; return false to stop (tokens exhausted)
//   onApiCall(records)— billable Outscraper records, for cost tracking
async function searchPlaces(query, opts = {}, onProgress, onBatch, onApiCall) {
  const budget = Number(opts.maxResults) || HARD_CAP;
  const limit = Math.max(1, Math.min(budget, HARD_CAP));

  console.log(`[outscraper] "${query}" → requesting up to ${limit} results`);
  const { id, resultsUrl } = await submitJob(query, limit);
  console.log(`[outscraper] job ${id} submitted, polling…`);

  const places = await pollResults(resultsUrl);
  const leads = places.map(p => ({ ...mapPlace(p), keyword: query }));
  console.log(`[outscraper] job ${id} → ${leads.length} businesses`);

  // We are billed for every record returned, regardless of how many the user
  // ends up keeping after per-user dedup.
  if (onApiCall && leads.length > 0) onApiCall(leads.length);

  // Stream in chunks so the frontend token badge / progress bar updates live.
  const delivered = [];
  for (let i = 0; i < leads.length; i += STREAM_CHUNK) {
    const batch = leads.slice(i, i + STREAM_CHUNK);
    delivered.push(...batch);
    if (onBatch) {
      const cont = await onBatch(batch);
      if (cont === false) break;
    }
    if (onProgress) onProgress(delivered.length);
  }

  return delivered;
}

module.exports = { searchPlaces };
