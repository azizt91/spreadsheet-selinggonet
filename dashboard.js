document.addEventListener('DOMContentLoaded', function() {
    // Logika session check & logout dihandle oleh auth.js
    
    // DOM Selectors
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const cardsContainer = document.getElementById('cards-container');

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
        
        // Show skeleton loading
        showLoading();
        
        try {
            // Mengirim parameter filter ke backend
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getDashboardStats&bulan=${bulan}&tahun=${tahun}`);
            if (!response.ok) throw new Error('Gagal mengambil data statistik');
            
            const stats = await response.json();
            if (stats.error) throw new Error(stats.error);

            hideLoading();
            displayStats(stats);
        } catch (error) {
            console.error('Error:', error);
            hideLoading();
            cardsContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Gagal memuat data: ${error.message}</p>`;
        }
    }

    // --- Fungsi untuk menampilkan statistik di kartu-kartu modern ---
    function displayStats(stats) {
        cardsContainer.innerHTML = ''; // Clear previous cards

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        const statsCards = [
            { 
                label: 'Profit', 
                value: formatter.format(stats.profit || 0), 
                gradient: 'gradient-card-1',
                icon: '💰'
            },
            { 
                label: 'Total Pendapatan', 
                value: formatter.format(stats.totalRevenue || 0), 
                gradient: 'gradient-card-2',
                icon: '📈'
            },
            { 
                label: 'Total Pengeluaran', 
                value: formatter.format(stats.totalExpenses || 0), 
                gradient: 'gradient-card-3',
                icon: '💸'
            },
            { 
                label: 'Pelanggan Aktif', 
                value: stats.activeCustomers || 0, 
                gradient: 'gradient-card-4',
                icon: '👥'
            },
            { 
                label: 'Pelanggan Tidak Aktif', 
                value: stats.inactiveCustomers || 0, 
                gradient: 'gradient-card-5',
                icon: '😴'
            },
            { 
                label: 'Belum Dibayar', 
                value: stats.totalUnpaid || 0, 
                gradient: 'gradient-card-6',
                icon: '⏳',
                link: 'tagihan.html'
            },
            { 
                label: 'Dibayar', 
                value: stats.totalPaid || 0, 
                gradient: 'gradient-card-7',
                icon: '✅',
                link: 'lunas.html'
            }
        ];

        statsCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
           let cardClasses = 'card-hover rounded-3xl p-6 text-white shadow-lg animate-fadeInUp';
            
            // Jika ini adalah kartu pertama (Profit), buat agar melebar 2 kolom
            if (index === 0) {
                cardClasses += ' col-span-2'; // Tambahkan kelas col-span-2
            }
            cardElement.className = `${card.gradient} ${cardClasses}`;
            cardElement.style.animationDelay = `${index * 0.1}s`;
            
            cardElement.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div class="text-3xl">${card.icon}</div>
                    <div class="bg-white/20 rounded-full p-2 backdrop-blur-sm">
                        <div class="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                </div>
                <p class="text-white/90 text-sm font-medium mb-2">${card.label}</p>
                <p class="text-white text-xl font-bold leading-tight">${card.value}</p>
                ${card.link ? '<div class="mt-4 text-white/80 text-xs">👆 Ketuk untuk detail</div>' : ''}
            `;

            if (card.link) {
                cardElement.classList.add('cursor-pointer');
                cardElement.addEventListener('click', () => {
                    const bulan = filterBulan.value;
                    const tahun = filterTahun.value;
                    const destinationUrl = `${card.link}?bulan=${bulan}&tahun=${tahun}`;
                    window.location.href = destinationUrl;
                });
            }

            cardsContainer.appendChild(cardElement);
        });
    }

    // ===============================================
    // Mobile-Optimized Skeleton Loading Functions
    // ===============================================
    function showLoading() {
        cardsContainer.innerHTML = '';
        
        // Create 7 mobile-optimized skeleton cards
        for (let i = 0; i < 7; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'skeleton-card glass-card rounded-2xl p-4 min-h-[120px]';
            
            // First card (profit) full width
            if (i === 0) {
                skeletonCard.classList.add('col-span-2');
                skeletonCard.className += ' min-h-[100px]';
            }
            
            skeletonCard.innerHTML = `
                <div class="flex items-start justify-between mb-2">
                    <div class="skeleton-line w-6 h-6 rounded-full"></div>
                    <div class="skeleton-line w-4 h-4 rounded-full"></div>
                </div>
                <div class="flex-1">
                    <div class="skeleton-line h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
                    <div class="skeleton-line h-5 bg-gray-300 rounded w-3/4"></div>
                </div>
            `;
            cardsContainer.appendChild(skeletonCard);
        }
    }

    function hideLoading() {
        const skeletonCards = document.querySelectorAll('.skeleton-card');
        skeletonCards.forEach(card => card.remove());
    }
});
