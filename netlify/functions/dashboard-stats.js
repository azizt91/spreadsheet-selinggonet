const { getSheetsApi, readSheetData, corsHeaders } = require('./utils');

exports.handler = async (event, context) => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow GET method
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        // Get query parameters - Netlify provides them in event.queryStringParameters
        const { bulan, tahun } = event.queryStringParameters || {};
        
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

        const stats = {
            totalCustomers,
            activeCustomers,
            inactiveCustomers: totalCustomers - activeCustomers,
            totalUnpaid: unpaidInvoices.length,
            totalPaid: lunasFiltered.length,
            totalRevenue,
            totalExpenses,
            profit
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(stats)
        };

    } catch (error) {
        console.error('Error [GET /dashboard-stats]:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Gagal mengambil statistik' })
        };
    }
};