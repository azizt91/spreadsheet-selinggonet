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
    const welcomeText = document.getElementById('welcome-text');
    const cardsContainer = document.getElementById('cards-container');

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showSkeletonLoading() {
        cardsContainer.innerHTML = '';
        
        // Create 4 skeleton cards matching the new grid design
        for (let i = 0; i < 4; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'rounded-2xl p-6 card-hover animate-fadeInUp skeleton-card';
            skeletonCard.innerHTML = `
                <div class="flex flex-col items-start justify-between h-32">
                    <div class="flex items-center justify-between w-full">
                        <div class="bg-gray-200 w-12 h-12 rounded-full skeleton-line"></div>
                        <div class="bg-gray-200 w-6 h-6 rounded skeleton-line"></div>
                    </div>
                    <div class="w-full">
                        <div class="bg-gray-200 h-8 w-16 rounded mb-2 skeleton-line"></div>
                        <div class="bg-gray-200 h-4 w-24 rounded skeleton-line"></div>
                    </div>
                </div>
            `;
            cardsContainer.appendChild(skeletonCard);
        }
        
        // Add skeleton animation styles
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                @keyframes skeleton-loading {
                    0% { background-color: #e0e0e0; }
                    50% { background-color: #f0f0f0; }
                    100% { background-color: #e0e0e0; }
                }
                .skeleton-shimmer {
                    animation: skeleton-loading 1.5s infinite;
                }
            `;
            document.head.appendChild(style);
        }
    }

    function hideSkeletonLoading() {
        const skeletonStyles = document.getElementById('skeleton-styles');
        if (skeletonStyles) {
            skeletonStyles.remove();
        }
    }

    // ===============================================
    // Data Fetching Functions
    // ===============================================
    async function fetchCustomerData() {
        showSkeletonLoading();
        
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
            // Show error message
            welcomeText.textContent = 'Hallo, Pelanggan';
            cardsContainer.innerHTML = `
                <div class="col-span-2">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        <p class="text-red-700 mb-4">Gagal memuat data: ${error.message}</p>
                        <button onclick="location.reload()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Coba Lagi</button>
                    </div>
                </div>
            `;
        } finally {
            hideSkeletonLoading();
        }
    }

    // ===============================================
    // Display Functions
    // ===============================================
    function displayCustomerDashboard(profile, unpaidBills, paidBills) {
        // Update welcome message
        welcomeText.textContent = `Hallo, ${profile.NAMA || 'Pelanggan'}`;

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

        // Define cards data with admin dashboard style
        const cards = [
            {
                title: 'Total Belum Dibayar',
                value: formatter.format(totalUnpaidAmount).replace('Rp', '').trim(),
                subtitle: 'Rupiah',
                icon: '💳',
                gradient: 'gradient-card-3'
            },
            {
                title: 'Berlangganan Sejak',
                value: installDate.split(' ')[0] + ' ' + installDate.split(' ')[1], // Show day and month
                subtitle: installDate.split(' ')[2] || '', // Show year
                icon: '📅',
                gradient: 'gradient-card-2'
            },
            {
                title: 'Tagihan Belum Lunas',
                value: unpaidBills.length.toString(),
                subtitle: 'Tagihan',
                icon: '⚠️',
                gradient: 'gradient-card-1'
            },
            {
                title: 'Total Sudah Lunas',
                value: paidBills.length.toString(),
                subtitle: 'Pembayaran',
                icon: '✅',
                gradient: 'gradient-card-4'
            }
        ];

        // Create and append cards with admin dashboard style
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = `${card.gradient} rounded-2xl p-6 text-white card-hover animate-fadeInUp cursor-pointer transition-transform hover:scale-105`;
            cardElement.style.animationDelay = `${index * 0.1}s`;
            
            // Add click functionality for specific cards
            if (card.title === 'Tagihan Belum Lunas') {
                cardElement.onclick = () => {
                    // Navigate to payment history with unpaid tab
                    sessionStorage.setItem('activeTab', 'unpaid');
                    window.location.href = 'pelanggan_riwayat_lunas.html';
                };
            } else if (card.title === 'Total Sudah Lunas') {
                cardElement.onclick = () => {
                    // Navigate to payment history with paid tab
                    sessionStorage.setItem('activeTab', 'paid');
                    window.location.href = 'pelanggan_riwayat_lunas.html';
                };
            }
            
            cardElement.innerHTML = `
                <div class="flex flex-col items-start justify-between h-32">
                    <div class="flex items-center justify-between w-full">
                        <div class="text-2xl">${card.icon}</div>
                        <svg class="w-6 h-6 opacity-70" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                        </svg>
                    </div>
                    <div class="w-full">
                        <div class="text-2xl font-bold mb-1">${card.value}</div>
                        <div class="text-sm opacity-90">${card.subtitle}</div>
                        <div class="text-xs opacity-70 mt-1">${card.title}</div>
                    </div>
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
