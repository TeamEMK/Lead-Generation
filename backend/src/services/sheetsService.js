const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');

const SHEET_NAME = 'Sheet1';
const SHEET_GID = 0;
const HEADERS = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address', 'Status'];

// Service account auth (fallback)
function getServiceAccountAuth() {
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(process.env.SERVICE_ACCOUNT_PATH || './service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// User OAuth auth — uses the user's own Google credentials
function getUserOAuthClient(refreshToken) {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

async function getSheetsClient(refreshToken) {
  if (refreshToken && process.env.GOOGLE_CLIENT_ID) {
    const auth = getUserOAuthClient(refreshToken);
    return google.sheets({ version: 'v4', auth });
  }
  const auth = getServiceAccountAuth();
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function verifySheetAccess(spreadsheetId, refreshToken) {
  const sheets = await getSheetsClient(refreshToken);
  await sheets.spreadsheets.get({ spreadsheetId });
}

async function ensureHeaders(spreadsheetId, refreshToken) {
  const sheets = await getSheetsClient(refreshToken);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:H1`,
  });
  const existing = response.data.values?.[0] || [];
  const correct = HEADERS.every((h, i) => existing[i] === h);
  if (!correct) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

function dedupeKey(lead) {
  return `${(lead.businessName || '').toLowerCase().trim()}|${(lead.address || '').toLowerCase().trim()}`;
}

async function appendLeads(leads, spreadsheetId, refreshToken) {
  await ensureHeaders(spreadsheetId, refreshToken);
  const existing = await getAllLeads(spreadsheetId, refreshToken);
  const existingKeys = new Set(existing.map(dedupeKey));
  const fresh = leads.filter(lead => !existingKeys.has(dedupeKey(lead)));
  const skipped = leads.length - fresh.length;
  if (fresh.length === 0) return { saved: 0, skipped };

  const sheets = await getSheetsClient(refreshToken);
  const rows = fresh.map(lead => [
    lead.timestamp, lead.keyword || '', lead.businessName,
    lead.phone, lead.website, lead.email, lead.address, '',
  ]);

  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows.slice(i, i + CHUNK) },
    });
    if (i + CHUNK < rows.length) await sleep(1100);
  }
  return { saved: fresh.length, skipped };
}

async function getAllLeads(spreadsheetId, refreshToken) {
  const sheets = await getSheetsClient(refreshToken);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A:H`,
  });
  const rows = response.data.values || [];
  if (rows.length <= 1) return [];
  const [, ...dataRows] = rows;
  return dataRows.map((row, i) => ({
    rowIndex: i + 2,
    timestamp:    row[0] || '',
    keyword:      row[1] || '',
    businessName: row[2] || '',
    phone:        row[3] || '',
    website:      row[4] || '',
    email:        row[5] || '',
    address:      row[6] || '',
    status:       row[7] || '',
  }));
}

async function updateLeadStatuses(rowIndices, status, spreadsheetId, refreshToken) {
  const sheets = await getSheetsClient(refreshToken);
  const data = rowIndices.map(rowIndex => ({
    range: `${SHEET_NAME}!H${rowIndex}`,
    values: [[status]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data },
  });
}

async function deleteLeads(rowIndices, spreadsheetId, refreshToken) {
  const sheets = await getSheetsClient(refreshToken);
  const sorted = [...rowIndices].sort((a, b) => b - a);
  const requests = sorted.map(rowIndex => ({
    deleteDimension: {
      range: { sheetId: SHEET_GID, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
    },
  }));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { appendLeads, getAllLeads, updateLeadStatuses, deleteLeads, verifySheetAccess, ensureHeaders };
