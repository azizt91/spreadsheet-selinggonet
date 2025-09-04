// lunas.js (Versi Final dengan Pencarian, Pagination, dan Urutan Terbaru)

document.addEventListener('DOMContentLoaded', function() {
    // Logika session check & logout sudah dihandle oleh auth.js.

    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_URL = `${window.AppConfig.API_BASE_URL}?action=getLunas`;
    let allLunasData = [];
    let filteredData = [];
    let currentPage = 1;
    let rowsPerPage = 10;

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const tableBody = document.getElementById('lunas-body');
    const searchInput = document.getElementById('search-input');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationInfo = document.getElementById('pagination-info');
    const rowsPerPageSelector = document.getElementById('rows-per-page');

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showLoading(text = 'Fetching data, please wait...') {
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
    initializeEventListeners();
    fetchLunas();

    // ===============================================
    // Color Assignment for Billing Periods
    // ===============================================
    function getPeriodColorClass(periode) {
        if (!periode || typeof periode !== 'string') return 'default';
        
        const periodeText = periode.toLowerCase().trim();
        
        // Map Indonesian month names to color classes
        const monthColorMap = {
            'januari': 'januari',
            'februari': 'februari', 
            'maret': 'maret',
            'april': 'april',
            'mei': 'mei',
            'juni': 'juni',
            'juli': 'juli',
            'agustus': 'agustus',
            'september': 'september',
            'oktober': 'oktober',
            'november': 'november',
            'desember': 'desember'
        };
        
        // Find the month in the period string
        for (const [month, colorClass] of Object.entries(monthColorMap)) {
            if (periodeText.includes(month)) {
                return colorClass;
            }
        }
        
        return 'default'; // fallback color
    }

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            filteredData = allLunasData.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchTerm)
                )
            );
            currentPage = 1;
            renderPage();
        });

        rowsPerPageSelector.addEventListener('change', () => {
            rowsPerPage = parseInt(rowsPerPageSelector.value, 10);
            currentPage = 1;
            renderPage();
        });
    }

    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
// async function fetchLunas() {
//     showLoading('Memuat data riwayat lunas, harap tunggu...');
    
//     try {
//         const response = await fetch(API_URL); // API_URL sudah dikonfigurasi dengan benar
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         const responseData = await response.json();

//         // 1. Pengecekan keamanan untuk memastikan data adalah array
//         if (!Array.isArray(responseData)) {
//             if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
//             throw new TypeError('Format data yang diterima dari server salah.');
//         }
        
//         // --- PERBAIKAN UTAMA DI SINI ---
//         // Ganti .reverse() dengan .sort() untuk pengurutan yang andal
//         // Ini akan mengurutkan data berdasarkan rowNumber dari yang terbesar ke terkecil.
//         allLunasData = responseData.sort((a, b) => b.rowNumber - a.rowNumber);
        
//         filteredData = [...allLunasData];
//         renderPage();

//     } catch (error) {
//         console.error('Error fetching data:', error);
//         // Menampilkan pesan error yang lebih jelas di dalam tabel
//         tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
//     } finally {
//         hideLoading();
//     }
// }

    //-----------------------fetch data-----------------------------------------------

    async function fetchLunas() {
        showLoading('Memuat data riwayat lunas, harap tunggu...');
        
        try {
            // 1. Baca parameter dari URL (tidak ada perubahan di sini)
            const urlParams = new URLSearchParams(window.location.search);
            const filterBulan = urlParams.get('bulan');
            const filterTahun = urlParams.get('tahun');
            const isFilteringFromDashboard = filterBulan && filterTahun && filterBulan !== 'semua';
            
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();
    
            if (!Array.isArray(responseData)) {
                if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
                throw new TypeError('Format data yang diterima dari server salah.');
            }
            
            // Mengurutkan data terbaru di paling atas
            let rawData = responseData.sort((a, b) => b.rowNumber - a.rowNumber);
            
            // 2. Terapkan filter jika ada parameter dari dashboard
            if (isFilteringFromDashboard) {
                const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const filterBulanNama = namaBulan[parseInt(filterBulan, 10)];
                const targetPeriode = `${filterBulanNama} ${filterTahun}`;
    
                // --- INI ADALAH PERBAIKAN UTAMANYA ---
                allLunasData = rawData.filter(row => {
                    // Membersihkan nilai 'PERIODE TAGIHAN' dari tanda kutip tunggal di awal sebelum membandingkan
                    const periodeData = (row['PERIODE TAGIHAN'] || '').trim().replace(/^'/, '');
                    return periodeData === targetPeriode;
                });
                // --- AKHIR DARI PERBAIKAN ---
    
                // Menonaktifkan search bar agar pengguna fokus pada data yang difilter
                searchInput.placeholder = `Menampilkan data untuk ${targetPeriode}`;
                searchInput.disabled = true;
            } else {
                allLunasData = rawData;
            }
    
            filteredData = [...allLunasData];
            renderPage();
    
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
        } finally {
            hideLoading();
        }
    }


    function renderPage() {
        renderTable();
        renderPagination();
    }

    function renderTable() {
        tableBody.innerHTML = '';
        if (filteredData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tidak ada riwayat lunas ditemukan.</td></tr>`;
            return;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        pageData.forEach(item => {
            const status = item.STATUS || 'N/A';
            const periode = item['PERIODE TAGIHAN'] || '';
            const colorClass = getPeriodColorClass(periode);

            const tanggalBayarFormatted = item['TANGGAL BAYAR']
                ? new Date(item['TANGGAL BAYAR']).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                : '-';
            
            const row = `
                <tr>
                    <td>${item.IDPL || ''}</td>
                    <td>${item.NAMA || ''}</td>
                    <td><span class="period-pill ${colorClass}">${periode}</span></td>
                    <td>${tanggalBayarFormatted}</td>
                    <td><span class="status-pill status-lunas">${status}</span></td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }

    // ===============================================
    // PAGINATION LOGIC
    // ===============================================
    function renderPagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        paginationControls.innerHTML = '';

        if (totalPages <= 1) {
            paginationInfo.textContent = `Menampilkan ${filteredData.length} dari ${filteredData.length} data`;
            return;
        }

        const createButton = (text, page, isDisabled = false, isActive = false) => {
            const button = document.createElement('button');
            button.innerHTML = text;
            button.disabled = isDisabled;
            if (isActive) button.classList.add('active');
            button.addEventListener('click', () => {
                currentPage = page;
                renderPage();
            });
            return button;
        };

        paginationControls.appendChild(createButton('&laquo;', currentPage - 1, currentPage === 1));

        const pagesToShow = [];
        const maxVisibleButtons = 7;
        if (totalPages <= maxVisibleButtons) {
            for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
        } else {
            pagesToShow.push(1);
            if (currentPage > 4) pagesToShow.push('...');
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pagesToShow.push(i);
            if (currentPage < totalPages - 3) pagesToShow.push('...');
            pagesToShow.push(totalPages);
        }

        pagesToShow.forEach(page => {
            if (page === '...') {
                const span = document.createElement('span');
                span.textContent = '...';
                span.style.margin = '0 10px';
                paginationControls.appendChild(span);
            } else {
                paginationControls.appendChild(createButton(page, page, false, page === currentPage));
            }
        });

        paginationControls.appendChild(createButton('&raquo;', currentPage + 1, currentPage === totalPages));

        const startItem = (currentPage - 1) * rowsPerPage + 1;
        const endItem = Math.min(startItem + rowsPerPage - 1, filteredData.length);
        paginationInfo.textContent = `Menampilkan ${startItem}-${endItem} dari ${filteredData.length} data`;
    }
});
