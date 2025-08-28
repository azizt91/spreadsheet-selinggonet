// pelanggan_riwayat_lunas.js - Customer Payment History with Filtering

document.addEventListener('DOMContentLoaded', function() {
    // Check session and get user data
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const userLevel = sessionStorage.getItem('userLevel');
    const userIdpl = sessionStorage.getItem('userIdpl');

    // Redirect if not logged in or not a customer
    if (!loggedInUser || userLevel !== 'USER' || !userIdpl) {
        alert('Akses tidak valid. Silakan login sebagai pelanggan.');
        window.location.href = 'index.html';
        return;
    }

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
    function showLoading(text = 'Memuat riwayat pembayaran Anda...') {
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
    fetchCustomerPaymentHistory();

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
    // Currency Formatting
    // ===============================================
    function formatCurrency(amount) {
        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });
        return formatter.format(parseFloat(amount || 0));
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
    async function fetchCustomerPaymentHistory() {
        showLoading('Memuat riwayat pembayaran Anda...');
        
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();

            // Check if data is array
            if (!Array.isArray(responseData)) {
                if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
                throw new TypeError('Format data yang diterima dari server salah.');
            }
            
            // Filter data for current customer only
            const customerData = responseData.filter(item => item.IDPL === userIdpl);
            
            // Sort by rowNumber descending (newest first)
            allLunasData = customerData.sort((a, b) => b.rowNumber - a.rowNumber);
            
            filteredData = [...allLunasData];
            renderPage();

        } catch (error) {
            console.error('Error fetching data:', error);
            // Display error message in table
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
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
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Tidak ada riwayat pembayaran ditemukan.</td></tr>`;
            return;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        pageData.forEach(item => {
            const status = item.STATUS || 'LUNAS';
            const periode = item['PERIODE TAGIHAN'] || '';
            const colorClass = getPeriodColorClass(periode);
            const amount = formatCurrency(item.TAGIHAN || 0);

            const tanggalBayarFormatted = item['TANGGAL BAYAR']
                ? new Date(item['TANGGAL BAYAR']).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                : '-';
            
            const row = `
                <tr>
                    <td><span class="period-pill ${colorClass}">${periode}</span></td>
                    <td><strong style="color: #28a745;">${amount}</strong></td>
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
            paginationInfo.textContent = `Menampilkan ${filteredData.length} dari ${filteredData.length} pembayaran`;
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

        // Previous button
        paginationControls.appendChild(
            createButton('<i class="fas fa-chevron-left"></i>', currentPage - 1, currentPage === 1)
        );

        // Calculate visible page range
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page + ellipsis
        if (startPage > 1) {
            paginationControls.appendChild(createButton('1', 1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.innerHTML = '...';
                ellipsis.className = 'pagination-ellipsis';
                paginationControls.appendChild(ellipsis);
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationControls.appendChild(createButton(i.toString(), i, false, i === currentPage));
        }

        // Ellipsis + last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.innerHTML = '...';
                ellipsis.className = 'pagination-ellipsis';
                paginationControls.appendChild(ellipsis);
            }
            paginationControls.appendChild(createButton(totalPages.toString(), totalPages));
        }

        // Next button
        paginationControls.appendChild(
            createButton('<i class="fas fa-chevron-right"></i>', currentPage + 1, currentPage === totalPages)
        );

        // Update pagination info
        const startItem = (currentPage - 1) * rowsPerPage + 1;
        const endItem = Math.min(currentPage * rowsPerPage, filteredData.length);
        paginationInfo.textContent = `Menampilkan ${startItem}-${endItem} dari ${filteredData.length} pembayaran`;
    }
});
