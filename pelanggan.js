// pelanggan.js (Versi Perbaikan Total - Tanpa Modal)
document.addEventListener('DOMContentLoaded', () => {
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_BASE_URL = window.AppConfig.API_BASE_URL;
    let allData = [];
    let currentFilter = 'all';
    let currentEditingRowNumber = null;
    let lastView = 'list'; // Untuk melacak view terakhir sebelum ke form

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
    const views = {
        list: document.getElementById('list-view'),
        detail: document.getElementById('detail-view'),
        form: document.getElementById('form-view')
    };
    
    const customerList = document.getElementById('customer-list');
    const searchInput = document.getElementById('search-input');
    const filterButtons = {
        all: document.getElementById('filter-all'),
        active: document.getElementById('filter-active'),
        inactive: document.getElementById('filter-inactive')
    };
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const customerForm = document.getElementById('customer-form');

    // ===============================================
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    populatePaketDropdown();
    fetchData();

    // ===============================================
    // PERUBAHAN 1: View Management (Pengganti Modal)
    // ===============================================
    function switchView(viewName) {
        Object.values(views).forEach(view => view.classList.add('hidden'));
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }
        window.scrollTo(0, 0);
    }

    // ===============================================
    // PERUBAHAN 2: Event Listeners Disesuaikan
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderCustomerList);
        Object.keys(filterButtons).forEach(key => {
            filterButtons[key].addEventListener('click', () => setFilter(key));
        });

        addCustomerBtn.addEventListener('click', openAddForm);
        customerForm.addEventListener('submit', handleFormSubmit);

        // Tombol Kembali
        document.getElementById('back-from-detail').addEventListener('click', () => switchView('list'));
        document.getElementById('back-from-form').addEventListener('click', () => {
             // Kembali ke view sebelumnya (bisa list atau detail)
            if (confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
                switchView(lastView);
            }
        });
        document.getElementById('cancel-btn').addEventListener('click', () => {
            if (confirm('Yakin ingin membatalkan? Perubahan yang belum disimpan akan hilang.')) {
                switchView(lastView);
            }
        });

        // Event listener lainnya
        document.getElementById('customer-package').addEventListener('change', handlePaketChange);
        document.getElementById('edit-customer-detail-btn').addEventListener('click', handleEditFromDetailView);
    }

    // ===============================================
    // Data Fetch & Display Logic (Tidak banyak berubah)
    // ===============================================
    async function fetchData() {
        showLoading(); // <-- Skeleton Loading tetap di sini
        switchView('list');
        try {
            const response = await fetch(`${API_BASE_URL}?action=getPelanggan`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const responseData = await response.json();
            if (responseData.error) throw new Error(responseData.error);

            allData = responseData
                .filter(item => item.LEVEL === 'USER')
                .sort((a, b) => b.rowNumber - a.rowNumber);
            
            setFilter('all');
        } catch (error) {
            console.error('Error fetching data:', error);
            customerList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
        }
    }

    function setFilter(filterType) {
        currentFilter = filterType;
        Object.values(filterButtons).forEach(btn => btn.classList.remove('bg-[#501ee6]', 'text-white'));
        filterButtons[filterType].classList.add('bg-[#501ee6]', 'text-white');
        renderCustomerList();
    }

    function renderCustomerList() {
        const searchTerm = searchInput.value.toLowerCase();
        let data = allData;

        if (currentFilter === 'active') data = data.filter(item => item.STATUS === 'AKTIF');
        if (currentFilter === 'inactive') data = data.filter(item => item.STATUS === 'NONAKTIF');

        const filteredData = data.filter(item =>
            Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm))
        );
        
        customerList.innerHTML = ''; // Pastikan skeleton dihapus sebelum render
        if (filteredData.length === 0) {
            customerList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada pelanggan ditemukan.</p>`;
            return;
        }

        filteredData.forEach(item => {
            const statusColor = item.STATUS === 'AKTIF' ? 'bg-[#078843]' : 'bg-red-500';
            const tanggalPasang = item['TANGGAL PASANG'] ? new Date(item['TANGGAL PASANG']).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
            
            const customerItem = document.createElement('div');
            customerItem.className = "flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-100 cursor-pointer hover:bg-gray-50";
            customerItem.innerHTML = `<div class="flex items-center gap-4"><div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14" style="background-image: url('${item.FOTO || ''}');"></div><div class="flex flex-col justify-center"><p class="text-[#110e1b] text-base font-medium">${item.NAMA}</p><p class="text-[#625095] text-sm">${tanggalPasang}</p></div></div><div class="shrink-0"><div class="flex size-7 items-center justify-center"><div class="size-3 rounded-full ${statusColor}"></div></div></div>`;
            customerItem.addEventListener('click', () => openDetailView(item)); // <-- Mengarah ke view detail
            customerList.appendChild(customerItem);
        });
    }

    // ===============================================
    // PERUBAHAN 3: Fungsi Form & Detail diubah menjadi View
    // ===============================================
    function populatePaketDropdown() {
        const paketSelect = document.getElementById('customer-package');
        paketSelect.innerHTML = '<option value="">-- Pilih Paket --</option>';
        Object.keys(paketOptions).forEach(paket => {
            paketSelect.innerHTML += `<option value="${paket}">${paket}</option>`;
        });
    }

    function handlePaketChange(event) {
        const priceString = paketOptions[event.target.value] || '0';
        document.getElementById('customer-bill').value = priceString.replace(/[^0-9]/g, '');
    }
    
    function openAddForm() {
        customerForm.reset();
        currentEditingRowNumber = null;
        document.getElementById('modal-title').textContent = 'Tambah Pelanggan';
        document.getElementById('save-btn-text').textContent = 'Simpan';
        lastView = 'list'; // Jika batal, kembali ke list
        switchView('form');
    }
    
    function openEditForm(customerData) {
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
        
        lastView = 'detail'; // Jika batal, kembali ke detail
        switchView('form');
    }
    
    function handleEditFromDetailView() {
        const customerData = allData.find(item => item.rowNumber === currentEditingRowNumber);
        if (customerData) openEditForm(customerData);
    }

    function openDetailView(customer) {
        currentEditingRowNumber = customer.rowNumber;
        const profileImage = document.getElementById('detail-profile-image');
        if (customer.FOTO && customer.FOTO.startsWith('http')) {
            profileImage.style.backgroundImage = `url('${customer.FOTO}')`;
            profileImage.innerHTML = '';
        } else {
            profileImage.style.backgroundImage = 'none';
            profileImage.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" fill="currentColor" viewBox="0 0 256 256" class="text-gray-500"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path></svg>`;
        }
        
        document.getElementById('detail-customer-name').textContent = customer.NAMA || '-';
        document.getElementById('detail-customer-id').textContent = customer.IDPL || '-';
        
        const details = {
            'idpl': customer.IDPL, 'nama': customer.NAMA, 'alamat': customer.ALAMAT,
            'gender': customer['JENIS KELAMIN'], 'whatsapp': customer.WHATSAPP, 'paket': customer.PAKET,
            'tagihan': customer.TAGIHAN ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(customer.TAGIHAN) : '-',
            'status': customer.STATUS, 'tanggal-pasang': customer['TANGGAL PASANG'] ? new Date(customer['TANGGAL PASANG']).toLocaleDateString('id-ID') : '-',
            'jenis-perangkat': customer['JENIS PERANGKAT'], 'ip-static': customer['IP STATIC / PPOE']
        };
        for (const key in details) {
            document.getElementById(`detail-${key}`).textContent = details[key] || '-';
        }
        
        loadUnpaidBills(customer.IDPL);
        switchView('detail');
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const saveBtn = document.getElementById('save-customer-btn');
        const isEditing = !!currentEditingRowNumber;
        if (isEditing && !confirm('Yakin ingin menyimpan perubahan?')) return;

        const formData = {
            nama: document.getElementById('customer-name').value, alamat: document.getElementById('customer-address').value,
            whatsapp: document.getElementById('customer-whatsapp').value, jenisKelamin: document.getElementById('customer-gender').value,
            paket: document.getElementById('customer-package').value, tagihan: document.getElementById('customer-bill').value,
            status: document.getElementById('customer-status').value, jenisPerangkat: document.getElementById('customer-device').value,
            ipStatic: document.getElementById('customer-ip').value
        };

        setButtonLoading(saveBtn, true, isEditing ? 'Update' : 'Simpan');
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: isEditing ? 'updatePelanggan' : 'addPelanggan',
                    rowNumber: currentEditingRowNumber, data: formData
                })
            });
            showSuccessNotification(isEditing ? 'Data berhasil diperbarui!' : 'Pelanggan baru berhasil ditambahkan!');
            fetchData();
        } catch (error) {
            showErrorNotification(`Gagal terhubung ke server.`);
        } finally {
            setButtonLoading(saveBtn, false, isEditing ? 'Update' : 'Simpan');
        }
    }

    // ===============================================
    // UI Helpers (Termasuk Skeleton Loading Anda)
    // ===============================================
    function showLoading() {
        customerList.innerHTML = Array(6).fill('').map(() => `<div class="skeleton-item flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-100 animate-pulse"><div class="flex items-center gap-4"><div class="bg-gray-200 rounded-full h-14 w-14"></div><div class="flex flex-col justify-center gap-2"><div class="bg-gray-200 h-4 w-32 rounded"></div><div class="bg-gray-200 h-3 w-24 rounded"></div></div></div><div class="shrink-0"><div class="bg-gray-200 size-3 rounded-full"></div></div></div>`).join('');
    }

    async function loadUnpaidBills(customerId) {
        const unpaidBillsSection = document.getElementById('unpaid-bills-section');
        const unpaidBillsList = document.getElementById('unpaid-bills-list');
        unpaidBillsSection.classList.remove('hidden');
        unpaidBillsList.innerHTML = '<p class="text-sm text-gray-500 px-4">Memuat tagihan...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}?action=getTagihan`);
            const responseData = await response.json();
            const customerUnpaidBills = responseData.filter(bill => bill.IDPL === customerId && bill.STATUS !== 'LUNAS');
            
            if (customerUnpaidBills.length > 0) {
                unpaidBillsList.innerHTML = '';
                customerUnpaidBills.forEach(bill => {
                    unpaidBillsList.innerHTML += `<div class="flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between"><div class="flex flex-col justify-center"><p class="text-[#110e1b] text-base font-medium">${bill.NAMA || '-'}</p><p class="text-[#625095] text-sm">${bill['PERIODE TAGIHAN'] || ''}</p></div><div class="shrink-0"><p class="text-[#110e1b] text-base">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(bill.TAGIHAN)}</p></div></div>`;
                });
            } else {
                unpaidBillsList.innerHTML = '<p class="text-sm text-gray-500 px-4">Tidak ada tagihan yang belum dibayar.</p>';
            }
        } catch (error) {
            unpaidBillsList.innerHTML = `<p class="text-sm text-red-500 px-4">Gagal memuat tagihan.</p>`;
        }
    }
    
    function setButtonLoading(button, isLoading, originalText) {
        const span = button.querySelector('span');
        if (span) {
            button.disabled = isLoading;
            span.textContent = isLoading ? 'Memproses...' : originalText;
        }
    }

    function showSuccessNotification(message) { alert(message); }
    function showErrorNotification(message) { alert(message); }
});
