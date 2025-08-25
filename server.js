// =================================================================
// SERVER.JS - APLIKASI MANAJEMEN PELANGGAN
// =================================================================
// File ini menangani semua logika backend:
// - Koneksi ke Google Sheets API
// - Endpoint untuk Login
// - Endpoint untuk CRUD (Create, Read, Update, Delete) Pelanggan
// - Endpoint untuk data Dashboard, Tagihan, dan Lunas
// - Endpoint untuk memproses pembayaran
// =================================================================

const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// GANTI DENGAN ID SPREADSHEET ANDA
const spreadsheetId = '1t5wDtV4yATXitTjk9S2jutziUI8KAj23FOaEM2inGPM';

// Helper untuk otentikasi dan koneksi ke API
async function getSheetsApi() {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'credentials.json',
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

// ===============================================
// ENDPOINT LOGIN
// ===============================================
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username dan password harus diisi' });
        }
        const sheets = await getSheetsApi();
        const { data } = await readSheetData(sheets, 'DATA');
        const user = data.find(row => row.USER === username);

        if (!user) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }
        if (user.PASSWORD === password) {
            res.status(200).json({ 
                message: 'Login berhasil!', 
                user: user.USER, 
                level: user.LEVEL || 'ADMIN',
                idpl: user.IDPL
            });
        } else {
            res.status(401).json({ message: 'Username atau password salah' });
        }
    } catch (error) {
        console.error('Error [POST /login]:', error);
        res.status(500).send('Terjadi kesalahan pada server saat proses login');
    }
});

// ===============================================
// ENDPOINT CRUD PELANGGAN (SHEET: DATA)
// ===============================================

// READ ALL PELANGGAN
app.get('/pelanggan', async (req, res) => {
    try {
        const sheets = await getSheetsApi();
        const { data } = await readSheetData(sheets, 'DATA');
        res.json(data);
    } catch (error) {
        console.error('Error [GET /pelanggan]:', error);
        res.status(500).send('Gagal mengambil data pelanggan');
    }
});

// CREATE PELANGGAN
app.post('/pelanggan', async (req, res) => {
    try {
        const sheets = await getSheetsApi();
        const { data } = await readSheetData(sheets, 'DATA');
        const lastRow = data[data.length - 1];

        let nextIdpl = 'CST001';
        let nextUser = 'user1';
        if (lastRow) {
            const lastIdNum = parseInt((lastRow.IDPL || 'CST000').replace('CST', ''), 10);
            nextIdpl = `CST${String(lastIdNum + 1).padStart(3, '0')}`;
            const lastUserNum = parseInt((lastRow.USER || 'user0').replace('user', ''), 10);
            nextUser = `user${lastUserNum + 1}`;
        }

        const { nama, alamat, jenisKelamin, whatsapp, paket, tagihan, status, jenisPerangkat } = req.body;
        const newRow = [
            nextIdpl, nama, nextUser, '1234', 'USER', '2', alamat,
            jenisKelamin, whatsapp, paket, tagihan, status,
            new Date().toLocaleDateString('id-ID'), jenisPerangkat, '', ''
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'DATA!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] },
        });
        res.status(201).json({ message: 'Pelanggan berhasil ditambahkan!' });
    } catch (error) {
        console.error('Error [POST /pelanggan]:', error);
        res.status(500).send('Gagal menambahkan pelanggan');
    }
});

// UPDATE PELANGGAN
app.put('/pelanggan/:rowNumber', async (req, res) => {
    try {
        const { rowNumber } = req.params;
        const sheets = await getSheetsApi();
        const { headers } = await readSheetData(sheets, 'DATA');
        const updatedData = req.body;
        
        // Membangun baris baru berdasarkan data yang ada dan data yang diupdate
        const originalDataResponse = await sheets.spreadsheets.values.get({spreadsheetId, range: `DATA!A${rowNumber}:P${rowNumber}`});
        const originalRow = originalDataResponse.data.values[0];
        
        const newRowData = headers.map((header, index) => {
            return updatedData[header] !== undefined ? updatedData[header] : originalRow[index];
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `DATA!A${rowNumber}:P${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRowData] },
        });
        res.status(200).json({ message: 'Data berhasil diperbarui!' });
    } catch (error) {
        console.error(`Error [PUT /pelanggan]:`, error);
        res.status(500).send('Gagal memperbarui data');
    }
});


// DELETE PELANGGAN
app.delete('/pelanggan/:rowNumber', async (req, res) => {
    try {
        const { rowNumber } = req.params;
        const sheets = await getSheetsApi();
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const dataSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'DATA');
        
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: dataSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber,
                        },
                    },
                }],
            },
        });
        res.status(200).json({ message: 'Data berhasil dihapus!' });
    } catch (error) {
        console.error(`Error [DELETE /pelanggan]:`, error);
        res.status(500).send('Gagal menghapus data');
    }
});

app.get('/dashboard-stats', async (req, res) => {
    try {
        const { bulan, tahun } = req.query; // Ambil filter dari query parameter
        const sheets = await getSheetsApi();

        // Ambil semua data yang relevan
        const { data: pelangganData } = await readSheetData(sheets, 'DATA');
        const { data: tagihanData } = await readSheetData(sheets, 'Tagihan');
        const { data: lunasData } = await readSheetData(sheets, 'Lunas');
        const { data: pengeluaranData } = await readSheetData(sheets, 'Pengeluaran');

        const isFiltering = bulan && tahun && bulan !== 'semua';
        const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        // --- FUNGSI FILTER BARU BERDASARKAN PERIODE ---
        const filterByPeriode = (data) => {
            if (!isFiltering) return data; // Jika tidak ada filter, kembalikan semua data
            
            // Buat string periode target, contoh: "Agustus 2025"
            const filterBulanNama = namaBulan[parseInt(bulan, 10)];
            const targetPeriode = `${filterBulanNama} ${tahun}`;

            return data.filter(row => {
                // Gunakan kolom 'PERIODE TAGIHAN' untuk Lunas dan Pengeluaran
                const periode = row['PERIODE TAGIHAN'] || '';
                return periode.trim() === targetPeriode;
            });
        };

        // Terapkan fungsi filter yang sama untuk Lunas dan Pengeluaran
        const lunasFiltered = filterByPeriode(lunasData);
        const pengeluaranFiltered = filterByPeriode(pengeluaranData);
        const unpaidInvoices = tagihanData.filter(row => row.STATUS && row.STATUS.toUpperCase() === 'BELUM LUNAS');
        // Hitung statistik berdasarkan data yang sudah difilter
        const totalCustomers = pelangganData.length;
        const activeCustomers = pelangganData.filter(p => p.STATUS === 'AKTIF').length;
        
        const totalRevenue = lunasFiltered.reduce((sum, row) => {
            const nominal = parseFloat(String(row.TAGIHAN || '0').replace(/\D/g, ''));
            return sum + nominal;
        }, 0);

        const totalExpenses = pengeluaranFiltered.reduce((sum, row) => {
            const nominal = parseFloat(String(row.JUMLAH || '0').replace(/\D/g, ''));
            return sum + nominal;
        }, 0);

        const profit = totalRevenue - totalExpenses;

        res.json({
            totalCustomers,
            activeCustomers,
            inactiveCustomers: totalCustomers - activeCustomers,
            totalUnpaid: unpaidInvoices.length,
            totalPaid: lunasFiltered.length,
            totalRevenue,
            totalExpenses,
            profit
        });

    } catch (error) {
        console.error('Error [GET /dashboard-stats]:', error);
        res.status(500).json({ message: 'Gagal mengambil statistik' });
    }
});



// ===============================================
// ENDPOINT TAGIHAN & LUNAS
// ===============================================
app.get('/tagihan', async (req, res) => {
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
        
        res.json(filteredData);
    } catch (error) {
        console.error('Error [GET /tagihan]:', error);
        res.status(500).send('Gagal mengambil data tagihan');
    }
});

app.get('/lunas', async (req, res) => {
    try {
        const sheets = await getSheetsApi();
        const { data } = await readSheetData(sheets, 'Lunas');
        res.json(data);
    } catch (error) {
        console.error('Error [GET /lunas]:', error);
        res.status(500).send('Gagal mengambil riwayat lunas');
    }
});

app.post('/bayar', async (req, res) => {
    try {
        const { rowNumber, rowData } = req.body;
        if (!rowNumber || !rowData) {
            return res.status(400).send('Data tidak lengkap');
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
        res.status(200).json({ message: 'Pembayaran berhasil diproses!' });
    } catch (error) {
        console.error(`Error [POST /bayar]:`, error);
        res.status(500).send('Gagal memproses pembayaran');
    }
});

// ===================================================================
// ENDPOINT CRUD PENGELUARAN (SHEET: Pengeluaran)
// ===================================================================

// READ ALL PENGELUARAN
app.get('/pengeluaran', async (req, res) => {
    try {
        const sheets = await getSheetsApi();
        const { data } = await readSheetData(sheets, 'Pengeluaran');
        res.json(data);
    } catch (error) {
        console.error('Error [GET /pengeluaran]:', error);
        res.status(500).send('Gagal mengambil data pengeluaran');
    }
});

// CREATE PENGELUARAN
app.post('/pengeluaran', async (req, res) => {
    try {
        const sheets = await getSheetsApi();
        const { DESKRIPSI_PENGELUARAN, JUMLAH, TANGGAL } = req.body; // Ambil TANGGAL dari body

        // Otomatisasi ID
        const nextId = crypto.randomBytes(4).toString('hex');

        // --- PERUBAHAN DI SINI ---
        // Menggunakan tanggal dari frontend untuk menentukan Bulan dan Tahun
        const tanggalInput = new Date(TANGGAL); // Konversi string 'yyyy-mm-dd' menjadi objek Date
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        const tanggalFormatted = tanggalInput.toLocaleDateString('id-ID'); // Format ke dd/mm/yyyy
        const bulan = namaBulan[tanggalInput.getMonth()];
        const tahun = tanggalInput.getFullYear();
        // --- AKHIR PERUBAHAN ---
        
        const newRow = [ nextId, DESKRIPSI_PENGELUARAN, JUMLAH, tanggalFormatted, bulan, tahun ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Pengeluaran!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] },
        });
        res.status(201).json({ message: 'Data pengeluaran berhasil ditambahkan!' });
    } catch (error) {
        console.error('Error [POST /pengeluaran]:', error);
        res.status(500).send('Gagal menambahkan pengeluaran');
    }
});

// UPDATE PENGELUARAN
app.put('/pengeluaran/:rowNumber', async (req, res) => {
    try {
        const { rowNumber } = req.params;
        const { DESKRIPSI_PENGELUARAN, JUMLAH, TANGGAL } = req.body; // Ambil TANGGAL dari body
        const sheets = await getSheetsApi();

        // --- PERUBAHAN DI SINI ---
        // Menggunakan tanggal dari frontend untuk menentukan Bulan dan Tahun
        const tanggalInput = new Date(TANGGAL);
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        const tanggalFormatted = tanggalInput.toLocaleDateString('id-ID');
        const bulan = namaBulan[tanggalInput.getMonth()];
        const tahun = tanggalInput.getFullYear();
        // --- AKHIR PERUBAHAN ---

        // Update kolom Deskripsi, Jumlah, Tanggal, Bulan, dan Tahun
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Pengeluaran!B${rowNumber}:F${rowNumber}`, // Kolom B sampai F
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[DESKRIPSI_PENGELUARAN, JUMLAH, tanggalFormatted, bulan, tahun]],
            },
        });
        res.status(200).json({ message: 'Data pengeluaran berhasil diperbarui!' });
    } catch (error) {
        console.error(`Error [PUT /pengeluaran]:`, error);
        res.status(500).send('Gagal memperbarui data pengeluaran');
    }
});

// DELETE PENGELUARAN
app.delete('/pengeluaran/:rowNumber', async (req, res) => {
    try {
        const { rowNumber } = req.params;
        const sheets = await getSheetsApi();
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
        res.status(200).json({ message: 'Data pengeluaran berhasil dihapus!' });
    } catch (error) {
        console.error(`Error [DELETE /pengeluaran]:`, error);
        res.status(500).send('Gagal menghapus data pengeluaran');
    }
});



// ===============================================
// START SERVER
// ===============================================
app.listen(3000, () => {
    console.log('Server berjalan di http://localhost:3000');
});