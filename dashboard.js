             // dashboard.js (Versi Final dengan Filter Fungsional dan Perbaikan RpNaN)

document.addEventListener('DOMContentLoaded', function() {
    // Logika session check & logout dihandle oleh auth.js
    
    // DOM Selectors
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const cardsContainer = document.querySelector('.cards-container');

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showLoading(text = 'Memuat data, harap tunggu...') {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    function hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    // ===============================================
    // Initial Setup
    // ===============================================
    populateFilters();
    initializeEventListeners();
    fetchDashboardStats(); // Panggil pertama kali saat halaman dimuat

    // --- Fungsi untuk mengisi filter bulan dan tahun ---
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

        // Isi dropdown tahun (misal: 4 tahun ke belakang)
        for (let i = 0; i < 4; i++) {
            const tahun = tahunIni - i;
            const option = document.createElement('option');
            option.value = tahun;
            option.textContent = tahun;
            filterTahun.appendChild(option);
        }
    }

    // --- Fungsi untuk mengaktifkan event listener pada filter ---
    function initializeEventListeners() {
        filterBulan.addEventListener('change', fetchDashboardStats);
        filterTahun.addEventListener('change', fetchDashboardStats);
    }

    // --- Fungsi untuk mengambil data statistik dari backend ---
    async function fetchDashboardStats() {
        const bulan = filterBulan.value;
        const tahun = filterTahun.value;
        
        showLoading('Memuat data dashboard, harap tunggu...');
        
        try {
            // Mengirim parameter filter ke backend
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getDashboardStats&bulan=${bulan}&tahun=${tahun}`);
            if (!response.ok) throw new Error('Gagal mengambil data statistik');
            
            const stats = await response.json();
            if (stats.error) throw new Error(stats.error);

            displayStats(stats);
        } catch (error) {
            console.error('Error:', error);
            cardsContainer.innerHTML = `<p style="text-align: center; color: red;">Gagal memuat data statistik: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }

    // --- Fungsi untuk menampilkan statistik di kartu-kartu ---
    // function displayStats(stats) {
    //     cardsContainer.innerHTML = ''; // Mengosongkan kartu sebelum diisi

    //     const formatter = new Intl.NumberFormat('id-ID', {
    //         style: 'currency',
    //         currency: 'IDR',
    //         minimumFractionDigits: 0
    //     });

    //     // Urutkan kartu: Keuangan dulu, baru statistik pelanggan
    //     const statsCards = [
    //         { icon: 'fas fa-wallet', label: 'Total Pendapatan', value: formatter.format(stats.totalRevenue || 0), color: '#20b2aa' },
    //         { icon: 'fas fa-sign-out-alt', label: 'Total Pengeluaran', value: formatter.format(stats.totalExpenses || 0), color: '#ff6347' },
    //         { icon: 'fas fa-chart-line', label: 'Profit', value: formatter.format(stats.profit || 0), color: '#8a2be2' },
    //         { icon: 'fas fa-users', label: 'Total Pelanggan', value: stats.totalCustomers || 0, color: '#6a5acd' },
    //         { icon: 'fas fa-user-check', label: 'Pelanggan Aktif', value: stats.activeCustomers || 0, color: '#32cd32' },
    //         { icon: 'fas fa-user-slash', label: 'Pelanggan Nonaktif', value: stats.inactiveCustomers || 0, color: '#dc3545' },
    //         { icon: 'fas fa-exclamation-circle', label: 'Belum Lunas', value: stats.totalUnpaid || 0, color: '#ffc107' },
    //         { icon: 'fas fa-check-circle', label: 'Tagihan Lunas', value: stats.totalPaid || 0, color: '#1e90ff' }
    //     ];

    //     statsCards.forEach(card => {
    //         const cardElement = document.createElement('div');
    //         cardElement.className = 'card';
    //         cardElement.innerHTML = `
    //             <div class="card-icon" style="background-color: ${card.color}20; color: ${card.color};">
    //                 <i class="${card.icon}"></i>
    //             </div>
    //             <h3>${card.label}</h3>
    //             <div class="card-value">${card.value}</div>
    //         `;
    //         cardsContainer.appendChild(cardElement);
    //     });
    // }
  function displayStats(stats) {
    cardsContainer.innerHTML = ''; // Mengosongkan kartu sebelum diisi

    const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    });

    const statsCards = [
        { icon: 'fas fa-wallet', label: 'Total Pendapatan', value: formatter.format(stats.totalRevenue || 0), color: '#20b2aa' },
        { icon: 'fas fa-sign-out-alt', label: 'Total Pengeluaran', value: formatter.format(stats.totalExpenses || 0), color: '#ff6347' },
        { icon: 'fas fa-chart-line', label: 'Profit', value: formatter.format(stats.profit || 0), color: '#8a2be2' },
        { icon: 'fas fa-users', label: 'Total Pelanggan', value: stats.totalCustomers || 0, color: '#6a5acd' },
        { icon: 'fas fa-user-check', label: 'Pelanggan Aktif', value: stats.activeCustomers || 0, color: '#32cd32', isClickable: true, link: 'pelanggan.html', filter: 'AKTIF' },
        { icon: 'fas fa-user-slash', label: 'Pelanggan Nonaktif', value: stats.inactiveCustomers || 0, color: '#dc3545', isClickable: true, link: 'pelanggan.html', filter: 'NONAKTIF' },
        { icon: 'fas fa-exclamation-circle', label: 'Belum Lunas', value: stats.totalUnpaid || 0, color: '#ffc107', isClickable: true, link: 'tagihan.html' },
        { icon: 'fas fa-check-circle', label: 'Tagihan Lunas', value: stats.totalPaid || 0, color: '#1e90ff', isClickable: true, link: 'lunas.html' }
    ];

    statsCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        
        let cardHTML = `
            <div class="card-icon" style="background-color: ${card.color}20; color: ${card.color};">
                <i class="${card.icon}"></i>
            </div>
            <h3>${card.label}</h3>
            <div class="card-value">${card.value}</div>
        `;

        if (card.isClickable) {
            cardElement.classList.add('clickable-card');
            cardHTML += `<i class="fas fa-arrow-right card-arrow"></i>`;
            
            // --- INI BAGIAN UTAMA PERUBAHANNYA ---
            cardElement.addEventListener('click', () => {
                const bulan = filterBulan.value;
                const tahun = filterTahun.value;
                // Membuat URL dengan parameter filter
                const destinationUrl = `${card.link}?bulan=${bulan}&tahun=${tahun}`;
                window.location.href = destinationUrl;
            });
        }

        cardElement.innerHTML = cardHTML;
        cardsContainer.appendChild(cardElement);
    });
}
});                   
