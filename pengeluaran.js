// pengeluaran.js (Versi Final dengan Perbaikan Urutan, Edit Tanggal, Format Tampilan, dan Pagination)

document.addEventListener('DOMContentLoaded', () => {
    // State Management & Global Variables
    const API_URL = `${window.AppConfig.API_BASE_URL}?action=getPengeluaran`;
    let allData = [];
    let filteredData = [];
    let currentPage = 1;
    let rowsPerPage = 10;

    // DOM Selectors
    const tableBody = document.getElementById('data-body');
    const searchInput = document.getElementById('search-input');
    const paginationControls = document.getElementById('pagination-controls');
    const paginationInfo = document.getElementById('pagination-info');
    const rowsPerPageSelector = document.getElementById('rows-per-page');
    const formModal = document.getElementById('form-modal');
    const form = document.getElementById('data-form');

    // Initial Setup
    initializeEventListeners();
    fetchData();

    // Event Listeners Setup
    function initializeEventListeners() {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            filteredData = allData.filter(item =>
                Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm))
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
        window.addEventListener('click', (event) => {
            if (event.target == formModal) closeModal(formModal);
        });

        form.addEventListener('submit', handleFormSubmit);
        tableBody.addEventListener('click', handleTableClick);
    }

    // ===============================================
    // DATA FETCH & DISPLAY LOGIC (DIPERBAIKI)
    // ===============================================
    async function fetchData() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const responseData = await response.json();

            if (!Array.isArray(responseData)) {
                if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
                throw new TypeError('Format data yang diterima dari server salah.');
            }
            
            allData = responseData.sort((a, b) => b.rowNumber - a.rowNumber);
            
            filteredData = [...allData];
            renderPage();
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Gagal memuat data. ${error.message}</td></tr>`;
        }
    }

    function renderPage() {
        renderTable();
        renderPagination(); // Memastikan pagination selalu di-render
    }

    function renderTable() {
        tableBody.innerHTML = '';
        if (filteredData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tidak ada data ditemukan.</td></tr>`;
            return;
        }
        const pageData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
        
        pageData.forEach(item => {
            const jumlahFormatted = new Intl.NumberFormat('id-ID', { 
                style: 'currency', 
                currency: 'IDR',
                minimumFractionDigits: 0 
            }).format(String(item.JUMLAH || '0').replace(/[^0-9]/g, ''));

            const tanggalDisplay = item.TANGGAL ? new Date(item.TANGGAL).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

            const row = `
                <tr>
                    <td>${item.ID || ''}</td>
                    <td>${item['DESKRIPSI PENGELUARAN'] || ''}</td>
                    <td>${jumlahFormatted}</td>
                    <td>${tanggalDisplay}</td>
                    <td>
                        <button class="btn action-btn edit-btn" data-row="${item.rowNumber}"><i class="fas fa-edit"></i></button>
                        <button class="btn action-btn delete-btn" data-row="${item.rowNumber}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }

    // ===============================================
    // PAGINATION LOGIC (DIKEMBALIKAN)
    // ===============================================
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
    // MODAL & FORM LOGIC (DIPERBAIKI)
    // ===============================================
    function openModal(modalElement) { modalElement.classList.add('show'); }
    function closeModal(modalElement) { modalElement.classList.remove('show'); }

    function showAddModal() {
        form.reset();
        document.getElementById('rowNumber').value = '';
        document.getElementById('modal-title').textContent = 'Tambah Pengeluaran';
        document.getElementById('tanggal').valueAsDate = new Date();
        openModal(formModal);
    }
    
    function showEditModal(rowNumber) {
        const dataToEdit = allData.find(item => item.rowNumber == rowNumber);
        if (!dataToEdit) return;

        form.reset();
        document.getElementById('modal-title').textContent = 'Edit Pengeluaran';
        document.getElementById('rowNumber').value = dataToEdit.rowNumber;
        document.getElementById('deskripsi').value = dataToEdit['DESKRIPSI PENGELUARAN'] || '';
        document.getElementById('jumlah').value = String(dataToEdit.JUMLAH || '').replace(/\D/g, '');

        if (dataToEdit.TANGGAL) {
            document.getElementById('tanggal').valueAsDate = new Date(dataToEdit.TANGGAL);
        } else {
            document.getElementById('tanggal').value = '';
        }

        openModal(formModal);
    }

    // ===============================================
    // CRUD HANDLERS (DIPERBAIKI)
    // ===============================================
    async function handleFormSubmit(event) {
        event.preventDefault();
        const rowNumber = document.getElementById('rowNumber').value;
        const isEditing = !!rowNumber;
        
        const formData = {
            DESKRIPSI_PENGELUARAN: document.getElementById('deskripsi').value,
            JUMLAH: document.getElementById('jumlah').value,
            TANGGAL: document.getElementById('tanggal').value,
        };

        try {
            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: isEditing ? 'updatePengeluaran' : 'addPengeluaran',
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

    async function deleteData(rowNumber) {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
        
        try {
            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'deletePengeluaran',
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

    function handleTableClick(event) {
        const button = event.target.closest('button');
        if (!button) return;
        const rowNumber = button.dataset.row;
        if (button.classList.contains('edit-btn')) {
            showEditModal(rowNumber);
        }
        if (button.classList.contains('delete-btn')) {
            deleteData(rowNumber);
        }
    }
});


   
            
