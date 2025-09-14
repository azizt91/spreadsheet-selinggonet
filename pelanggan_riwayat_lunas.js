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

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const paymentHistoryList = document.getElementById('payment-history-list');

    // ===============================================
    // Skeleton Loading Functions
    // ===============================================
    function showSkeletonLoading() {
        paymentHistoryList.innerHTML = '';
        
        // Create 8 skeleton items matching the template design
        for (let i = 0; i < 8; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'flex items-center gap-4 bg-[#f9f8fc] px-4 min-h-[72px] py-2 justify-between';
            skeletonItem.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="bg-gray-200 rounded-lg shrink-0 size-12 skeleton-shimmer"></div>
                    <div class="flex flex-col justify-center gap-2">
                        <div class="bg-gray-200 h-4 w-20 rounded skeleton-shimmer"></div>
                        <div class="bg-gray-200 h-3 w-16 rounded skeleton-shimmer"></div>
                    </div>
                </div>
                <div class="shrink-0">
                    <div class="bg-gray-200 h-4 w-12 rounded skeleton-shimmer"></div>
                </div>
            `;
            paymentHistoryList.appendChild(skeletonItem);
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
    // Initial Setup
    // ===============================================
    fetchCustomerPaymentHistory();

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
    // Main Data Fetch & Display Logic
    // ===============================================
    async function fetchCustomerPaymentHistory() {
        showSkeletonLoading();
        
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
            
            renderPaymentHistory();

        } catch (error) {
            console.error('Error fetching data:', error);
            // Display error message
            paymentHistoryList.innerHTML = `
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

    function renderPaymentHistory() {
        paymentHistoryList.innerHTML = '';
        
        if (allLunasData.length === 0) {
            paymentHistoryList.innerHTML = `
                <div class="p-4">
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clip-rule="evenodd"></path>
                        </svg>
                        <p class="text-gray-600">Tidak ada riwayat pembayaran ditemukan.</p>
                    </div>
                </div>
            `;
            return;
        }

        allLunasData.forEach(item => {
            const periode = item['PERIODE TAGIHAN'] || 'Periode tidak tersedia';
            const amount = formatCurrency(item.TAGIHAN || 0);
            const tanggalBayar = item['TANGGAL BAYAR'] 
                ? new Date(item['TANGGAL BAYAR']).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric'
                  })
                : 'Tanggal tidak tersedia';

            const paymentItem = document.createElement('div');
            paymentItem.className = 'flex items-center gap-4 bg-[#f9f8fc] px-4 min-h-[72px] py-2 justify-between';
            paymentItem.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="text-[#110e1b] flex items-center justify-center rounded-lg bg-[#eae7f3] shrink-0 size-12">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z"></path>
                        </svg>
                    </div>
                    <div class="flex flex-col justify-center">
                        <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${tanggalBayar}</p>
                        <p class="text-[#604e97] text-sm font-normal leading-normal line-clamp-2">${periode}</p>
                    </div>
                </div>
                <div class="shrink-0">
                    <p class="text-[#110e1b] text-base font-normal leading-normal">${amount}</p>
                </div>
            `;
            paymentHistoryList.appendChild(paymentItem);
        });
    }

});
