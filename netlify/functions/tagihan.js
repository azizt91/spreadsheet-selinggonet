const { getSheetsApi, readSheetData, corsHeaders } = require('./utils');

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    try {
        const sheets = await getSheetsApi();
        const { data } = await readSheetData(sheets, 'Tagihan');
        
        // Filter out empty rows - only include rows with valid IDPL and NAMA
        const filteredData = data.filter(item => {
            return item.IDPL && 
                   item.IDPL.trim() !== '' && 
                   item.NAMA && 
                   item.NAMA.trim() !== '' &&
                   item.IDPL !== 'N/A' && 
                   item.NAMA !== 'N/A';
        });
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(filteredData)
        };
    } catch (error) {
        console.error('Error [GET /tagihan]:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Gagal mengambil data tagihan' })
        };
    }
};