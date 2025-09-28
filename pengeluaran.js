// pengeluaran.js (Supabase Version)
import { supabase } from './supabase-client.js';
import { requireRole } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Pengeluaran page loaded, checking authentication...');
    
    try {
        const user = await requireRole('ADMIN');
        if (!user) {
            console.log('Authentication failed, user will be redirected');
            return;
        }
        console.log('Authentication successful for user:', user.id);
    } catch (error) {
        console.error('Authentication error:', error);
        return;
    }
    
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    let allData = [];
    let filteredData = [];
    let currentEditingId = null;

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const expenseList = document.getElementById('expense-list');
    const searchInput = document.getElementById('search-input');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const addExpenseModal = document.getElementById('add-expense-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveExpenseBtn = document.getElementById('save-expense-btn');
    const expenseDescription = document.getElementById('expense-description');
    const expenseAmount = document.getElementById('expense-amount');
    const expenseDate = document.getElementById('expense-date');

    // New Filter Elements
    const filterBtn = document.getElementById('filter-btn');
    const filterModal = document.getElementById('filter-modal');
    const closeFilterModalBtn = document.getElementById('close-filter-modal-btn');
    const startDateInput = document.getElementById('start-date-input');
    const endDateInput = document.getElementById('end-date-input');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const totalExpenseContainer = document.getElementById('total-expense-container');
    const totalExpenseDisplay = document.getElementById('total-expense-display');
    const filterInfo = document.getElementById('filter-info');

    // ===============================================
    // Initial Setup
    // ===============================================
    console.log('Initializing event listeners and fetching data...');
    initializeEventListeners();
    await fetchData();

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', handleSearch);
        
        addExpenseBtn.addEventListener('click', openAddExpenseModal);
        closeModalBtn.addEventListener('click', closeAddExpenseModal);
        saveExpenseBtn.addEventListener('click', handleSaveExpense);
        
        addExpenseModal.addEventListener('click', (e) => {
            if (e.target === addExpenseModal) closeAddExpenseModal();
        });
        
        // Filter Listeners
        filterBtn.addEventListener('click', () => filterModal.classList.remove('hidden'));
        closeFilterModalBtn.addEventListener('click', () => filterModal.classList.add('hidden'));
        filterModal.addEventListener('click', (e) => {
            if (e.target === filterModal) filterModal.classList.add('hidden');
        });
        applyFilterBtn.addEventListener('click', handleApplyFilter);
        resetFilterBtn.addEventListener('click', handleResetFilter);

        expenseDate.value = new Date().toISOString().split('T')[0];
    }

    // ===============================================
    // Data Fetching
    // ===============================================
    async function fetchData(startDate = null, endDate = null) {
        showLoading();
        try {
            let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });

            if (startDate) {
                query = query.gte('expense_date', startDate);
            }
            if (endDate) {
                query = query.lte('expense_date', endDate);
            }

            const { data, error } = await query;

            if (error) throw new Error(error.message);

            allData = data || [];
            
            handleSearch();
            
            updateFilterInfo(startDate, endDate);

        } catch (error) {
            console.error('Error fetching data:', error);
            expenseList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }
    
    // ===============================================
    // Filtering Logic
    // ===============================================
    function handleApplyFilter() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (startDate && endDate && startDate > endDate) {
            showErrorNotification('Tanggal awal tidak boleh melebihi tanggal akhir.');
            return;
        }
        
        fetchData(startDate || null, endDate || null);
        totalExpenseContainer.classList.remove('hidden');
        filterModal.classList.add('hidden');
    }

    function handleResetFilter() {
        startDateInput.value = '';
        endDateInput.value = '';
        fetchData();
        totalExpenseContainer.classList.add('hidden');
        filterModal.classList.add('hidden');
    }
    
    function updateFilterInfo(startDate, endDate) {
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '...';
            const end = endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '...';
            filterInfo.textContent = `Filter aktif: ${start} - ${end}`;
        } else {
            filterInfo.textContent = '';
        }
    }

    // ===============================================
    // Search Functionality
    // ===============================================
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(expense => {
                const description = (expense.description || '').toLowerCase();
                const amount = expense.amount ? expense.amount.toString() : '';
                const date = expense.expense_date || '';
                
                return description.includes(searchTerm) || 
                       amount.includes(searchTerm) || 
                       date.includes(searchTerm);
            });
        }
        
        renderList();
    }

    // ===============================================
    // Rendering
    // ===============================================
    function renderList() {
        expenseList.innerHTML = '';

        if (filteredData.length === 0) {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                expenseList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada pengeluaran yang cocok dengan pencarian "${searchTerm}".</p>`;
            } else {
                expenseList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada data pengeluaran untuk filter ini.</p>`;
            }
        } else {
            filteredData.forEach(item => {
                const expenseItem = createExpenseItem(item);
                expenseList.appendChild(expenseItem);
            });
        }
        
        updateTotalExpense();
    }
    
    function createExpenseItem(item) {
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
        const amount = item.amount ? formatter.format(item.amount) : 'N/A';
        const date = item.expense_date ? new Date(item.expense_date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
        const description = item.description || 'Deskripsi tidak tersedia';

        const expenseItem = document.createElement('div');
        expenseItem.className = "flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-200";
        expenseItem.innerHTML = `
            <div class="flex flex-col justify-center flex-1">
                <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${description}</p>
                <p class="text-gray-500 text-sm font-normal leading-normal">${date}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                 <p class="text-red-600 text-base font-medium leading-normal">${amount}</p>
                <div class="flex gap-1">
                    <button class="edit-expense-btn text-blue-600 hover:text-blue-800 p-1" data-id="${item.id}" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96A16,16,0,0,0,227.31,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.31,64l24-24L216,84.69Z"></path></svg>
                    </button>
                    <button class="delete-expense-btn text-red-600 hover:text-red-800 p-1" data-id="${item.id}" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
                    </button>
                </div>
            </div>
        `;
        
        expenseItem.querySelector('.edit-expense-btn').addEventListener('click', () => openEditExpenseModal(item));
        expenseItem.querySelector('.delete-expense-btn').addEventListener('click', () => handleDeleteExpense(item.id));
        
        return expenseItem;
    }
    
    function updateTotalExpense() {
        const total = filteredData.reduce((sum, item) => sum + (item.amount || 0), 0);
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
        totalExpenseDisplay.textContent = formatter.format(total);
    }

    // ===============================================
    // Modal Functions
    // ===============================================
    function openAddExpenseModal() {
        addExpenseModal.classList.remove('hidden');
        document.querySelector('#add-expense-modal h2').textContent = 'Tambah Pengeluaran';
        saveExpenseBtn.textContent = 'SIMPAN';
        currentEditingId = null;
        expenseDescription.value = '';
        expenseAmount.value = '';
        expenseDate.value = new Date().toISOString().split('T')[0];
        expenseDescription.focus();
    }

    function closeAddExpenseModal() {
        addExpenseModal.classList.add('hidden');
    }

    function openEditExpenseModal(item) {
        addExpenseModal.classList.remove('hidden');
        expenseDescription.value = item.description || '';
        expenseAmount.value = item.amount || '';
        expenseDate.value = item.expense_date ? new Date(item.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        document.querySelector('#add-expense-modal h2').textContent = 'Edit Pengeluaran';
        saveExpenseBtn.textContent = 'UPDATE';
        currentEditingId = item.id;
        expenseDescription.focus();
    }

    // ===============================================
    // Add/Edit Expense Functionality
    // ===============================================
    async function handleSaveExpense() {
        const description = expenseDescription.value.trim();
        const amount = expenseAmount.value.trim();
        const date = expenseDate.value;
        const isEditing = !!currentEditingId;

        if (!description || !amount || !date) {
            showErrorNotification('Mohon lengkapi semua field');
            return;
        }

        if (isNaN(amount) || parseFloat(amount) <= 0) {
            showErrorNotification('Jumlah harus berupa angka yang valid');
            return;
        }

        showPaymentLoading(isEditing ? 'Mengupdate pengeluaran...' : 'Menyimpan pengeluaran...');

        try {
            const expenseData = {
                description: description,
                amount: parseFloat(amount),
                expense_date: date
            };

            if (isEditing) {
                const { error } = await supabase.from('expenses').update(expenseData).eq('id', currentEditingId);
                if (error) throw error;
                showSuccessNotification('Pengeluaran berhasil diupdate');
            } else {
                const { error } = await supabase.from('expenses').insert([expenseData]);
                if (error) throw error;
                showSuccessNotification('Pengeluaran berhasil ditambahkan');
            }

            closeAddExpenseModal();
            fetchData(startDateInput.value || null, endDateInput.value || null);

        } catch (error) {
            console.error('Error saving expense:', error);
            showErrorNotification(`Error: ${error.message}`);
        } finally {
            hidePaymentLoading();
        }
    }

    // ===============================================
    // Delete Expense Functionality
    // ===============================================
    async function handleDeleteExpense(expenseId) {
        if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) {
            return;
        }

        showPaymentLoading('Menghapus pengeluaran...');

        try {
            const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
            if (error) throw error;

            showSuccessNotification('Pengeluaran berhasil dihapus');
            fetchData(startDateInput.value || null, endDateInput.value || null);

        } catch (error) {
            console.error('Error deleting expense:', error);
            showErrorNotification(`Error: ${error.message}`);
        } finally {
            hidePaymentLoading();
        }
    }

    // ===============================================
    // UI Feedback Functions (Loading, Notifications)
    // ===============================================
    function showLoading() {
        expenseList.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'skeleton-item flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="flex flex-col justify-center flex-1 gap-2 py-2">
                    <div class="skeleton-line h-4 bg-gray-200 rounded w-3/4"></div>
                    <div class="skeleton-line h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div class="shrink-0">
                    <div class="skeleton-line h-5 bg-gray-200 rounded w-20"></div>
                </div>
            `;
            expenseList.appendChild(skeletonItem);
        }
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `@keyframes skeleton-loading { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } } .skeleton-line { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200px 100%; animation: skeleton-loading 1.5s infinite; }`;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        const skeletonItems = document.querySelectorAll('.skeleton-item');
        skeletonItems.forEach(item => item.remove());
    }
    
    function showPaymentLoading(text = 'Memproses...') {
        let loadingOverlay = document.getElementById('payment-loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'payment-loading-overlay';
            loadingOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
            loadingOverlay.innerHTML = `<div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);"><div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #683fe4; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div><div id="loading-text">${text}</div></div>`;
            document.body.appendChild(loadingOverlay);
            if (!document.getElementById('payment-loading-styles')) {
                const style = document.createElement('style');
                style.id = 'payment-loading-styles';
                style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
                document.head.appendChild(style);
            }
        } else {
            document.getElementById('loading-text').textContent = text;
            loadingOverlay.classList.remove('hidden');
        }
    }

    function hidePaymentLoading() {
        const loadingOverlay = document.getElementById('payment-loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
    
    function showSuccessNotification(message) {
        showNotification(message, '#28a745');
    }
    
    function showErrorNotification(message) {
        showNotification(message, '#dc3545');
    }

    function showNotification(message, color) {
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.style.backgroundColor = color;
        notification.textContent = message;
        document.body.appendChild(notification);

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .custom-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    z-index: 1002;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s forwards;
                }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
});