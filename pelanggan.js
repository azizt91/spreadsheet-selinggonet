// pelanggan.js (Versi Final dengan Perbaikan Format Tanggal, Pengurutan, CRUD, dan Pagination Lengkap)

document.addEventListener('DOMContentLoaded', () => {
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_BASE_URL = window.AppConfig.API_BASE_URL;
    let allData = [];
    let filteredData = [];
    let currentPage = 1;
    let rowsPerPage = 10;

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
    const tableBody = document.getElementById('data-body');
    const searchInput = document.getElementById('search-input');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationInfo = document.getElementById('pagination-info');
    const rowsPerPageSelector = document.getElementById('rows-per-page');
    const formModal = document.getElementById('form-modal');
    const viewModal = document.getElementById('view-modal');
    const form = document.getElementById('data-form');

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
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            filteredData = allData.filter(item =>
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

        document.getElementById('show-add-modal-btn').addEventListener('click', showAddModal);
        formModal.querySelector('.close-btn').addEventListener('click', () => closeModal(formModal));
        viewModal.querySelector('.close-btn').addEventListener('click', () => closeModal(viewModal));
        window.addEventListener('click', (event) => {
            if (event.target == formModal) closeModal(formModal);
            if (event.target == viewModal) closeModal(viewModal);
        });

        form.addEventListener('submit', handleFormSubmit);
        tableBody.addEventListener('click', handleTableClick);
        document.getElementById('paket').addEventListener('change', handlePaketChange);
    }

    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
    //  async function fetchData() {
    //     showLoading('Memuat data pelanggan, harap tunggu...');
        
    //     try {
    //         const response = await fetch(`${API_BASE_URL}?action=getPelanggan`);
    //         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    //         const responseData = await response.json();

    //         if (!Array.isArray(responseData)) {
    //             if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
    //             throw new TypeError('Format data yang diterima dari server salah.');
    //         }
            
    //         // Mengurutkan data terbaru (rowNumber terbesar) di paling atas
    //         allData = responseData.sort((a, b) => b.rowNumber - a.rowNumber);
    //         filteredData = [...allData];
    //         renderPage();
    //     } catch (error) {
    //         console.error('Error fetching data:', error);
    //         tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
    //     } finally {
    //         hideLoading();
    //     }
    // }

    //-----------------fetch Pelanggan---------------------------

    async function fetchData() {
        showLoading('Memuat data pelanggan, harap tunggu...');
        
        try {
            // --- PERUBAHAN DIMULAI DI SINI ---
            // 1. Baca parameter 'status' dari URL
            const urlParams = new URLSearchParams(window.location.search);
            const filterStatus = urlParams.get('status'); // Akan berisi 'AKTIF' atau 'NONAKTIF'
    
            const response = await fetch(`${API_BASE_URL}?action=getPelanggan`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const responseData = await response.json();
    
            if (!Array.isArray(responseData)) {
                if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
                throw new TypeError('Format data yang diterima dari server salah.');
            }
            
            let rawData = responseData.sort((a, b) => b.rowNumber - a.rowNumber);
            
            // 2. Terapkan filter jika ada parameter status
            if (filterStatus) {
                allData = rawData.filter(item => (item.STATUS || '').toUpperCase() === filterStatus.toUpperCase());
                
                // Nonaktifkan search bar dan beri judul
                searchInput.placeholder = `Menampilkan Pelanggan ${filterStatus}`;
                searchInput.disabled = true;
            } else {
                allData = rawData;
            }
            // --- PERUBAHAN SELESAI ---
    
            filteredData = [...allData];
            renderPage();
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
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
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Tidak ada data ditemukan.</td></tr>`;
            return;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        pageData.forEach(item => {
            const status = item.STATUS || 'N/A';
            const statusClass = status.toUpperCase() === 'AKTIF' ? 'status-aktif' : 'status-nonaktif';
            
            // PERBAIKAN: Format tampilan tanggal
            const tanggalPasangDisplay = item['TANGGAL PASANG'] 
                ? new Date(item['TANGGAL PASANG']).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                : '-';

            const row = `
                <tr>
                    <td>${item.IDPL || ''}</td>
                    <td>${item.NAMA || ''}</td>
                    <td>${item.WHATSAPP || ''}</td>
                    <td>${item.PAKET || ''}</td>
                    <td><span class="status-pill ${statusClass}">${status}</span></td>
                    <td>${tanggalPasangDisplay}</td>
                    <td>
                        <button class="btn action-btn view-btn" data-row="${item.rowNumber}"><i class="fas fa-eye"></i></button>
                        <button class="btn action-btn edit-btn" data-row="${item.rowNumber}"><i class="fas fa-edit"></i></button>
                        <button class="btn action-btn delete-btn" data-row="${item.rowNumber}"><i class="fas fa-trash"></i></button>
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

        paginationControls.appendChild(createButton('&laquo;', currentPage - 1, currentPage === 1));

        const pagesToShow = [];
        const maxVisibleButtons = 7;
        if (totalPages <= maxVisibleButtons) {
            for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
        } else {
            pagesToShow.push(1);
            if (currentPage > 4) pagesToShow.push('...');
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pagesToShow.push(i);
            if (currentPage < totalPages - 3) pagesToShow.push('...');
            pagesToShow.push(totalPages);
        }

        pagesToShow.forEach(page => {
            if (page === '...') {
                const span = document.createElement('span');
                span.textContent = '...';
                span.style.margin = '0 10px';
                paginationControls.appendChild(span);
            } else {
                paginationControls.appendChild(createButton(page, page, false, page === currentPage));
            }
        });

        paginationControls.appendChild(createButton('&raquo;', currentPage + 1, currentPage === totalPages));

        const startItem = (currentPage - 1) * rowsPerPage + 1;
        const endItem = Math.min(startItem + rowsPerPage - 1, filteredData.length);
        paginationInfo.textContent = `Menampilkan ${startItem}-${endItem} dari ${filteredData.length} data`;
    }

    // ===============================================
    // Form & Modal Logic
    // ===============================================
    function populatePaketDropdown() {
        const paketSelect = document.getElementById('paket');
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
        const tagihanInput = document.getElementById('tagihan');
        tagihanInput.value = paketOptions[selectedPaket] || '';
    }

    function openModal(modalElement) {
        modalElement.classList.add('show');
    }
    
    function closeModal(modalElement) {
        modalElement.classList.remove('show');
    }

    function showAddModal() {
        form.reset();
        document.getElementById('rowNumber').value = '';
        document.getElementById('modal-title').textContent = 'Tambah Pelanggan Baru';
        handlePaketChange({ target: document.getElementById('paket') });
        openModal(formModal);
    }
    
    function showEditModal(rowNumber) {
        const dataToEdit = allData.find(item => item.rowNumber == rowNumber);
        if (!dataToEdit) return;

        form.reset();
        document.getElementById('modal-title').textContent = 'Edit Data Pelanggan';
        
        document.getElementById('rowNumber').value = dataToEdit.rowNumber;
        document.getElementById('nama').value = dataToEdit.NAMA || '';
        document.getElementById('alamat').value = dataToEdit.ALAMAT || '';
        document.getElementById('whatsapp').value = dataToEdit.WHATSAPP || '';
        document.getElementById('jenisKelamin').value = dataToEdit['JENIS KELAMIN'] || 'LAKI-LAKI';
        document.getElementById('paket').value = dataToEdit.PAKET || '';
        document.getElementById('status').value = dataToEdit.STATUS || 'AKTIF';
        document.getElementById('jenisPerangkat').value = dataToEdit['JENIS PERANGKAT'] || '';
        document.getElementById('ipStatic').value = dataToEdit['IP STATIC / PPOE'] || '';
        
        handlePaketChange({ target: document.getElementById('paket') });
        openModal(formModal);
    }

    function showViewModal(rowNumber) {
        const dataToView = allData.find(item => item.rowNumber == rowNumber);
        if (!dataToView) return;

        document.getElementById('view-modal-title').textContent = `Detail Pelanggan: ${dataToView.NAMA}`;
        const body = document.getElementById('view-modal-body');
        body.innerHTML = '';
        
        const fields = ['IDPL', 'NAMA', 'ALAMAT', 'JENIS KELAMIN', 'WHATSAPP', 'PAKET', 'TAGIHAN', 'STATUS', 'TANGGAL PASANG', 'JENIS PERANGKAT', 'IP STATIC / PPOE', 'FOTO'];
        fields.forEach(field => {
            let value = dataToView[field] || '-';
            if (field === 'TANGGAL PASANG' && dataToView[field]) {
                value = new Date(dataToView[field]).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            }
            
            // Special handling for FOTO field - display as image
            if (field === 'FOTO' && value !== '-') {
                body.innerHTML += `<div class="view-item"><strong>${field}</strong><span><img src="${value}" alt="Foto Profil" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;"></span></div>`;
            } else {
                body.innerHTML += `<div class="view-item"><strong>${field}</strong><span>${value}</span></div>`;
            }
        });
        
        loadUnpaidBills(dataToView.IDPL, dataToView.NAMA);
        
        openModal(viewModal);
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

    function setButtonLoading(button, loading, originalText) {
        if (loading) {
            button.dataset.originalText = originalText || button.textContent;
            button.innerHTML = '<span class="loading-spinner"></span>Menyimpan...';
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText || originalText || 'Simpan';
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // ===============================================
    // CRUD Action Handlers
    // ===============================================
    async function handleFormSubmit(event) {
        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        const rowNumber = document.getElementById('rowNumber').value;
        const isEditing = !!rowNumber;

        const formData = {
            nama: document.getElementById('nama').value,
            alamat: document.getElementById('alamat').value,
            whatsapp: document.getElementById('whatsapp').value,
            jenisKelamin: document.getElementById('jenisKelamin').value,
            paket: document.getElementById('paket').value,
            tagihan: document.getElementById('tagihan').value.replace(/[^0-9]/g, ''), // Remove Rp and formatting
            status: document.getElementById('status').value,
            jenisPerangkat: document.getElementById('jenisPerangkat').value,
            ipStatic: document.getElementById('ipStatic').value,
        };
        
        // Debug: Log form data to console
        console.log('Form data being sent:', formData);
        console.log('IP Static field value:', formData.ipStatic);
        
        // Show loading state
        setButtonLoading(submitButton, true);
        showLoading(isEditing ? 'Mengupdate data pelanggan...' : 'Menyimpan data pelanggan...');
        
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: isEditing ? 'updatePelanggan' : 'addPelanggan',
                    rowNumber: isEditing ? rowNumber : null,
                    data: formData
                })
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Hide loading before showing success dialog
            hideLoading();
            setButtonLoading(submitButton, false);
            
            alert(result.message);
            closeModal(formModal);
            fetchData();
        } catch (error) {
            console.error('Error submitting form:', error);
            // Hide loading before showing error
            hideLoading();
            setButtonLoading(submitButton, false);
            alert(`Error: ${error.message}`);
        }
    }

    function handleTableClick(event) {
        const button = event.target.closest('button');
        if (!button) return;

        const rowNumber = button.dataset.row;
        if (button.classList.contains('view-btn')) {
            showViewModal(rowNumber);
        } else if (button.classList.contains('edit-btn')) {
            showEditModal(rowNumber);
        } else if (button.classList.contains('delete-btn')) {
            deleteData(rowNumber);
        }
    }

    async function deleteData(rowNumber) {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

        // Show loading
        showLoading('Menghapus data pelanggan...');

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'deletePelanggan',
                    rowNumber: rowNumber
                })
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Hide loading before showing success dialog
            hideLoading();
            
            alert(result.message);
            fetchData();
        } catch (error) {
            console.error('Error deleting data:', error);
            // Hide loading before showing error
            hideLoading();
            alert(`Error: ${error.message}`);
        }
    }

    // ===============================================
    // UNPAID BILLS FUNCTIONALITY
    // ===============================================
    
    // Color Assignment for Billing Periods
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
    
    async function loadUnpaidBills(customerIdpl, customerName) {
        const noBillsMessage = document.getElementById('no-bills-message');
        const billsTableContainer = document.getElementById('bills-table-container');
        const unpaidBillsBody = document.getElementById('unpaid-bills-body');
        
        try {
            noBillsMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Memuat tagihan...</p>';
            noBillsMessage.style.display = 'block';
            billsTableContainer.style.display = 'none';
            
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getTagihan`);
            if (!response.ok) throw new Error('Gagal mengambil data tagihan');
            const responseData = await response.json();

            if (!Array.isArray(responseData)) {
                throw new Error('Format data tagihan tidak valid.');
            }
            
            const customerBills = responseData.filter(bill => 
                bill.IDPL === customerIdpl && 
                bill.STATUS && bill.STATUS.toUpperCase() === 'BELUM LUNAS'
            );
            
            if (customerBills.length === 0) {
                noBillsMessage.innerHTML = '<i class="fas fa-check-circle"></i><p>Tidak ada tagihan yang belum lunas</p>';
            } else {
                noBillsMessage.style.display = 'none';
                billsTableContainer.style.display = 'block';
                unpaidBillsBody.innerHTML = '';
                customerBills.forEach(bill => {
                    const colorClass = getPeriodColorClass(bill['PERIODE TAGIHAN']);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><span class="period-pill ${colorClass}">${bill['PERIODE TAGIHAN'] || '-'}</span></td>
                        <td class="bill-amount">${bill.TAGIHAN || '-'}</td>
                        <td><span class="status-pill status-belum-lunas">${bill.STATUS || 'BELUM LUNAS'}</span></td>
                    `;
                    unpaidBillsBody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Error loading unpaid bills:', error);
            noBillsMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>Gagal memuat data tagihan. ${error.message}</p>`;
        }
    }
});
