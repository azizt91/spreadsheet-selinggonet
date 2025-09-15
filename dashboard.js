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
            cardsContainer.innerHTML = `<p class="text-center text-red-500 col-span-2">Gagal memuat data: ${error.message}</p>`;
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
        cardsContainer.innerHTML = ''; // Clear previous cards

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        const statsCards = [
            { label: 'Profit', value: formatter.format(stats.profit || 0), bg: 'bg-[#eae8f3]' },
            { label: 'Total Revenue', value: formatter.format(stats.totalRevenue || 0), bg: 'bg-[#eae8f3]' },
            { label: 'Total Expenses', value: formatter.format(stats.totalExpenses || 0), bg: 'bg-[#eae8f3]' },
            { label: 'Active Customers', value: stats.activeCustomers || 0, bg: 'border border-[#d6d1e6]' },
            { label: 'Inactive Customers', value: stats.inactiveCustomers || 0, bg: 'border border-[#d6d1e6]' },
            { label: 'Unpaid Invoices', value: stats.totalUnpaid || 0, bg: 'border border-[#d6d1e6]', link: 'tagihan.html' },
            { label: 'Paid Invoices', value: stats.totalPaid || 0, bg: 'border border-[#d6d1e6]', link: 'lunas.html' }
        ];

        statsCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg p-6 ${card.bg}`;
            
            cardElement.innerHTML = `
                <p class="text-[#110e1b] text-base font-medium leading-normal">${card.label}</p>
                <p class="text-[#110e1b] tracking-light text-2xl font-bold leading-tight">${card.value}</p>
            `;

            if (card.link) {
                cardElement.classList.add('cursor-pointer', 'hover:bg-gray-200');
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
    // Skeleton Loading Functions
    // ===============================================
    function showLoading() {
        // Clear existing content and show skeleton cards
        cardsContainer.innerHTML = '';
        
        // Create 7 skeleton cards (matching the number of actual stats cards)
        for (let i = 0; i < 7; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'skeleton-card flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg p-6 bg-[#eae8f3]';
            skeletonCard.innerHTML = `
                <div class="skeleton-line h-4 bg-gray-300 rounded w-3/4"></div>
                <div class="skeleton-line h-8 bg-gray-300 rounded w-1/2 mt-2"></div>
            `;
            cardsContainer.appendChild(skeletonCard);
        }
        
        // Add skeleton animation styles if not exists
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                @keyframes skeleton-loading {
                    0% {
                        background-position: -200px 0;
                    }
                    100% {
                        background-position: calc(200px + 100%) 0;
                    }
                }
                
                .skeleton-line {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200px 100%;
                    animation: skeleton-loading 1.5s infinite;
                }
                
                .skeleton-card {
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        // Remove skeleton cards when done
        const skeletonCards = document.querySelectorAll('.skeleton-card');
        skeletonCards.forEach(card => card.remove());
    }
});
