const { google } = require('googleapis');

const spreadsheetId = '1t5wDtV4yATXitTjk9S2jutziUI8KAj23FOaEM2inGPM';

async function getSheetsApi() {
    if (!process.env.GOOGLE_CREDENTIALS) {
        throw new Error('GOOGLE_CREDENTIALS environment variable is not set.');
    }

    // --- PERBAIKAN DI SINI ---
    // 1. Decode string Base64 menjadi string JSON biasa
    const decodedCredentials = Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString('utf8');
    // 2. Parse string JSON yang sudah di-decode
    const credentials = JSON.parse(decodedCredentials);
    
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
}

async function readSheetData(sheets, sheetName) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const rows = response.data.values || [];
    if (rows.length < 1) return { headers: [], data: [] };
    const headers = rows.shift();
    const data = rows.map((row, index) => {
        let obj = {};
        headers.forEach((header, i) => { obj[header] = row[i]; });
        obj.rowNumber = index + 2; // Nomor baris aktual di sheet
        return obj;
    });
    return { headers, data };
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

module.exports = {
    getSheetsApi,
    readSheetData,
    spreadsheetId,
    corsHeaders
};