const { google } = require('googleapis');

// GANTI DENGAN ID SPREADSHEET ANDA
const spreadsheetId = '1t5wDtV4yATXitTjk9S2jutziUI8KAj23FOaEM2inGPM';

// Helper untuk otentikasi dan koneksi ke API
async function getSheetsApi() {
    // Use environment variables for credentials in production
    const credentials = process.env.GOOGLE_CREDENTIALS ? 
        JSON.parse(process.env.GOOGLE_CREDENTIALS) : 
        require('../../credentials.json');
    
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
}

// Helper untuk membaca data dari sheet manapun
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

// CORS headers for all responses
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