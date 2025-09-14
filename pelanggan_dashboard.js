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
    const dashboardCards = document.getElementById('dashboard-cards');

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showSkeletonLoading() {
        dashboardCards.innerHTML = '';
        
        // Create 4 skeleton cards matching the template design
        for (let i = 0; i < 4; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'p-4';
            skeletonCard.innerHTML = `
                <div class="flex flex-col items-stretch justify-start rounded-lg">
                    <div class="w-full bg-gray-200 aspect-video rounded-lg skeleton-shimmer"></div>
                    <div class="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-1 py-4">
                        <div class="bg-gray-200 h-6 w-3/4 rounded skeleton-shimmer"></div>
                        <div class="flex items-end gap-3 justify-between">
                            <div class="flex flex-col gap-1">
                                <div class="bg-gray-200 h-4 w-1/2 rounded skeleton-shimmer"></div>
                                <div class="bg-gray-200 h-4 w-2/3 rounded skeleton-shimmer"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            dashboardCards.appendChild(skeletonCard);
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
            dashboardCards.innerHTML = `
                <div class="p-4">
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
        dashboardCards.innerHTML = '';

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
            formatDate(profile['TANGGAL PASANG']) : 'March 1, 2023';

        // Define cards data based on template
        const cards = [
            {
                title: `You have ${unpaidBills.length} unpaid bills`,
                subtitle1: 'View details',
                subtitle2: unpaidBills.length > 0 ? `Due by ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : 'All bills paid',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHAwY3BLD_1cl8g4JdcWqXkxz0MuI6KjgwnXLAHlCb6820a6YHt2RNTN3BKgm7qCzmwsqlC250zljmq_FfXRD2lo9t8l4MQGqvfPNLalWba1yzAK3ArYR6GxMq6x74cWMP1Vfl8Utd7RgVzAndYZcwqn4OWW7m8VOUAugNdWz3luGIxHNdtzC5ZRAqM6Ec618QOf1Ha9KHaNFu1o8l-GVTip2RUVH75mWyCoapBvr0ZykpQh0qHEKjZUR7duNYeVFGNOaxPeobbJ8'
            },
            {
                title: 'Subscription since',
                subtitle1: 'View details',
                subtitle2: `Started on ${installDate}`,
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFtD52ZGbSSkOyGqWCM6z9vOuidSnG0a0JuENZaYxLH1pg_M2kDlDHjANJQFOFEo5043JemNslH1YgaleRStVFOM4Watucq16tYeiULcs1wL4vYlaQWeno7_azvGp_0FW9jSzAkEQ6QGYTFVBcR0r3lgBFoaB9uBDRNMwkEBF7ifjB0baQaHk6qS3-mXxUiRXLbNR-vhWUQCpWRI8EN7QNXeTI9hWuWm_upbvJJc9Kf-jFbO2QWHus7y0TL1_32goSsogUEqQVVDY'
            },
            {
                title: 'Total unpaid amount',
                subtitle1: 'View details',
                subtitle2: `${unpaidBills.length} Months Unpaid`,
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPQrBySHCsZJNs-iZYf2BS5lsrXbml9P5WHHJL8_Z4MpYIVgV67nsIFfXNM0z_MekFnlkmN6pDj8793T9LL04EshYmG-EJWQ7W3hMuX5yBgiTKtLABkLumXJ8AvBVxtjtML_4dPIEeZzik9UbethZNVF-OUNOz5BtbrbgJ3CBwEbXwuODgB7C9xYTWO9xylNcdjxWSkoJAZ7jcTSJK1TULNEppXUpJuhuiHBe55toMpx0IEYcMEsc0GH0OR7SceiiemrqxFxnQYO0'
            },
            {
                title: 'Total paid amount',
                subtitle1: 'View details',
                subtitle2: `${paidBills.length} Months Paid`,
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgsmVTpIstQu7jo9VyCIGYI_NtRB-VF3b-T_oNAjpRz7G6ma4L7plB4TjhDbezqm-ChLRExqldZ7UQRPotJ58wQ-ydQPvFqND_BhtKfTLOCiaIona7s3Xdmh3LIKKRhzzCvCE6USd64fZEzQ3C48OXjGQCn4z4y5BJwJF_8imNIB2gbhwJbTNnS9VCRK5hXYnvkC2OJ2xOqJeC9QjmrnWvJLUtquJ9INHx5ftf2aI7A_w26xXxRTBwiyL4zJSsUCNRJn49izljQY4'
            }
        ];

        // Create and append cards
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'p-4 @container';
            cardElement.innerHTML = `
                <div class="flex flex-col items-stretch justify-start rounded-lg @xl:flex-row @xl:items-start">
                    <div class="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg" style='background-image: url("${card.image}");'></div>
                    <div class="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-1 py-4 @xl:px-4">
                        <p class="text-[#110e1b] text-lg font-bold leading-tight tracking-[-0.015em]">${card.title}</p>
                        <div class="flex items-end gap-3 justify-between">
                            <div class="flex flex-col gap-1">
                                <p class="text-[#604e97] text-base font-normal leading-normal">${card.subtitle1}</p>
                                <p class="text-[#604e97] text-base font-normal leading-normal">${card.subtitle2}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            dashboardCards.appendChild(cardElement);
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
