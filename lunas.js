// lunas.js (Versi Perbaikan untuk UI Mobile)
document.addEventListener('DOMContentLoaded', () => {
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_LUNAS_URL = `${window.AppConfig.API_BASE_URL}?action=getLunas`;
    let paidData = []; // Hanya butuh data lunas

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const invoiceList = document.getElementById('invoice-list');
    const searchInput = document.getElementById('search-input');
    const unpaidTab = document.getElementById('unpaid-tab');

    // ===============================================
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    fetchPaidData();

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderList);
        
        // Tombol tab "Unpaid" sekarang hanya berfungsi sebagai link ke tagihan.html
        unpaidTab.addEventListener('click', () => {
            window.location.href = 'tagihan.html';
        });
    }

    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
    async function fetchPaidData() {
        showLoading();
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const filterBulan = urlParams.get('bulan');
            const filterTahun = urlParams.get('tahun');
            const isFiltering = filterBulan && filterTahun && filterBulan !== 'semua';

            const response = await fetch(API_LUNAS_URL);
            if (!response.ok) throw new Error('Gagal mengambil data dari server');
            
            let rawData = await response.json();
            if (!Array.isArray(rawData)) throw new TypeError('Format data tidak valid');

            // Filter data jika ada parameter dari URL
            if (isFiltering) {
                const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const filterBulanNama = namaBulan[parseInt(filterBulan, 10)];
                const targetPeriode = `${filterBulanNama} ${filterTahun}`;

                paidData = rawData.filter(row => (row['PERIODE TAGIHAN'] || '').trim().replace(/^'/, '') === targetPeriode);
                
                searchInput.placeholder = `Disaring: ${targetPeriode}`;
                searchInput.disabled = true;
            } else {
                paidData = rawData;
            }

            // Urutkan data berdasarkan tanggal bayar (terbaru dulu)
            paidData.sort((a, b) => new Date(b['TANGGAL BAYAR'] || 0) - new Date(a['TANGGAL BAYAR'] || 0));

            renderList();
            
        } catch (error) {
            console.error('Error fetching data:', error);
            invoiceList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }

    function renderList() {
        invoiceList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredData = paidData.filter(item =>
            (item.NAMA && item.NAMA.toLowerCase().includes(searchTerm)) ||
            (item['PERIODE TAGIHAN'] && item['PERIODE TAGIHAN'].toLowerCase().includes(searchTerm))
        );

        if (filteredData.length === 0) {
            invoiceList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada riwayat lunas ditemukan.</p>`;
            return;
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        filteredData.forEach(item => {
            const amount = item.TAGIHAN ? formatter.format(String(item.TAGIHAN).replace(/[^0-9]/g, '')) : 'N/A';
            const period = item['PERIODE TAGIHAN'] || 'Periode tidak tersedia';
            const customerName = item.NAMA || 'Nama tidak tersedia';
            const paymentDate = item['TANGGAL BAYAR'] ? new Date(item['TANGGAL BAYAR']).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
            
            const invoiceDiv = document.createElement('div');
            invoiceDiv.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            
            invoiceDiv.innerHTML = `
                <div class="flex flex-col justify-center">
                    <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
                    <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${period} <span class="text-gray-400">- ${paymentDate}</span></p>
                </div>
                <div class="shrink-0">
                    <p class="text-green-600 text-base font-medium leading-normal">${amount}</p>
                </div>
            `;
            
            invoiceList.appendChild(invoiceDiv);
        });
    }

    // ===============================================
    // Skeleton Loading Functions
    // ===============================================
    function showLoading() {
        invoiceList.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="flex flex-col justify-center flex-1 gap-2">
                    <div style="height: 1rem; background-color: #e0e0e0; border-radius: 4px; width: 75%; animation: skeleton-loading 1.5s infinite;"></div>
                    <div style="height: 0.75rem; background-color: #e0e0e0; border-radius: 4px; width: 50%; animation: skeleton-loading 1.5s infinite;"></div>
                </div>
                <div class="shrink-0" style="height: 1rem; background-color: #e0e0e0; border-radius: 4px; width: 25%; animation: skeleton-loading 1.5s infinite;"></div>
            `;
            invoiceList.appendChild(skeletonItem);
        }
        
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `@keyframes skeleton-loading { 0% { background-color: #e0e0e0; } 50% { background-color: #f0f0f0; } 100% { background-color: #e0e0e0; } }`;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        const skeletonItems = invoiceList.querySelectorAll('div > div[style*="animation"]');
        if(skeletonItems.length > 0) {
           invoiceList.innerHTML = '';
        }
    }
});