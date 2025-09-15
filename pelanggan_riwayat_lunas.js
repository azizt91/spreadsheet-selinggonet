// pelanggan_riwayat_lunas.js - Customer Payment History with Tabs

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
    const contentList = document.getElementById('content-list');
    const searchInput = document.getElementById('search-input');
    const unpaidTab = document.getElementById('unpaidTab');
    const paidTab = document.getElementById('paidTab');
    
    // State management
    let unpaidData = [];
    let paidData = [];
    let currentTab = 'paid'; // Start with paid tab active

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderList);
        unpaidTab.addEventListener('click', () => switchTab('unpaid'));
        paidTab.addEventListener('click', () => switchTab('paid'));
    }

    // ===============================================
    // Tab Management
    // ===============================================
    function switchTab(tab) {
        currentTab = tab;
        if (tab === 'unpaid') {
            // Set unpaid tab as active
            unpaidTab.classList.add('active');
            unpaidTab.classList.remove('border-b-transparent');
            unpaidTab.classList.add('border-b-[#5324e0]', 'text-[#110e1b]');
            
            // Set paid tab as inactive
            paidTab.classList.remove('active');
            paidTab.classList.remove('border-b-[#5324e0]', 'text-[#110e1b]');
            paidTab.classList.add('border-b-transparent', 'text-[#625095]');
            
            searchInput.placeholder = 'Cari tagihan belum dibayar...';
        } else {
            // Set paid tab as active
            paidTab.classList.add('active');
            paidTab.classList.remove('border-b-transparent');
            paidTab.classList.add('border-b-[#5324e0]', 'text-[#110e1b]');
            
            // Set unpaid tab as inactive
            unpaidTab.classList.remove('active');
            unpaidTab.classList.remove('border-b-[#5324e0]', 'text-[#110e1b]');
            unpaidTab.classList.add('border-b-transparent', 'text-[#625095]');
            
            searchInput.placeholder = 'Cari riwayat pembayaran...';
        }
        renderList();
    }

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showLoading() {
        contentList.innerHTML = '';
        
        // Create skeleton loading items
        for (let i = 0; i < 5; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="flex flex-col justify-center flex-1 gap-2">
                    <div class="bg-gray-200 h-4 w-3/4 rounded skeleton-shimmer"></div>
                    <div class="bg-gray-200 h-3 w-1/2 rounded skeleton-shimmer"></div>
                </div>
                <div class="shrink-0">
                    <div class="bg-gray-200 h-4 w-20 rounded skeleton-shimmer"></div>
                </div>
            `;
            contentList.appendChild(skeletonItem);
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

    function hideLoading() {
        const skeletonStyles = document.getElementById('skeleton-styles');
        if (skeletonStyles) {
            skeletonStyles.remove();
        }
    }

    // ===============================================
    // Data Fetching Functions
    // ===============================================
    async function fetchData() {
        showLoading();
        
        try {
            // Fetch both unpaid and paid bills
            const [unpaidResponse, paidResponse] = await Promise.all([
                fetch(`${window.AppConfig.API_BASE_URL}?action=getTagihan`),
                fetch(`${window.AppConfig.API_BASE_URL}?action=getLunas`)
            ]);

            if (!unpaidResponse.ok || !paidResponse.ok) {
                throw new Error('Gagal mengambil data dari server');
            }

            const unpaidRawData = await unpaidResponse.json();
            const paidRawData = await paidResponse.json();

            // Filter data for current customer
            unpaidData = Array.isArray(unpaidRawData) ? 
                unpaidRawData.filter(bill => bill.IDPL === userIdpl) : [];
            paidData = Array.isArray(paidRawData) ? 
                paidRawData.filter(bill => bill.IDPL === userIdpl) : [];

            // Sort data
            unpaidData.sort((a, b) => new Date(b['TANGGAL PASANG'] || 0) - new Date(a['TANGGAL PASANG'] || 0));
            paidData.sort((a, b) => new Date(b['TANGGAL BAYAR'] || 0) - new Date(a['TANGGAL BAYAR'] || 0));

            renderList();

        } catch (error) {
            console.error('Error:', error);
            contentList.innerHTML = `
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
            hideLoading();
        }
    }

    // ===============================================
    // Render Functions
    // ===============================================
    function renderList() {
        contentList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        const data = currentTab === 'unpaid' ? unpaidData : paidData;

        if (!Array.isArray(data)) {
            contentList.innerHTML = `<p class="text-center text-red-500 p-4">Error: Format data tidak valid</p>`;
            return;
        }

        const filteredData = data.filter(item => {
            if (!item) return false;
            return (item.NAMA && item.NAMA.toLowerCase().includes(searchTerm)) ||
                   (item['PERIODE TAGIHAN'] && item['PERIODE TAGIHAN'].toLowerCase().includes(searchTerm));
        });

        if (filteredData.length === 0) {
            const emptyMessage = currentTab === 'unpaid' ? 
                'Tidak ada tagihan belum dibayar' : 'Belum ada riwayat pembayaran';
            contentList.innerHTML = `<p class="text-center text-gray-500 p-4">${emptyMessage}</p>`;
            return;
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        filteredData.forEach(item => {
            if (!item) return;

            const amount = item.TAGIHAN ? formatter.format(String(item.TAGIHAN).replace(/[^0-9]/g, '')) : 'N/A';
            const period = item['PERIODE TAGIHAN'] || 'Periode tidak tersedia';

            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';

            if (currentTab === 'unpaid') {
                itemDiv.innerHTML = `
                    <div class="flex flex-col justify-center">
                        <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${period}</p>
                        <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${amount}</p>
                    </div>
                    <div class="shrink-0">
                        <button onclick="window.location.href='pelanggan_info.html'" class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#5324e0] text-white text-sm font-medium leading-normal w-fit hover:bg-[#4318d4]">
                            <span class="truncate">Bayar</span>
                        </button>
                    </div>
                `;
            } else {
                const paymentDate = item['TANGGAL BAYAR'] ? 
                    formatDate(item['TANGGAL BAYAR']) : 'Tanggal tidak tersedia';
                itemDiv.innerHTML = `
                    <div class="flex flex-col justify-center">
                        <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${period}</p>
                        <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">Dibayar: ${paymentDate}</p>
                    </div>
                    <div class="shrink-0 text-right">
                        <p class="text-[#110e1b] text-base font-medium leading-normal">${amount}</p>
                        <p class="text-green-600 text-xs font-medium">✓ Lunas</p>
                    </div>
                `;
            }
            contentList.appendChild(itemDiv);
        });
    }

    // ===============================================
    // Utility Functions
    // ===============================================
    function formatDate(dateString) {
        if (!dateString) return 'Tidak tersedia';
        
        try {
            let date;
            if (dateString instanceof Date) {
                date = dateString;
            } else if (typeof dateString === 'string') {
                date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    const parts = dateString.split(/[\/-]/);
                    if (parts.length === 3) {
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
    // Initialize
    // ===============================================
    initializeEventListeners();
    
    // Check for activeTab from sessionStorage (from dashboard navigation)
    const activeTabFromStorage = sessionStorage.getItem('activeTab');
    if (activeTabFromStorage && (activeTabFromStorage === 'paid' || activeTabFromStorage === 'unpaid')) {
        currentTab = activeTabFromStorage;
        switchTab(currentTab);
        // Clear the sessionStorage after using it
        sessionStorage.removeItem('activeTab');
    }
    
    fetchData();
});
