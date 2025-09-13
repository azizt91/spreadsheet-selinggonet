// tagihan.js (Versi Final dengan Pencarian & Pagination)

document.addEventListener('DOMContentLoaded', () => {
    // Logika session check & logout sudah dihandle oleh auth.js.

    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_TAGIHAN_URL = `${window.AppConfig.API_BASE_URL}?action=getTagihan`;
    const API_BAYAR_URL = window.AppConfig.API_BASE_URL;
    let allTagihanData = []; // Simpan semua data asli
    let filteredData = [];   // Data yang ditampilkan setelah filter
    let currentPage = 1;
    let rowsPerPage = 10;

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const tableBody = document.getElementById('tagihan-body');
    const searchInput = document.getElementById('search-input');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationInfo = document.getElementById('pagination-info');
    const rowsPerPageSelector = document.getElementById('rows-per-page');
    const createInvoicesBtn = document.getElementById('create-invoices-btn');
    
    // Payment Modal Elements
    const paymentModal = document.getElementById('payment-modal');
    const paymentCustomerName = document.getElementById('payment-customer-name');
    const paymentPeriod = document.getElementById('payment-period');
    const paymentAmount = document.getElementById('payment-amount');
    const paymentCancelBtn = document.getElementById('payment-cancel-btn');
    const paymentConfirmBtn = document.getElementById('payment-confirm-btn');
    
    let currentPaymentData = null; // Store current payment data
    
    // Debug: Check if modal elements exist
    console.log('Payment modal elements check:');
    console.log('paymentModal:', paymentModal);
    console.log('paymentConfirmBtn:', paymentConfirmBtn);

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
    fetchTagihan();

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
        // Event listener untuk input pencarian
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            filteredData = allTagihanData.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchTerm)
                )
            );
            currentPage = 1;
            renderPage();
        });

        // Event listener untuk dropdown jumlah baris
        rowsPerPageSelector.addEventListener('change', () => {
            rowsPerPage = parseInt(rowsPerPageSelector.value, 10);
            currentPage = 1;
            renderPage();
        });

        // Event listener untuk tombol LUNAS dan WhatsApp
        tableBody.addEventListener('click', handleButtonClick);

        // Listener untuk tombol "Buat Tagihan" <-- PENAMBAHAN DI SINI
        if (createInvoicesBtn) {
            createInvoicesBtn.addEventListener('click', handleCreateInvoices);
        }
        
        // Payment modal event listeners
        if (paymentCancelBtn) {
            paymentCancelBtn.addEventListener('click', closePaymentModal);
        }
        if (paymentConfirmBtn) {
            paymentConfirmBtn.addEventListener('click', processPayment);
        }
        
        // Close modal when clicking outside
        if (paymentModal) {
            paymentModal.addEventListener('click', (event) => {
                if (event.target === paymentModal) {
                    closePaymentModal();
                }
            });
        }
    }


    // ===============================================
    // FUNGSI BARU: Handle Pembuatan Tagihan
    // ===============================================
    async function handleCreateInvoices() {
        const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' });
        if (!confirm(`Apakah Anda yakin ingin membuat tagihan untuk bulan ${currentMonthName}? Proses ini akan dijalankan untuk semua pelanggan aktif yang belum memiliki tagihan bulan ini.`)) {
            return;
        }
    
        showLoading('Membuat tagihan bulanan, ini mungkin memerlukan beberapa saat...');
    
        try {
            const response = await fetch(API_ACTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'createInvoices'
                })
            });
            const result = await response.json();
    
            hideLoading();
    
            if (result.error) {
                throw new Error(result.error);
            }
    
            alert(result.message);
            fetchTagihan(); // Muat ulang data untuk menampilkan tagihan baru
        } catch (error) {
            hideLoading();
            console.error('Error creating invoices:', error);
            alert(`Gagal membuat tagihan: ${error.message}`);
        }
    }
    
    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
    // async function fetchTagihan() {
    //     showLoading('Memuat data tagihan, harap tunggu...');
        
    //     try {
    //         const response = await fetch(API_TAGIHAN_URL); // API_TAGIHAN_URL sudah benar
    //         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    //         const responseData = await response.json();

    //         // --- PERBAIKAN UTAMA: Penanganan Error ---
    //         if (!Array.isArray(responseData)) {
    //             if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
    //             throw new TypeError('Format data yang diterima dari server salah.');
    //         }
            
    //         allTagihanData = responseData.filter(item => {
    //             return item.IDPL && item.IDPL.trim() !== '' && 
    //                 item.NAMA && item.NAMA.trim() !== '' &&
    //                 item.IDPL !== 'N/A' && item.NAMA !== 'N/A';
    //         });
            
    //         filteredData = [...allTagihanData];
    //         renderPage();
    //     } catch (error) {
    //         console.error('Error fetching data:', error);
    //         tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
    //     } finally {
    //         hideLoading();
    //     }
    // }

    //----------------------fetch tagihan---------------------------

    // tagihan.js

async function fetchTagihan() {
    showLoading('Memuat data, harap tunggu...');
    
    try {
        // --- PERUBAHAN DIMULAI DI SINI ---
        // 1. Baca parameter dari URL
        const urlParams = new URLSearchParams(window.location.search);
        const filterBulan = urlParams.get('bulan'); // akan berisi 'semua' atau angka '1'-'12'
        const filterTahun = urlParams.get('tahun');
        const isFilteringFromDashboard = filterBulan && filterTahun && filterBulan !== 'semua';

        const response = await fetch(API_TAGIHAN_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();

        if (!Array.isArray(responseData)) {
            if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
            throw new TypeError('Format data yang diterima dari server salah.');
        }
        
        let rawData = responseData.filter(item => {
            return item.IDPL && item.IDPL.trim() !== '' && 
                item.NAMA && item.NAMA.trim() !== '' &&
                item.IDPL !== 'N/A' && item.NAMA !== 'N/A';
        });

        // 2. Terapkan filter jika ada parameter dari dashboard
        if (isFilteringFromDashboard) {
            const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const filterBulanNama = namaBulan[parseInt(filterBulan, 10)];
            const targetPeriode = `${filterBulanNama} ${filterTahun}`;
            
            allTagihanData = rawData.filter(row => (row['PERIODE TAGIHAN'] || '').trim() === targetPeriode);
            
            // Menonaktifkan search bar karena tampilan sudah spesifik
            searchInput.placeholder = `${targetPeriode}`;
            searchInput.disabled = true;
        } else {
            allTagihanData = rawData;
        }
        // --- PERUBAHAN SELESAI ---
        
        filteredData = [...allTagihanData];
        renderPage();
    } catch (error) {
        console.error('Error fetching data:', error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
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
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tidak ada tagihan ditemukan.</td></tr>`;
            return;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        pageData.forEach(item => {
            const status = item.STATUS || 'N/A';
            const periode = item['PERIODE TAGIHAN'] || '';
            const colorClass = getPeriodColorClass(periode);
            
            const row = `
                <tr>
                    <td>${item.IDPL || ''}</td>
                    <td>${item.NAMA || ''}</td>
                    <td><span class="period-pill ${colorClass}">${periode}</span></td>
                    <td>${item.TAGIHAN || ''}</td>
                    <td><span class="status-pill status-belum-lunas">${status}</span></td>
                    <td>
                        <button class="btn action-btn btn-success pay-btn" data-row-number="${item.rowNumber}">LUNAS</button>
                        <button class="btn action-btn btn-whatsapp wa-btn" data-row-number="${item.rowNumber}">
                            <i class="fab fa-whatsapp"></i> WA
                        </button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        paginationControls.innerHTML = '';

        if (totalPages <= 1) {
            paginationInfo.textContent = `Menampilkan ${filteredData.length} dari ${filteredData.length} data`;
            return;
        }

        // Previous Button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&laquo;';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });
        paginationControls.appendChild(prevButton);

        // Page Number Buttons (LOGIKA BARU)
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderPage();
            });
            paginationControls.appendChild(pageButton);
        }

        // Next Button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
            }
        });
        paginationControls.appendChild(nextButton);

        const startItem = (currentPage - 1) * rowsPerPage + 1;
        const endItem = Math.min(startItem + rowsPerPage - 1, filteredData.length);
        paginationInfo.textContent = `Menampilkan ${startItem}-${endItem} dari ${filteredData.length} data`;
    }

    // ===============================================
    // Loading Management
    // ===============================================
    function showLoading(text = 'Memproses data...') {
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
    // Payment Modal Functions
    // ===============================================
    function showPaymentModal(rowData) {
        currentPaymentData = rowData;
        
        // Populate modal with payment data
        paymentCustomerName.textContent = rowData.NAMA || 'N/A';
        
        // Display period with colored pill
        const periode = rowData['PERIODE TAGIHAN'] || 'N/A';
        const colorClass = getPeriodColorClass(periode);
        paymentPeriod.innerHTML = `<span class="period-pill ${colorClass}">${periode}</span>`;
        
        paymentAmount.textContent = rowData.TAGIHAN || 'N/A';
        
        // Show modal
        paymentModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    function closePaymentModal() {
        paymentModal.classList.remove('show');
        document.body.style.overflow = 'auto'; // Restore scrolling
        currentPaymentData = null;
    }
    
    async function processPayment() {
        if (!currentPaymentData) return;
        
        const rowNumber = currentPaymentData.rowNumber;
        const rowData = currentPaymentData;
        
        // Show loading overlay
        showLoading('Memproses pembayaran...');
        
        try {
            // Disable button to prevent double-click
            paymentConfirmBtn.disabled = true;
            paymentConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
            
            const response = await fetch(API_BAYAR_URL, { 
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'bayar',
                    rowNumber: rowNumber,
                    rowData: rowData
                })
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message);
            
            // Hide loading before closing modal and showing notification
            hideLoading();
            
            // Close modal and show success
            closePaymentModal();
            showSuccessNotification(result.message);
            fetchTagihan(); // Reload table
            
        } catch (error) {
            console.error('Error processing payment:', error);
            // Hide loading before showing error
            hideLoading();
            showErrorNotification(`Error: ${error.message}`);
        } finally {
            // Re-enable button
            paymentConfirmBtn.disabled = false;
            paymentConfirmBtn.innerHTML = '<i class="fas fa-check"></i> Proses Pembayaran';
        }
    }

    // ===============================================
    // Action Handler
    // ===============================================
    async function handleButtonClick(event) {
        const button = event.target.closest('button');
        if (!button) return;
        
        const rowNumber = button.dataset.rowNumber;
        const rowData = allTagihanData.find(item => item.rowNumber == rowNumber);
        
        if (button.classList.contains('pay-btn')) {
            console.log('Payment button clicked!'); // Debug
            console.log('rowData:', rowData); // Debug
            console.log('paymentModal exists:', !!paymentModal); // Debug
            
            if (rowData) {
                if (paymentModal) {
                    console.log('Showing payment modal'); // Debug
                    showPaymentModal(rowData);
                } else {
                    console.error('Payment modal not found! Using fallback confirm.');
                    // Fallback to browser confirm if modal not found
                    if (confirm(`Proses pembayaran untuk ${rowData.NAMA} (${rowData['PERIODE TAGIHAN']})?`)) {
                        processPaymentDirect(rowNumber, rowData);
                    }
                }
            }
        } else if (button.classList.contains('wa-btn')) {
            console.log('WhatsApp button clicked!'); // Debug
            if (rowData) {
                sendWhatsAppMessage(rowData);
            }
        }
    }
    
    // ===============================================
    // Notification Functions
    // ===============================================
    function showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1002;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            animation: slideInRight 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.parentNode.removeChild(notification), 300);
            }
        }, 3000);
    }
    
    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1002;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
            animation: slideInRight 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.parentNode.removeChild(notification), 300);
            }
        }, 4000);
    }
    
    // Fallback function for direct payment processing
    async function processPaymentDirect(rowNumber, rowData) {
        // Show loading overlay
        showLoading('Memproses pembayaran...');
        
        try {
            const response = await fetch(API_BAYAR_URL, { 
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'bayar',
                    rowNumber: rowNumber,
                    rowData: rowData
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            // Hide loading before showing success dialog
            hideLoading();
            
            alert(result.message);
            fetchTagihan(); // Reload table
        } catch (error) {
            console.error('Error processing payment:', error);
            // Hide loading before showing error
            hideLoading();
            alert(`Error: ${error.message}`);
        }
    }
    
    // ===============================================
    // WhatsApp Message Function
    // ===============================================
    function sendWhatsAppMessage(rowData) {
        const customerName = rowData.NAMA || 'Pelanggan';
        const customerId = rowData.IDPL || '';
        const whatsappNumber = rowData.WHATSAPP || '';
        const billAmount = rowData.TAGIHAN || '';
        const billPeriod = rowData['PERIODE TAGIHAN'] || '';
        
        // Validate WhatsApp number
        if (!whatsappNumber) {
            alert('Nomor WhatsApp pelanggan tidak tersedia!');
            return;
        }
        
        // Generate the message
        const message = `Informasi Tagihan WiFi Anda

Hai Bapak/Ibu ${customerName},
ID Pelanggan: ${customerId}

Informasi tagihan Bapak/Ibu bulan ini adalah:
Jumlah Tagihan: ${billAmount}
Periode Tagihan: ${billPeriod}

Bayar tagihan Anda di salah satu rekening di bawah ini:
• Seabank 901307925714 An. TAUFIQ AZIZ
• BCA 3621053653 An. TAUFIQ AZIZ
• BSI 7211806138 An. TAUFIQ AZIZ
• Dana 089609497390 An. TAUFIQ AZIZ

Terima kasih atas kepercayaan Anda menggunakan layanan kami.
_____________________________
*Ini adalah pesan otomatis. Jika telah membayar tagihan, abaikan pesan ini.`;
        
        // Clean phone number (remove non-numeric characters except +)
        // let cleanedNumber = whatsappNumber.replace(/[^0-9+]/g, '');
        let cleanedNumber = String(whatsappNumber).replace(/[^0-9+]/g, '');
        
        // Add country code if not present
        if (!cleanedNumber.startsWith('+') && !cleanedNumber.startsWith('62')) {
            if (cleanedNumber.startsWith('0')) {
                cleanedNumber = '62' + cleanedNumber.substring(1);
            } else {
                cleanedNumber = '62' + cleanedNumber;
            }
        }
        
        // Encode message for URL
        const encodedMessage = encodeURIComponent(message);
        
        // Generate WhatsApp URL
        const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
        
        // Open WhatsApp in new tab
        window.open(whatsappUrl, '_blank');
        
        // Show success notification
        showSuccessNotification(`Pesan WhatsApp untuk ${customerName} telah dibuka!`);
    }
});
