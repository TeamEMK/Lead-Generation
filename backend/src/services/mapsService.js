const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

let cachedToken = null;
let tokenExpiry = 0;

const PAGE_DELAY_MS = 2000;
const RETRY_DELAYS_MS = [2000, 5000, 12000];

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const auth = new GoogleAuth({
    keyFile: path.resolve(process.env.SERVICE_ACCOUNT_PATH || './service-account.json'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  cachedToken = token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

async function post(body, fieldMask, token) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Goog-FieldMask': fieldMask,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );
    } catch (err) {
      const status = err.response?.status;
      if ((status === 429 || status === 503) && attempt < RETRY_DELAYS_MS.length) {
        console.warn(`Rate limit (${status}), retrying in ${RETRY_DELAYS_MS[attempt]}ms…`);
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw err;
    }
  }
}

// Paginate through all pages of a single Places text search body
async function fetchAllPages(initialBody, token) {
  const results = [];
  let pageToken = null;

  do {
    const body = { ...initialBody };
    if (pageToken) body.pageToken = pageToken;

    const res = await post(
      body,
      'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,nextPageToken',
      token
    );

    for (const place of res.data.places || []) {
      results.push({
        timestamp:    new Date().toISOString(),
        businessName: place.displayName?.text || '',
        phone:        place.nationalPhoneNumber || '',
        website:      place.websiteUri || '',
        email:        '',
        address:      place.formattedAddress || '',
        placeId:      place.id || '',
      });
    }

    pageToken = res.data.nextPageToken || null;
    if (pageToken) await sleep(PAGE_DELAY_MS);

  } while (pageToken);

  return results;
}

/** Get the geographic bounding box for a location name. */
async function getLocationViewport(locationName, token) {
  try {
    const res = await post(
      { textQuery: locationName, maxResultCount: 1 },
      'places.viewport,places.location',
      token
    );
    const place = res.data.places?.[0];
    if (place?.viewport?.low && place?.viewport?.high) return place.viewport;
    if (place?.location) {
      const { latitude: lat, longitude: lng } = place.location;
      // Fallback: build a ±0.15° box (~16 km)
      return {
        low:  { latitude: lat - 0.15, longitude: lng - 0.15 },
        high: { latitude: lat + 0.15, longitude: lng + 0.15 },
      };
    }
  } catch (err) {
    console.warn(`getLocationViewport("${locationName}"): ${err.message}`);
  }
  return null;
}

/**
 * Choose grid size based on the geographic span of the area.
 *
 * span (°)   approx size         grid    cells   max results
 * ─────────  ──────────────────  ──────  ──────  ───────────
 * < 0.15     small locality      1 × 1      1        60
 * 0.15–0.5   district / suburb   2 × 2      4       240
 * 0.5–2      major city          3 × 3      9       540
 * 2–8        state / region      4 × 4     16       960
 * > 8        country / huge area 5 × 5     25     1 500
 */
function chooseGridSize(viewport) {
  const span = Math.max(
    Math.abs(viewport.high.latitude  - viewport.low.latitude),
    Math.abs(viewport.high.longitude - viewport.low.longitude)
  );
  if (span >= 8)   return 5;
  if (span >= 2)   return 4;
  if (span >= 0.5) return 3;
  if (span >= 0.15) return 2;
  return 1;
}

/** Split a viewport into an N×N grid of rectangles. */
function buildGrid(viewport, n) {
  const latStep = (viewport.high.latitude  - viewport.low.latitude)  / n;
  const lngStep = (viewport.high.longitude - viewport.low.longitude) / n;
  const cells = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      cells.push({
        low: {
          latitude:  viewport.low.latitude  +  row      * latStep,
          longitude: viewport.low.longitude +  col      * lngStep,
        },
        high: {
          latitude:  viewport.low.latitude  + (row + 1) * latStep,
          longitude: viewport.low.longitude + (col + 1) * lngStep,
        },
      });
    }
  }
  return cells;
}

/** Extract keyword and location(s) from a natural query string. */
function extractLocation(query) {
  const patterns = [
    /^(.+?)\s+in\s+(.+)$/i,
    /^(.+?)\s+near\s+(.+)$/i,
    /^(.+?)\s+at\s+(.+)$/i,
    /^(.+?)\s+around\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = query.match(re);
    if (m) return { keyword: m[1].trim(), locationStr: m[2].trim() };
  }
  return { keyword: query.trim(), locationStr: '' };
}

/**
 * Split a location string into individual city/area names.
 * Supports:  "Mumbai, Delhi, Bangalore"
 *            "Mumbai and Delhi"
 *            "Mumbai & Delhi"
 *            "all cities in Maharashtra"  → returns ["Maharashtra"]
 */
function splitLocations(locationStr) {
  return locationStr
    .split(/,|\s+and\s+|\s*&\s*/i)
    .map(l => l.trim())
    .filter(Boolean);
}

/**
 * Run a full grid-based search for a single location.
 * Returns all deduplicated leads tagged with `keyword`.
 */
async function gridSearchForLocation(keyword, location, originalQuery, token) {
  const viewport = await getLocationViewport(location, token);

  if (!viewport) {
    console.warn(`  no viewport for "${location}", falling back to text search`);
    const results = await fetchAllPages({ textQuery: `${keyword} in ${location}`, maxResultCount: 20 }, token);
    return results.map(l => ({ ...l, keyword: originalQuery }));
  }

  const n = chooseGridSize(viewport);
  const cells = buildGrid(viewport, n);
  console.log(`  [${location}] span → ${n}×${n} grid (${cells.length} cells)`);

  const all = [];
  for (let i = 0; i < cells.length; i++) {
    try {
      const cellResults = await fetchAllPages(
        { textQuery: keyword, maxResultCount: 20, locationRestriction: { rectangle: cells[i] } },
        token
      );
      all.push(...cellResults);
      if (cellResults.length > 0) {
        console.log(`    cell ${i + 1}/${cells.length} → ${cellResults.length} (running total: ${all.length})`);
      }
    } catch (err) {
      console.warn(`    cell ${i + 1} failed: ${err.message}`);
    }
    if (i < cells.length - 1) await sleep(500);
  }

  return all.map(l => ({ ...l, keyword: originalQuery }));
}

/**
 * Main search entry point.
 *
 * Supports:
 *   "hotels"                          → plain text search (~60)
 *   "hotels in Mumbai"                → 3×3 grid  (~540)
 *   "hotels in Andheri"               → 2×2 grid  (~240)
 *   "hotels in Maharashtra"           → 4×4 grid  (~960)
 *   "hotels in India"                 → 5×5 grid  (~1500)
 *   "hotels in Mumbai, Delhi, Pune"   → 3 separate grid searches, merged
 */
async function searchPlaces(query) {
  const token = await getAccessToken();
  const { keyword, locationStr } = extractLocation(query);

  if (!locationStr) {
    console.log(`[maps] plain search: "${query}"`);
    return dedupeByPlaceId(await fetchAllPages({ textQuery: query, maxResultCount: 20 }, token));
  }

  const locations = splitLocations(locationStr);
  console.log(`[maps] keyword="${keyword}" locations=[${locations.join(', ')}]`);

  const all = [];
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    console.log(`[maps] searching location ${i + 1}/${locations.length}: "${loc}"`);
    try {
      const results = await gridSearchForLocation(keyword, loc, query, token);
      all.push(...results);
      console.log(`  "${loc}" contributed ${results.length} leads (running total: ${all.length})`);
    } catch (err) {
      console.warn(`  "${loc}" failed: ${err.message}`);
    }
    if (i < locations.length - 1) await sleep(800);
  }

  const deduped = dedupeByPlaceId(all);
  console.log(`[maps] final unique leads: ${deduped.length}`);
  return deduped;
}

function dedupeByPlaceId(leads) {
  const seen = new Set();
  return leads.filter(l => {
    if (!l.placeId) return true;
    if (seen.has(l.placeId)) return false;
    seen.add(l.placeId);
    return true;
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { searchPlaces };
