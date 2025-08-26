// dashboard.js (Versi Final dengan Filter Fungsional dan Perbaikan RpNaN)

document.addEventListener('DOMContentLoaded', function() {
    // Logika session check & logout dihandle oleh auth.js
    
    // DOM Selectors
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const cardsContainer = document.querySelector('.cards-container');

    // Initial Setup
    populateFilters();
    initializeEventListeners();
    fetchDashboardStats(); // Panggil pertama kali saat halaman dimuat

    // --- BAGIAN INI MENGISI FILTER ---
    function populateFilters() {
        const namaBulan = ["Semua Bulan", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const sekarang = new Date();
        const bulanIni = sekarang.getMonth() + 1;
        const tahunIni = sekarang.getFullYear();

        // Isi dropdown bulan
        namaBulan.forEach((bulan, index) => {
            const option = document.createElement('option');
            option.value = index === 0 ? 'semua' : index;
            option.textContent = bulan;
            if (index === bulanIni) {
                option.selected = true;
            }
            filterBulan.appendChild(option);
        });

        // Isi dropdown tahun
        for (let i = 0; i < 4; i++) {
            const tahun = tahunIni - i;
            const option = document.createElement('option');
            option.value = tahun;
            option.textContent = tahun;
            filterTahun.appendChild(option);
        }
    }

    // --- BAGIAN INI MEMBUAT FILTER BERFUNGSI ---
    function initializeEventListeners() {
        filterBulan.addEventListener('change', fetchDashboardStats);
        filterTahun.addEventListener('change', fetchDashboardStats);
    }

    // Mengambil data statistik dari backend
    async function fetchDashboardStats() {
        const bulan = filterBulan.value;
        const tahun = filterTahun.value;
        
        try {
            // Mengirim parameter filter ke backend
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getDashboardStats&bulan=${bulan}&tahun=${tahun}`);
            if (!response.ok) throw new Error('Gagal mengambil data statistik');
            
            const stats = await response.json();
            displayStats(stats);
        } catch (error) {
            console.error('Error:', error);
            cardsContainer.innerHTML = '<p>Gagal memuat data statistik. Pastikan server backend berjalan.</p>';
        }
    }

    // --- BAGIAN INI MEMPERBAIKI RpNaN ---
    function displayStats(stats) {
        cardsContainer.innerHTML = ''; // Mengosongkan kartu

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        const statsCards = [
            { icon: 'fas fa-users', label: 'Total Pelanggan', value: stats.totalCustomers, color: '#6a5acd' },
            { icon: 'fas fa-user-check', label: 'Pelanggan Aktif', value: stats.activeCustomers, color: '#32cd32' },
            { icon: 'fas fa-exclamation-circle', label: 'Belum Lunas', value: stats.totalUnpaid, color: '#ffc107' },
            { icon: 'fas fa-check-circle', label: 'Tagihan Lunas', value: stats.totalPaid, color: '#1e90ff' },
            { icon: 'fas fa-wallet', label: 'Total Pendapatan', value: formatter.format(stats.totalRevenue || 0), color: '#20b2aa' },
            // Menambahkan fallback '|| 0' untuk mencegah error jika data tidak ada
            { icon: 'fas fa-sign-out-alt', label: 'Total Pengeluaran', value: formatter.format(stats.totalExpenses || 0), color: '#ff6347' },
            { icon: 'fas fa-chart-line', label: 'Profit', value: formatter.format(stats.profit || 0), color: '#8a2be2' }
        ];

        if (stats.inactiveCustomers > 0) {
            statsCards.splice(2, 0, { icon: 'fas fa-user-slash', label: 'Pelanggan Nonaktif', value: stats.inactiveCustomers, color: '#dc3545' });
        }

        statsCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.innerHTML = `
                <div class="card-icon" style="background-color: ${card.color}20; color: ${card.color};">
                    <i class="${card.icon}"></i>
                </div>
                <h3>${card.label}</h3>
                <div class="card-value">${card.value}</div>
            `;
            cardsContainer.appendChild(cardElement);
        });
    }
});