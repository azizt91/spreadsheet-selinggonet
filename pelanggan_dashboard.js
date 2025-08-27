// pelanggan_dashboard.js - Customer Dashboard with 4 Cards and Loading Indicators

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

    // DOM Elements
    const namaPelangganElement = document.getElementById('nama-pelanggan');
    const welcomeSuffixElement = document.getElementById('welcome-suffix');
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
    // Data Fetching Functions
    // ===============================================
    async function fetchCustomerData() {
        showLoading('Memuat data dasboard Anda...');
        
        try {
            // Fetch customer profile data
            const pelangganResponse = await fetch(`${window.AppConfig.API_BASE_URL}?action=getPelanggan`);
            if (!pelangganResponse.ok) throw new Error('Gagal mengambil data pelanggan');
            const pelangganData = await pelangganResponse.json();
            
            // Find current customer data
            const customerProfile = pelangganData.find(customer => customer.IDPL === userIdpl);
            if (!customerProfile) {
                throw new Error('Data pelanggan tidak ditemukan');
            }

            // Fetch unpaid bills
            const tagihanResponse = await fetch(`${window.AppConfig.API_BASE_URL}?action=getTagihan`);
            if (!tagihanResponse.ok) throw new Error('Gagal mengambil data tagihan');
            const tagihanData = await tagihanResponse.json();
            
            // Filter bills for current customer
            const customerUnpaidBills = tagihanData.filter(bill => bill.IDPL === userIdpl);

            // Fetch paid bills
            const lunasResponse = await fetch(`${window.AppConfig.API_BASE_URL}?action=getLunas`);
            if (!lunasResponse.ok) throw new Error('Gagal mengambil data lunas');
            const lunasData = await lunasResponse.json();
            
            // Filter paid bills for current customer
            const customerPaidBills = lunasData.filter(bill => bill.IDPL === userIdpl);

            // Display data
            displayCustomerDashboard(customerProfile, customerUnpaidBills, customerPaidBills);

        } catch (error) {
            console.error('Error:', error);
            // Show error in welcome message
            namaPelangganElement.textContent = 'Pelanggan';
            welcomeSuffixElement.style.display = 'inline';
            cardsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Gagal memuat data: ${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Coba Lagi</button>
                </div>
            `;
        } finally {
            hideLoading();
        }
    }

    // ===============================================
    // Display Functions
    // ===============================================
    function displayCustomerDashboard(profile, unpaidBills, paidBills) {
        // Update welcome message
        namaPelangganElement.textContent = profile.NAMA || 'Pelanggan';
        welcomeSuffixElement.style.display = 'inline'; // Show the exclamation mark

        // Clear cards container
        cardsContainer.innerHTML = '';

        // Calculate totals
        const totalUnpaidAmount = unpaidBills.reduce((sum, bill) => {
            const amount = parseFloat(bill.TAGIHAN || 0);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        const totalPaidAmount = paidBills.reduce((sum, bill) => {
            const amount = parseFloat(bill.TAGIHAN || 0);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        // Format currency
        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        // Format installation date
        const installDate = profile['TANGGAL PASANG'] ? 
            formatDate(profile['TANGGAL PASANG']) : 'Tidak tersedia';

        // Create unpaid bills list for first card
        let unpaidBillsList = '';
        if (unpaidBills.length > 0) {
            unpaidBillsList = unpaidBills.map(bill => 
                `<div class="bill-item">
                    <span class="period">${bill['PERIODE TAGIHAN'] || 'N/A'}</span>
                    <span class="amount">${formatter.format(parseFloat(bill.TAGIHAN || 0))}</span>
                </div>`
            ).join('');
        } else {
            unpaidBillsList = '<div class="no-bills"><i class="fas fa-check-circle"></i> Tidak ada tagihan belum lunas</div>';
        }

        // Define cards data
        const cards = [
            {
                icon: 'fas fa-exclamation-triangle',
                title: 'Tagihan Belum Lunas',
                content: `
                    <div class="bills-list">${unpaidBillsList}</div>
                `,
                color: '#ffc107',
                class: 'unpaid-bills-card'
            },
            {
                icon: 'fas fa-calendar-check',
                title: 'Berlangganan Sejak',
                content: `
                    <div class="subscription-info">
                        <div class="install-date">${installDate}</div>
                        <div class="package-info">
                            <small>Paket: ${profile.PAKET || 'N/A'}</small>
                        </div>
                    </div>
                `,
                color: '#20b2aa',
                class: 'subscription-card'
            },
            {
                icon: 'fas fa-money-bill-wave',
                title: 'Total Tagihan Belum Dibayar',
                content: `
                    <div class="amount-display">
                        <div class="main-count">${unpaidBills.length}</div>
                        <div class="bill-count">tagihan</div>
                    </div>
                `,
                color: '#ff6347',
                class: 'unpaid-amount-card'
            },
            {
                icon: 'fas fa-check-circle',
                title: 'Total Tagihan Lunas',
                content: `
                    <div class="amount-display">
                        <div class="main-count">${paidBills.length}</div>
                        <div class="bill-count">pembayaran</div>
                    </div>
                `,
                color: '#32cd32',
                class: 'paid-amount-card'
            }
        ];

        // Create and append cards
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `card customer-card ${card.class}`;
            cardElement.innerHTML = `
                <div class="card-header">
                    <div class="card-icon" style="background-color: ${card.color}20; color: ${card.color};">
                        <i class="${card.icon}"></i>
                    </div>
                    <h3 class="card-title">${card.title}</h3>
                </div>
                <div class="card-content">
                    ${card.content}
                </div>
            `;
            cardsContainer.appendChild(cardElement);
        });
    }

    // ===============================================
    // Utility Functions
    // ===============================================
    function formatDate(dateString) {
        if (!dateString) return 'Tidak tersedia';
        
        try {
            // Handle various date formats
            let date;
            if (dateString instanceof Date) {
                date = dateString;
            } else if (typeof dateString === 'string') {
                // Try to parse the date string
                date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    // If invalid, try to parse as dd/mm/yyyy or dd-mm-yyyy
                    const parts = dateString.split(/[\/-]/);
                    if (parts.length === 3) {
                        // Assume dd/mm/yyyy or dd-mm-yyyy format
                        date = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                }
            } else {
                return 'Format tanggal tidak valid';
            }

            if (isNaN(date.getTime())) {
                return 'Tanggal tidak valid';
            }

            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Format tanggal bermasalah';
        }
    }

    // ===============================================
    // Initialize Dashboard
    // ===============================================
    fetchCustomerData();
});