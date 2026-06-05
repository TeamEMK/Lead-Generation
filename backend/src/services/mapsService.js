const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');
const os = require('os');

let cachedToken = null;
let tokenExpiry = 0;

const PAGE_DELAY_MS = 2000;
const RETRY_DELAYS_MS = [2000, 5000, 12000];

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  let authOptions;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Railway: service account JSON pasted as env variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    authOptions = { credentials, scopes: ['https://www.googleapis.com/auth/cloud-platform'] };
  } else {
    // Local: read from file
    const keyFile = path.resolve(process.env.SERVICE_ACCOUNT_PATH || './service-account.json');
    authOptions = { keyFile, scopes: ['https://www.googleapis.com/auth/cloud-platform'] };
  }

  const auth = new GoogleAuth(authOptions);
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  cachedToken = token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

async function post(body, fieldMask) {
  const token = await getAccessToken();
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

async function fetchAllPages(initialBody) {
  const results = [];
  let pageToken = null;

  do {
    const body = { ...initialBody };
    if (pageToken) body.pageToken = pageToken;

    const res = await post(
      body,
      'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,nextPageToken'
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

async function getLocationViewport(locationName) {
  try {
    const res = await post(
      { textQuery: locationName, maxResultCount: 1 },
      'places.viewport,places.location'
    );
    const place = res.data.places?.[0];
    if (place?.viewport?.low && place?.viewport?.high) return place.viewport;
    if (place?.location) {
      const { latitude: lat, longitude: lng } = place.location;
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

function chooseGridSize(viewport) {
  const span = Math.max(
    Math.abs(viewport.high.latitude  - viewport.low.latitude),
    Math.abs(viewport.high.longitude - viewport.low.longitude)
  );
  if (span >= 8)    return 5;
  if (span >= 2)    return 4;
  if (span >= 0.5)  return 3;
  if (span >= 0.15) return 2;
  return 1;
}

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

function splitLocations(locationStr) {
  return locationStr
    .split(/,|\s+and\s+|\s*&\s*/i)
    .map(l => l.trim())
    .filter(Boolean);
}

async function gridSearchForLocation(keyword, location, originalQuery, onProgress, onBatch) {
  const viewport = await getLocationViewport(location);

  if (!viewport) {
    console.warn(`  no viewport for "${location}", falling back to text search`);
    const results = await fetchAllPages({ textQuery: `${keyword} in ${location}`, maxResultCount: 20 });
    const mapped = results.map(l => ({ ...l, keyword: originalQuery }));
    if (onBatch) {
      const cont = await onBatch(mapped);
      if (cont === false) return [];
    }
    if (onProgress) onProgress(mapped.length);
    return mapped;
  }

  const n = chooseGridSize(viewport);
  const cells = buildGrid(viewport, n);
  console.log(`  [${location}] span → ${n}×${n} grid (${cells.length} cells)`);

  const all = [];
  for (let i = 0; i < cells.length; i++) {
    try {
      const cellResults = await fetchAllPages(
        { textQuery: keyword, maxResultCount: 20, locationRestriction: { rectangle: cells[i] } }
      );
      const mapped = cellResults.map(l => ({ ...l, keyword: originalQuery }));
      all.push(...mapped);
      if (mapped.length > 0) {
        console.log(`    cell ${i + 1}/${cells.length} → ${mapped.length} (running total: ${all.length})`);
      }
      if (onBatch) {
        const cont = await onBatch(mapped);
        if (cont === false) {
          console.log(`    tokens exhausted — stopping search at cell ${i + 1}/${cells.length}`);
          break;
        }
      }
    } catch (err) {
      console.warn(`    cell ${i + 1} failed: ${err.message}`);
    }
    if (onProgress) onProgress(all.length);
    if (i < cells.length - 1) await sleep(500);
  }

  return all;
}

async function searchPlaces(query, onProgress, onBatch) {
  const { keyword, locationStr } = extractLocation(query);

  if (!locationStr) {
    console.log(`[maps] plain search: "${query}"`);
    const raw = dedupeByPlaceId(await fetchAllPages({ textQuery: query, maxResultCount: 20 }));
    const results = raw.map(l => ({ ...l, keyword: query }));
    if (onBatch) {
      const cont = await onBatch(results);
      if (cont === false) return results;
    }
    if (onProgress) onProgress(results.length);
    return results;
  }

  const locations = splitLocations(locationStr);
  console.log(`[maps] keyword="${keyword}" locations=[${locations.join(', ')}]`);

  const all = [];
  let exhausted = false;
  for (let i = 0; i < locations.length; i++) {
    if (exhausted) break;
    const loc = locations[i];
    console.log(`[maps] searching location ${i + 1}/${locations.length}: "${loc}"`);
    try {
      const results = await gridSearchForLocation(keyword, loc, query,
        count => { if (onProgress) onProgress(all.length + count); },
        async (batch) => {
          if (!onBatch) return true;
          const cont = await onBatch(batch);
          if (cont === false) { exhausted = true; return false; }
          return true;
        }
      );
      all.push(...results);
      console.log(`  "${loc}" contributed ${results.length} leads (running total: ${all.length})`);
    } catch (err) {
      console.warn(`  "${loc}" failed: ${err.message}`);
    }
    if (exhausted) break;
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
