// pelanggan.js (Versi Final dengan Perbaikan Format Tanggal, CRUD, dan Error Handling)

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
     async function fetchData() {
        try {
            const response = await fetch(`${API_BASE_URL}?action=getPelanggan`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const responseData = await response.json();

            if (!Array.isArray(responseData)) {
                if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
                throw new TypeError('Format data yang diterima dari server salah.');
            }
            
            allData = responseData.sort((a, b) => b.rowNumber - a.rowNumber); // Urutkan data terbaru di atas
            filteredData = [...allData];
            renderPage();
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
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
            
            // --- PERBAIKAN UTAMA DI SINI: Format Tampilan Tanggal ---
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

    function renderPagination() { /* ... Tidak ada perubahan ... */ }

    // ===============================================
    // Form & Modal Logic
    // ===============================================
    function populatePaketDropdown() { /* ... Tidak ada perubahan ... */ }
    function handlePaketChange(event) { /* ... Tidak ada perubahan ... */ }
    function openModal(modalElement) { /* ... Tidak ada perubahan ... */ }
    function closeModal(modalElement) { /* ... Tidak ada perubahan ... */ }
    function showAddModal() { /* ... Tidak ada perubahan ... */ }
    function showEditModal(rowNumber) { /* ... Tidak ada perubahan ... */ }
    function showViewModal(rowNumber) { /* ... Tidak ada perubahan ... */ }

    // ===============================================
    // CRUD Action Handlers
    // ===============================================
    async function handleFormSubmit(event) {
        event.preventDefault();
        const rowNumber = document.getElementById('rowNumber').value;
        const isEditing = !!rowNumber;

        const formData = {
            nama: document.getElementById('nama').value,
            alamat: document.getElementById('alamat').value,
            whatsapp: document.getElementById('whatsapp').value,
            jenisKelamin: document.getElementById('jenisKelamin').value,
            paket: document.getElementById('paket').value,
            tagihan: document.getElementById('tagihan').value,
            status: document.getElementById('status').value,
            jenisPerangkat: document.getElementById('jenisPerangkat').value,
        };
        
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
        } else if (button.classList.contains('edit-btn')) {
            showEditModal(rowNumber);
        } else if (button.classList.contains('delete-btn')) {
            deleteData(rowNumber);
        }
    }

    async function deleteData(rowNumber) {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

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
            noBillsMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>Gagal memuat data tagihan. ${error.message}</p>`;
        }
    }
});
                
