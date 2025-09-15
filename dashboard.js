document.addEventListener('DOMContentLoaded', function() {
    // DOM Selectors
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const cardsContainer = document.getElementById('cards-container');

    // ===============================================
    // Initial Setup
    // ===============================================
    populateFilters();
    initializeEventListeners();
    fetchDashboardStats();

    // --- Fungsi untuk mengisi filter bulan dan tahun ---
    function populateFilters() {
        const namaBulan = ["Semua Bulan", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const sekarang = new Date();
        const bulanIni = sekarang.getMonth() + 1;
        const tahunIni = sekarang.getFullYear();

        namaBulan.forEach((bulan, index) => {
            const option = document.createElement('option');
            option.value = index === 0 ? 'semua' : index;
            option.textContent = bulan;
            if (index === bulanIni) {
                option.selected = true;
            }
            filterBulan.appendChild(option);
        });

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
        
        showLoading();
        
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getDashboardStats&bulan=${bulan}&tahun=${tahun}`);
            if (!response.ok) throw new Error('Gagal mengambil data statistik');
            
            const stats = await response.json();
            if (stats.error) throw new Error(stats.error);

            displayStats(stats);
        } catch (error) {
            console.error('Error:', error);
            cardsContainer.innerHTML = `<p class="text-center text-red-500 col-span-2">Gagal memuat data: ${error.message}</p>`;
        }
    }

    // --- (PERBAIKAN) Fungsi untuk menampilkan statistik dengan desain baru ---
    function displayStats(stats) {
        cardsContainer.innerHTML = ''; // Mengosongkan kartu

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });
        
        const profitValue = stats.profit || 0;
        const isProfit = profitValue >= 0;
        
        // Objek data kartu dengan properti desain baru
        const statsCards = [
            // Kartu Profit dibuat menonjol (full-width)
            { 
                label: 'Profit', 
                value: formatter.format(profitValue), 
                colorClass: isProfit ? 'text-green-600' : 'text-red-600',
                bgClass: isProfit ? 'bg-green-50' : 'bg-red-50',
                span: 'col-span-2' // Mengambil 2 kolom
            },
            // Kartu finansial lainnya
            { label: 'Total Revenue', value: formatter.format(stats.totalRevenue || 0) },
            { label: 'Total Expenses', value: formatter.format(stats.totalExpenses || 0) },
            // Kartu statistik pelanggan
            { label: 'Active Customers', value: stats.activeCustomers || 0 },
            { label: 'Inactive Customers', value: stats.inactiveCustomers || 0 },
            // Kartu tagihan
            { label: 'Unpaid Invoices', value: stats.totalUnpaid || 0, link: 'tagihan.html' },
            { label: 'Paid Invoices', value: stats.totalPaid || 0, link: 'lunas.html' }
        ];

        statsCards.forEach(card => {
            const cardElement = document.createElement('div');
            
            // Tentukan kelas dasar dan tambahan
            const baseClass = 'flex flex-col gap-2 rounded-lg p-4 border border-[#d6d1e6]';
            const spanClass = card.span || ''; // defaultnya 1 kolom
            const bgClass = card.bgClass || 'bg-white'; // defaultnya putih
            
            cardElement.className = `${baseClass} ${spanClass} ${bgClass}`;
            
            cardElement.innerHTML = `
                <p class="text-[#625095] text-sm font-medium leading-normal">${card.label}</p>
                <p class="text-[#110e1b] text-2xl font-bold leading-tight ${card.colorClass || ''}">${card.value}</p>
            `;

            // Tambahkan fungsionalitas klik jika ada link
            if (card.link) {
                cardElement.classList.add('cursor-pointer', 'hover:bg-gray-100');
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

    // --- Skeleton Loading Functions ---
    function showLoading() {
        cardsContainer.innerHTML = '';
        
        // Buat 1 skeleton besar dan 6 skeleton kecil
        const skeletonLayout = ['col-span-2', '', '', '', '', '', ''];
        
        skeletonLayout.forEach(span => {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = `skeleton-card flex flex-col gap-2 rounded-lg p-4 bg-gray-100 ${span}`;
            skeletonCard.innerHTML = `
                <div class="skeleton-line h-4 bg-gray-200 rounded w-1/2"></div>
                <div class="skeleton-line h-8 bg-gray-200 rounded w-3/4 mt-1"></div>
            `;
            cardsContainer.appendChild(skeletonCard);
        });
        
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                @keyframes skeleton-loading {
                    0% { background-position: -200px 0; }
                    100% { background-position: calc(200px + 100%) 0; }
                }
                .skeleton-line {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200px 100%;
                    animation: skeleton-loading 1.5s infinite;
                }
            `;
            document.head.appendChild(style);
        }
    }
});
