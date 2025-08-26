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
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    fetchLunas();

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
    async function fetchLunas() {
        try {
            const response = await fetch(API_URL); // API_URL sudah benar
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const responseData = await response.json();

            // --- PERBAIKAN UTAMA: Penanganan Error ---
            if (!Array.isArray(responseData)) {
                if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
                throw new TypeError('Format data yang diterima dari server salah.');
            }
            
            allLunasData = responseData.reverse(); 
            filteredData = [...allLunasData];
            renderPage();
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
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
            const row = `
                <tr>
                    <td>${item.IDPL || ''}</td>
                    <td>${item.NAMA || ''}</td>
                    <td>${item['PERIODE TAGIHAN'] || ''}</td>
                    <td>${item['TANGGAL BAYAR'] || ''}</td>
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
