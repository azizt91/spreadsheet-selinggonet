const { getSheetsApi, readSheetData, spreadsheetId, corsHeaders } = require('./utils');

exports.handler = async (event, context) => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow POST method
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        // Parse request body - Netlify provides it in event.body as string
        const { rowNumber, rowData } = JSON.parse(event.body);
        
        if (!rowNumber || !rowData) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Data tidak lengkap' })
            };
        }
        
        const sheets = await getSheetsApi();

        // Siapkan baris baru untuk sheet Lunas berdasarkan header
        const { headers: lunasHeaders } = await readSheetData(sheets, 'Lunas');
        const newLunasRow = lunasHeaders.map(header => {
            if (header === 'STATUS') return 'LUNAS';
            if (header === 'TANGGAL BAYAR') return new Date().toLocaleDateString('id-ID');
            return rowData[header] || '';
        });

        // Tambahkan baris ke sheet Lunas
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Lunas!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newLunasRow] },
        });

        // Hapus baris dari sheet Tagihan
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const tagihanSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Tagihan');
        
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: tagihanSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber,
                        },
                    },
                }],
            },
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Pembayaran berhasil diproses!' })
        };

    } catch (error) {
        console.error('Error [POST /bayar]:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Gagal memproses pembayaran' })
        };
    }
};