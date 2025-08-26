const { getSheetsApi, readSheetData, spreadsheetId, corsHeaders } = require('./utils');
const crypto = require('crypto');

exports.handler = async (event, context) => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    const method = event.httpMethod;
    const path = event.path;
    
    try {
        const sheets = await getSheetsApi();

        switch (method) {
            case 'GET':
                return await handleGet(sheets);
            
            case 'POST':
                return await handlePost(sheets, event);
            
            case 'PUT':
                return await handlePut(sheets, event, path);
            
            case 'DELETE':
                return await handleDelete(sheets, event, path);
            
            default:
                return {
                    statusCode: 405,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Error in pengeluaran function:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};

// READ ALL PENGELUARAN
async function handleGet(sheets) {
    try {
        const { data } = await readSheetData(sheets, 'Pengeluaran');
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('Error [GET /pengeluaran]:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Gagal mengambil data pengeluaran' })
        };
    }
}

// CREATE PENGELUARAN
async function handlePost(sheets, event) {
    try {
        const { DESKRIPSI_PENGELUARAN, JUMLAH, TANGGAL } = JSON.parse(event.body);

        // Otomatisasi ID
        const nextId = crypto.randomBytes(4).toString('hex');

        // Menggunakan tanggal dari frontend untuk menentukan Bulan dan Tahun
        const tanggalInput = new Date(TANGGAL); // Konversi string 'yyyy-mm-dd' menjadi objek Date
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        const tanggalFormatted = tanggalInput.toLocaleDateString('id-ID'); // Format ke dd/mm/yyyy
        const bulan = namaBulan[tanggalInput.getMonth()];
        const tahun = tanggalInput.getFullYear();
        
        const newRow = [nextId, DESKRIPSI_PENGELUARAN, JUMLAH, tanggalFormatted, bulan, tahun];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Pengeluaran!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] },
        });

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Data pengeluaran berhasil ditambahkan!' })
        };
    } catch (error) {
        console.error('Error [POST /pengeluaran]:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Gagal menambahkan pengeluaran' })
        };
    }
}

// UPDATE PENGELUARAN
async function handlePut(sheets, event, path) {
    try {
        // Extract rowNumber from path - Netlify path includes full path
        const rowNumber = path.split('/').pop();
        const { DESKRIPSI_PENGELUARAN, JUMLAH, TANGGAL } = JSON.parse(event.body);

        // Menggunakan tanggal dari frontend untuk menentukan Bulan dan Tahun
        const tanggalInput = new Date(TANGGAL);
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        const tanggalFormatted = tanggalInput.toLocaleDateString('id-ID');
        const bulan = namaBulan[tanggalInput.getMonth()];
        const tahun = tanggalInput.getFullYear();

        // Update kolom Deskripsi, Jumlah, Tanggal, Bulan, dan Tahun
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pengeluaran!B${rowNumber}:F${rowNumber}`, // Kolom B sampai F
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[DESKRIPSI_PENGELUARAN, JUMLAH, tanggalFormatted, bulan, tahun]],
            },
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Data pengeluaran berhasil diperbarui!' })
        };
    } catch (error) {
        console.error('Error [PUT /pengeluaran]:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Gagal memperbarui data pengeluaran' })
        };
    }
}

// DELETE PENGELUARAN
async function handleDelete(sheets, event, path) {
    try {
        // Extract rowNumber from path
        const rowNumber = path.split('/').pop();
        
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Pengeluaran');
        
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheet.properties.sheetId,
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
            body: JSON.stringify({ message: 'Data pengeluaran berhasil dihapus!' })
        };
    } catch (error) {
        console.error('Error [DELETE /pengeluaran]:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Gagal menghapus data pengeluaran' })
        };
    }
}