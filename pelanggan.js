// pelanggan.js (Versi Final dengan Pencarian & Pagination)

document.addEventListener('DOMContentLoaded', () => {
    // Logika session check & logout sudah dihandle oleh auth.js.

    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_URL = `${window.AppConfig.API_BASE_URL}?action=getPelanggan`;
    let allData = [];
    let filteredData = [];
    let currentPage = 1;
    let rowsPerPage = 10; // Nilai default

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

    // Modals
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
        // Event listener untuk input pencarian
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

        // Event listener untuk dropdown jumlah baris
        rowsPerPageSelector.addEventListener('change', () => {
            rowsPerPage = parseInt(rowsPerPageSelector.value, 10);
            currentPage = 1; // Kembali ke halaman pertama
            renderPage();
        });

        // Event listener untuk modal
        document.getElementById('show-add-modal-btn').addEventListener('click', showAddModal);
        formModal.querySelector('.close-btn').addEventListener('click', () => closeModal(formModal));
        viewModal.querySelector('.close-btn').addEventListener('click', () => closeModal(viewModal));
        window.addEventListener('click', (event) => {
            if (event.target == formModal) closeModal(formModal);
            if (event.target == viewModal) closeModal(viewModal);
        });

        // Event listener untuk form dan tabel
        form.addEventListener('submit', handleFormSubmit);
        tableBody.addEventListener('click', handleTableClick);
        document.getElementById('paket').addEventListener('change', handlePaketChange);
    }

    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
    async function fetchData() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Gagal mengambil data dari server');
            allData = await response.json();
            filteredData = [...allData];
            renderPage();
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Gagal memuat data.</td></tr>`;
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
            const row = `
                <tr>
                    <td>${item.IDPL || ''}</td>
                    <td>${item.NAMA || ''}</td>
                    <td>${item.WHATSAPP || ''}</td>
                    <td>${item.PAKET || ''}</td>
                    <td><span class="status-pill ${statusClass}">${status}</span></td>
                    <td>${item['TANGGAL PASANG'] || ''}</td>
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
        
        handlePaketChange({ target: document.getElementById('paket') });
        openModal(formModal);
    }

    function showViewModal(rowNumber) {
        const dataToView = allData.find(item => item.rowNumber == rowNumber);
        if (!dataToView) return;

        document.getElementById('view-modal-title').textContent = `Detail Pelanggan: ${dataToView.NAMA}`;
        const body = document.getElementById('view-modal-body');
        body.innerHTML = '';
        
        // Only show specified fields: NAMA, ALAMAT, JENIS KELAMIN, PAKET, WHATSAPP, TANGGAL PASANG, JENIS PERANGKAT, IP STATIC / PPOE
        const fields = ['NAMA', 'ALAMAT', 'JENIS KELAMIN', 'PAKET', 'WHATSAPP', 'TANGGAL PASANG', 'JENIS PERANGKAT', 'IP STATIC / PPOE'];
        fields.forEach(field => {
            const value = dataToView[field] || '-';
            body.innerHTML += `<div class="view-item"><strong>${field}</strong><span>${value}</span></div>`;
        });
        
        // Load unpaid bills for this customer
        loadUnpaidBills(dataToView.IDPL, dataToView.NAMA);
        
        openModal(viewModal);
    }

    // ===============================================
    // CRUD Action Handlers
    // ===============================================
    async function handleFormSubmit(event) {
        event.preventDefault();
        const rowNumber = document.getElementById('rowNumber').value;
        const isEditing = !!rowNumber;

        const formData = {
            // Data dari form
            nama: document.getElementById('nama').value,
            alamat: document.getElementById('alamat').value,
            whatsapp: document.getElementById('whatsapp').value,
            jenisKelamin: document.getElementById('jenisKelamin').value,
            paket: document.getElementById('paket').value,
            tagihan: document.getElementById('tagihan').value,
            status: document.getElementById('status').value,
            jenisPerangkat: document.getElementById('jenisPerangkat').value,
        };
        
        const url = isEditing ? `${API_URL}/${rowNumber}` : API_URL;
        const method = isEditing ? 'PUT' : 'POST';
        
        // Untuk mode edit (PUT), kita perlu mengirim semua kolom agar tidak terhapus
        if (isEditing) {
            const originalData = allData.find(item => item.rowNumber == rowNumber);
            formData.NAMA = formData.nama;
            formData.ALAMAT = formData.alamat;
            formData.WHATSAPP = formData.whatsapp;
            formData['JENIS KELAMIN'] = formData.jenisKelamin;
            formData.PAKET = formData.paket;
            formData.TAGIHAN = formData.tagihan;
            formData.STATUS = formData.status;
            formData['JENIS PERANGKAT'] = formData.jenisPerangkat;
            // Pertahankan data yang tidak ada di form
            formData['IP STATIC / PPOE'] = originalData ? originalData['IP STATIC / PPOE'] : '';
            formData.FOTO = originalData ? originalData.FOTO : '';
        }

        try {
            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: isEditing ? 'updatePelanggan' : 'addPelanggan',
                    rowNumber: isEditing ? rowNumber : undefined,
                    data: formData
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data');
            
            alert(result.message);
            closeModal(formModal);
            fetchData();
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(`Error: ${error.message}`);
        }
    }

    function handleTableClick(event) {
        const button = event.target.closest('button');
        if (!button) return;

        const rowNumber = button.dataset.row;
        if (button.classList.contains('view-btn')) {
            showViewModal(rowNumber);
        }
        if (button.classList.contains('edit-btn')) {
            showEditModal(rowNumber);
        }
        if (button.classList.contains('delete-btn')) {
            if (confirm(`Apakah Anda yakin ingin menghapus data ini?`)) {
                deleteData(rowNumber);
            }
        }
    }

    async function deleteData(rowNumber) {
        try {
            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'deletePelanggan',
                    rowNumber: rowNumber
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal menghapus data');
            
            alert(result.message);
            fetchData();
        } catch (error) {
            console.error('Error deleting data:', error);
            alert(`Error: ${error.message}`);
        }
    }

    // ===============================================
    // UNPAID BILLS FUNCTIONALITY
    // ===============================================
    async function loadUnpaidBills(customerIdpl, customerName) {
        const noBillsMessage = document.getElementById('no-bills-message');
        const billsTableContainer = document.getElementById('bills-table-container');
        const unpaidBillsBody = document.getElementById('unpaid-bills-body');
        
        try {
            // Show loading state
            noBillsMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Memuat tagihan...</p>';
            noBillsMessage.style.display = 'block';
            billsTableContainer.style.display = 'none';
            
            // Fetch unpaid bills from tagihan endpoint
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getTagihan`);
            if (!response.ok) throw new Error('Gagal mengambil data tagihan');
            
            const allBills = await response.json();
            
            // Filter bills for this specific customer
            const customerBills = allBills.filter(bill => 
                bill.IDPL === customerIdpl && 
                bill.IDPL && bill.IDPL.trim() !== '' &&
                bill.NAMA && bill.NAMA.trim() !== '' &&
                bill.STATUS && 
                bill.STATUS.toUpperCase() === 'BELUM LUNAS'
            );
            
            if (customerBills.length === 0) {
                // No unpaid bills
                noBillsMessage.innerHTML = '<i class="fas fa-check-circle"></i><p>Tidak ada tagihan yang belum lunas</p>';
                noBillsMessage.style.display = 'block';
                billsTableContainer.style.display = 'none';
            } else {
                // Display unpaid bills in table
                noBillsMessage.style.display = 'none';
                billsTableContainer.style.display = 'block';
                
                unpaidBillsBody.innerHTML = '';
                customerBills.forEach(bill => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${bill['PERIODE TAGIHAN'] || '-'}</td>
                        <td class="bill-amount">${bill.TAGIHAN || '-'}</td>
                        <td><span class="status-pill status-belum-lunas">${bill.STATUS || 'BELUM LUNAS'}</span></td>
                    `;
                    unpaidBillsBody.appendChild(row);
                });
            }
            
        } catch (error) {
            console.error('Error loading unpaid bills:', error);
            noBillsMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i><p>Gagal memuat data tagihan</p>';
            noBillsMessage.style.display = 'block';
            billsTableContainer.style.display = 'none';
        }
    }
});