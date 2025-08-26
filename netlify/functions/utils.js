const { google } = require('googleapis');

const spreadsheetId = '1t5wDtV4yATXitTjk9S2jutziUI8KAj23FOaEM2inGPM';

async function getSheetsApi() {
    console.log("--- Starting getSheetsApi function ---");

    // 1. Cek apakah environment variable ada
    if (!process.env.GOOGLE_CREDENTIALS) {
        console.error("FATAL ERROR: GOOGLE_CREDENTIALS environment variable was NOT FOUND.");
        throw new Error('GOOGLE_CREDENTIALS environment variable is not set.');
    }
    console.log("SUCCESS: GOOGLE_CREDENTIALS variable was found.");
    // console.log("Raw Base64 string:", process.env.GOOGLE_CREDENTIALS); // Hati-hati, ini akan menampilkan secret di log

    let decodedCredentials;
    try {
        // 2. Coba decode Base64
        decodedCredentials = Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString('utf8');
        console.log("SUCCESS: Base64 decoding was successful.");
        // console.log("Decoded JSON string:", decodedCredentials);
    } catch (e) {
        console.error("FATAL ERROR: Failed to decode Base64 string.", e);
        throw new Error("Failed to decode Base64 credentials.");
    }

    let credentials;
    try {
        // 3. Coba parse string JSON yang sudah di-decode
        credentials = JSON.parse(decodedCredentials);
        console.log("SUCCESS: JSON parsing was successful.");
        if (credentials.private_key && credentials.client_email) {
            console.log("SUCCESS: private_key and client_email found in JSON.");
        } else {
            console.warn("WARNING: private_key or client_email is missing from the parsed JSON.");
        }
    } catch (e) {
        console.error("FATAL ERROR: Failed to parse the decoded JSON string.", e);
        console.error("The decoded string that failed was:", decodedCredentials);
        throw new Error("Failed to parse credentials JSON.");
    }

    try {
        // 4. Coba otentikasi dengan Google
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
        const client = await auth.getClient();
        console.log("SUCCESS: Google Auth client was created successfully.");
        return google.sheets({ version: 'v4', auth: client });
    } catch (e) {
        console.error("FATAL ERROR: Failed to authenticate with Google.", e);
        throw new Error("Google authentication failed.");
    }
}

// Sisa file ini tidak berubah
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
