document.addEventListener('DOMContentLoaded', () => {
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    let allData = [];
    let filteredData = [];
    let currentFilter = 'all'; // 'all', 'active', 'inactive'
    
    // Make loadCustomers function global for modal integration
    window.loadCustomers = fetchData;

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const customerList = document.getElementById('customer-list');
    const searchInput = document.getElementById('search-input');
    const filterAllBtn = document.getElementById('filter-all');
    const filterActiveBtn = document.getElementById('filter-active');
    const filterInactiveBtn = document.getElementById('filter-inactive');
    const addCustomerBtn = document.getElementById('add-customer-btn');

    // ===============================================
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    fetchData();

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        // Remove old search button functionality since we now have always-visible search
        // searchBtn is no longer needed with new UI
        
        searchInput.addEventListener('input', applyFilters);
        filterAllBtn.addEventListener('click', () => setFilter('all'));
        filterActiveBtn.addEventListener('click', () => setFilter('active'));
        filterInactiveBtn.addEventListener('click', () => setFilter('inactive'));
        
        // Note: Add customer functionality will likely navigate to a new page in a real app
        // addCustomerBtn.addEventListener('click', () => { 
        //     alert('Navigating to add customer page...');
        //     // window.location.href = 'add_customer.html'; 
        // });
    }

    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
    async function fetchData() {
        showLoading();
        
        try {
            const response = await fetch(window.AppConfig.getApiUrl('getPelanggan') + '?action=getPelanggan');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const responseData = await response.json();

            if (!Array.isArray(responseData)) {
                if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
                throw new TypeError('Format data yang diterima dari server salah.');
            }
            
            allData = responseData.sort((a, b) => b.rowNumber - a.rowNumber);
            hideLoading();
            setFilter('all'); // Set initial filter and render
        } catch (error) {
            console.error('Error fetching data:', error);
            hideLoading();
            customerList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data. ${error.message}</p>`;
        }
    }

    function setFilter(filterType) {
        currentFilter = filterType;
        
        // Update active button style
        const buttons = {
            all: filterAllBtn,
            active: filterActiveBtn,
            inactive: filterInactiveBtn
        };

        for (const key in buttons) {
            buttons[key].classList.remove('bg-[#501ee6]', 'text-white');
            buttons[key].classList.add('bg-[#eae8f3]', 'text-[#110e1b]');
        }
        buttons[filterType].classList.add('bg-[#501ee6]', 'text-white');
        buttons[filterType].classList.remove('bg-[#eae8f3]', 'text-[#110e1b]');
        
        applyFilters();
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        
        let data = [...allData];

        // Filter by status
        if (currentFilter === 'active') {
            data = data.filter(item => item.STATUS && item.STATUS.toUpperCase() === 'AKTIF');
        } else if (currentFilter === 'inactive') {
            data = data.filter(item => item.STATUS && item.STATUS.toUpperCase() === 'NONAKTIF');
        }

        // Filter by search term
        if (searchTerm) {
            data = data.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchTerm)
                )
            );
        }
        
        filteredData = data;
        renderCustomerList();
    }

    function renderCustomerList() {
        customerList.innerHTML = '';
        if (filteredData.length === 0) {
            customerList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada pelanggan ditemukan.</p>`;
            return;
        }

        filteredData.forEach(item => {
            const status = item.STATUS || 'N/A';
            const statusColor = status.toUpperCase() === 'AKTIF' ? 'bg-[#078843]' : 'bg-red-500';
            const tanggalPasang = item['TANGGAL PASANG'] 
                ? new Date(item['TANGGAL PASANG']).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
                : 'Tanggal tidak tersedia';
            const profileImage = item.FOTO || 'assets/logo_192x192.png'; // Fallback image

            const customerItem = document.createElement('div');
            customerItem.className = "flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200 cursor-pointer hover:bg-gray-100";
            
            customerItem.innerHTML = `
              <div class="flex items-center gap-4">
                <div
                  class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14"
                  style='background-image: url("${profileImage}");'
                ></div>
                <div class="flex flex-col justify-center">
                  <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${item.NAMA || ''}</p>
                  <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${tanggalPasang}</p>
                </div>
              </div>
              <div class="shrink-0">
                <div class="flex size-7 items-center justify-center"><div class="size-3 rounded-full ${statusColor}"></div></div>
              </div>
            `;
            
            // Add click event to open customer detail modal
            customerItem.addEventListener('click', () => {
                if (typeof openCustomerDetail === 'function') {
                    const customerData = {
                        idpl: item.IDPL,
                        nama: item.NAMA,
                        alamat: item.ALAMAT,
                        jenisKelamin: item['JENIS KELAMIN'],
                        whatsapp: item.WHATSAPP,
                        paket: item.PAKET,
                        tagihan: item.TAGIHAN,
                        status: item.STATUS,
                        tanggalPasang: item['TANGGAL PASANG'],
                        jenisPerangkat: item['JENIS PERANGKAT'],
                        ipStatic: item['IP STATIC / PPOE'],
                        foto: item.FOTO
                    };
                    openCustomerDetail(customerData);
                }
            });

            customerList.appendChild(customerItem);
        });
    }

    // ===============================================
    // Skeleton Loading Functions
    // ===============================================
    function showLoading() {
        // Clear existing content and show skeleton
        customerList.innerHTML = '';
        
        // Create skeleton items
        for (let i = 0; i < 6; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'skeleton-item flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="skeleton-avatar bg-gray-300 rounded-full h-14 w-14"></div>
                    <div class="flex flex-col justify-center gap-2">
                        <div class="skeleton-line h-4 bg-gray-300 rounded w-32"></div>
                        <div class="skeleton-line h-3 bg-gray-300 rounded w-24"></div>
                    </div>
                </div>
                <div class="shrink-0">
                    <div class="skeleton-status w-7 h-7 bg-gray-300 rounded-full"></div>
                </div>
            `;
            customerList.appendChild(skeletonItem);
        }
        
        // Add skeleton animation styles if not exists
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                @keyframes skeleton-loading {
                    0% {
                        background-position: -200px 0;
                    }
                    100% {
                        background-position: calc(200px + 100%) 0;
                    }
                }
                
                .skeleton-line, .skeleton-avatar, .skeleton-status {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200px 100%;
                    animation: skeleton-loading 1.5s infinite;
                }
                
                .skeleton-item {
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        // Remove skeleton items when done
        const skeletonItems = document.querySelectorAll('.skeleton-item');
        skeletonItems.forEach(item => item.remove());
    }
});
