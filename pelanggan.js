// pelanggan.js (Versi Perbaikan Total)
document.addEventListener('DOMContentLoaded', () => {
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_BASE_URL = window.AppConfig.API_BASE_URL;
    let allData = [];
    let filteredData = [];
    let currentFilter = 'all'; // 'all', 'active', 'inactive'
    let currentEditingRowNumber = null;

    // Opsi paket sesuai permintaan dari file lama
    const paketOptions = {
        '1,5 Mbps': 'Rp 50.000',
        '3 Mbps': 'Rp 100.000',
        '5 Mbps': 'Rp 150.000',
        '8 Mbps': 'Rp 180.000',
        '10 Mbps': 'Rp 200.000',
        '20 Mbps': 'Rp 250.000',
    };

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const customerList = document.getElementById('customer-list');
    const searchInput = document.getElementById('search-input');
    const filterButtons = {
        all: document.getElementById('filter-all'),
        active: document.getElementById('filter-active'),
        inactive: document.getElementById('filter-inactive')
    };
    
    // Modal Elements
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const formModal = document.getElementById('add-customer-modal');
    const detailModal = document.getElementById('customer-detail-modal');
    const customerForm = document.getElementById('customer-form');
    
    // ===============================================
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    populatePaketDropdown();
    fetchData();

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', applyFilters);
        
        filterButtons.all.addEventListener('click', () => setFilter('all'));
        filterButtons.active.addEventListener('click', () => setFilter('active'));
        filterButtons.inactive.addEventListener('click', () => setFilter('inactive'));

        addCustomerBtn.addEventListener('click', openAddModal);
        
        // Modal Listeners
        formModal.querySelector('#close-modal-btn').addEventListener('click', () => closeModal(formModal));
        formModal.querySelector('#cancel-btn').addEventListener('click', () => closeModal(formModal));
        detailModal.querySelector('#close-detail-modal-btn').addEventListener('click', () => closeModal(detailModal));
        customerForm.addEventListener('submit', handleFormSubmit);

        // Paket change listener
        document.getElementById('customer-package').addEventListener('change', handlePaketChange);

        // Edit button inside detail view
        document.getElementById('edit-customer-detail-btn').addEventListener('click', handleEditFromDetailView);
    }

    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
    async function fetchData() {
        showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}?action=getPelanggan`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const responseData = await response.json();
            if (responseData.error) throw new Error(responseData.error);

            allData = responseData
                .filter(item => item.LEVEL === 'USER')
                .sort((a, b) => b.rowNumber - a.rowNumber);
            
            applyFilters();
        } catch (error) {
            console.error('Error fetching data:', error);
            customerList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }

    function setFilter(filterType) {
        currentFilter = filterType;
        Object.values(filterButtons).forEach(btn => btn.classList.remove('bg-[#501ee6]', 'text-white'));
        filterButtons[filterType].classList.add('bg-[#501ee6]', 'text-white');
        applyFilters();
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        
        let data = allData;
        if (currentFilter === 'active') data = data.filter(item => item.STATUS === 'AKTIF');
        if (currentFilter === 'inactive') data = data.filter(item => item.STATUS === 'NONAKTIF');

        filteredData = data.filter(item =>
            Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm))
        );
        renderCustomerList();
    }

    function renderCustomerList() {
        customerList.innerHTML = '';
        if (filteredData.length === 0) {
            customerList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada pelanggan ditemukan.</p>`;
            return;
        }

        filteredData.forEach(item => {
            const statusColor = item.STATUS === 'AKTIF' ? 'bg-[#078843]' : 'bg-red-500';
            const tanggalPasang = item['TANGGAL PASANG'] ? new Date(item['TANGGAL PASANG']).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
            
            const customerItem = document.createElement('div');
            customerItem.className = "flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-100 cursor-pointer hover:bg-gray-50";
            customerItem.innerHTML = `
              <div class="flex items-center gap-4">
                <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14" style="background-image: url('${item.FOTO || ''}');"></div>
                <div class="flex flex-col justify-center">
                  <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${item.NAMA}</p>
                  <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${tanggalPasang}</p>
                </div>
              </div>
              <div class="shrink-0"><div class="flex size-7 items-center justify-center"><div class="size-3 rounded-full ${statusColor}"></div></div></div>
            `;
            customerItem.addEventListener('click', () => openDetailModal(item));
            customerList.appendChild(customerItem);
        });
    }

    // ===============================================
    // Modal & Form Logic
    // ===============================================
    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); }

    function populatePaketDropdown() {
        const paketSelect = document.getElementById('customer-package');
        paketSelect.innerHTML = '<option value="">-- Pilih Paket --</option>';
        for (const paket in paketOptions) {
            const option = document.createElement('option');
            option.value = paket;
            option.textContent = paket;
            paketSelect.appendChild(option);
        }
    }

    function handlePaketChange(event) {
        const selectedPaket = event.target.value;
        const tagihanInput = document.getElementById('customer-bill');
        const priceString = paketOptions[selectedPaket] || '0';
        tagihanInput.value = priceString.replace(/[^0-9]/g, '');
    }
    
    function openAddModal() {
        customerForm.reset();
        currentEditingRowNumber = null;
        document.getElementById('modal-title').textContent = 'Tambah Pelanggan';
        document.getElementById('save-btn-text').textContent = 'Simpan';
        openModal(formModal);
    }
    
    function openEditModal(customerData) {
        customerForm.reset();
        currentEditingRowNumber = customerData.rowNumber;
        document.getElementById('modal-title').textContent = 'Edit Pelanggan';
        document.getElementById('save-btn-text').textContent = 'Update';

        document.getElementById('customer-name').value = customerData.NAMA || '';
        document.getElementById('customer-address').value = customerData.ALAMAT || '';
        document.getElementById('customer-whatsapp').value = customerData.WHATSAPP || '';
        document.getElementById('customer-gender').value = customerData['JENIS KELAMIN'] || '';
        document.getElementById('customer-package').value = customerData.PAKET || '';
        document.getElementById('customer-bill').value = String(customerData.TAGIHAN || '').replace(/[^0-9]/g, '');
        document.getElementById('customer-status').value = customerData.STATUS || '';
        document.getElementById('customer-device').value = customerData['JENIS PERANGKAT'] || '';
        document.getElementById('customer-ip').value = customerData['IP STATIC / PPOE'] || '';

        openModal(formModal);
    }
    
    function handleEditFromDetailView() {
        const customerData = allData.find(item => item.rowNumber === currentEditingRowNumber);
        if (customerData) {
            closeModal(detailModal);
            openEditModal(customerData);
        }
    }

    function openDetailModal(customer) {
        currentEditingRowNumber = customer.rowNumber;
        const profileImage = document.getElementById('detail-profile-image');
        if (customer.FOTO && customer.FOTO.startsWith('http')) {
            profileImage.style.backgroundImage = `url('${customer.FOTO}')`;
            // Hapus ikon SVG di dalamnya agar tidak tumpang tindih
            profileImage.innerHTML = ''; 
        } else {
            // Jika tidak ada foto, tampilkan ikon default
            profileImage.style.backgroundImage = 'none';
            profileImage.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" fill="currentColor" viewBox="0 0 256 256" class="text-gray-500">
                    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
                </svg>
            `;
        }
        document.getElementById('detail-customer-name').textContent = customer.NAMA || '-';
        document.getElementById('detail-customer-id').textContent = customer.IDPL || '-';
        
        const details = {
            'detail-idpl': customer.IDPL,
            'detail-nama': customer.NAMA,
            'detail-alamat': customer.ALAMAT,
            'detail-gender': customer['JENIS KELAMIN'],
            'detail-whatsapp': customer.WHATSAPP,
            'detail-paket': customer.PAKET,
            'detail-tagihan': customer.TAGIHAN ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(customer.TAGIHAN) : '-',
            'detail-status': customer.STATUS,
            'detail-tanggal-pasang': customer['TANGGAL PASANG'] ? new Date(customer['TANGGAL PASANG']).toLocaleDateString('id-ID') : '-',
            'detail-jenis-perangkat': customer['JENIS PERANGKAT'],
            'detail-ip-static': customer['IP STATIC / PPOE']
        };

        for (const id in details) {
            document.getElementById(id).textContent = details[id] || '-';
        }

        loadUnpaidBills(customer.IDPL);
        
        openModal(detailModal);
    }

    // Tambahkan fungsi ini di dalam file pelanggan.js (bisa di bagian paling bawah sebelum kurung tutup terakhir)
    async function loadUnpaidBills(customerId) {
        const unpaidBillsSection = document.getElementById('unpaid-bills-section');
        const unpaidBillsList = document.getElementById('unpaid-bills-list');
        
        unpaidBillsSection.classList.remove('hidden');
        unpaidBillsList.innerHTML = '<p class="text-sm text-gray-500 px-4">Memuat tagihan...</p>';
    
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getTagihan`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const responseData = await response.json();
            
            if (Array.isArray(responseData)) {
                const customerUnpaidBills = responseData.filter(bill => 
                    bill.IDPL === customerId && bill.STATUS !== 'LUNAS'
                );
                
                if (customerUnpaidBills.length > 0) {
                    unpaidBillsList.innerHTML = ''; // Kosongkan list sebelum diisi
                    customerUnpaidBills.forEach(bill => {
                        const billItem = document.createElement('div');
                        billItem.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between';
                        
                        const periodText = bill['PERIODE TAGIHAN'] || `${bill.BULAN || ''} ${bill.TAHUN || ''}`.trim();
                        const amount = bill.TAGIHAN ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(bill.TAGIHAN) : '-';
                        
                        billItem.innerHTML = `
                            <div class="flex flex-col justify-center">
                                <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${bill.NAMA || '-'}</p>
                                <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${periodText}</p>
                            </div>
                            <div class="shrink-0">
                                <p class="text-[#110e1b] text-base font-normal leading-normal">${amount}</p>
                            </div>
                        `;
                        unpaidBillsList.appendChild(billItem);
                    });
                } else {
                    unpaidBillsList.innerHTML = '<p class="text-sm text-gray-500 px-4">Tidak ada tagihan yang belum dibayar.</p>';
                }
            } else {
                throw new Error("Format data tagihan tidak valid.");
            }
        } catch (error) {
            console.error('Error loading unpaid bills:', error);
            unpaidBillsList.innerHTML = `<p class="text-sm text-red-500 px-4">Gagal memuat tagihan.</p>`;
        }
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const saveBtn = document.getElementById('save-customer-btn');
        const isEditing = !!currentEditingRowNumber;
        
        const formData = {
            nama: document.getElementById('customer-name').value,
            alamat: document.getElementById('customer-address').value,
            whatsapp: document.getElementById('customer-whatsapp').value,
            jenisKelamin: document.getElementById('customer-gender').value,
            paket: document.getElementById('customer-package').value,
            tagihan: document.getElementById('customer-bill').value,
            status: document.getElementById('customer-status').value,
            jenisPerangkat: document.getElementById('customer-device').value,
            ipStatic: document.getElementById('customer-ip').value
        };

        setButtonLoading(saveBtn, true, isEditing ? 'Update' : 'Simpan');

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: isEditing ? 'updatePelanggan' : 'addPelanggan',
                    rowNumber: currentEditingRowNumber,
                    data: formData
                })
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            showSuccessNotification(result.message);
            closeModal(formModal);
            fetchData();
        } catch (error) {
            showErrorNotification(`Error: ${error.message}`);
        } finally {
            setButtonLoading(saveBtn, false, isEditing ? 'Update' : 'Simpan');
        }
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

    function setButtonLoading(button, isLoading, originalText) {
        button.disabled = isLoading;
        button.querySelector('span').textContent = isLoading ? 'Memproses...' : originalText;
    }

    function showSuccessNotification(message) { /* Implementasi notifikasi sukses */ alert(message); }
    function showErrorNotification(message) { /* Implementasi notifikasi error */ alert(message); }
});

    

