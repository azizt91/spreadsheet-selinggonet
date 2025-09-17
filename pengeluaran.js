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
    let currentEditingId = null;

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const expenseList = document.getElementById('expense-list');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const addExpenseModal = document.getElementById('add-expense-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveExpenseBtn = document.getElementById('save-expense-btn');
    const expenseDescription = document.getElementById('expense-description');
    const expenseAmount = document.getElementById('expense-amount');
    const expenseDate = document.getElementById('expense-date');

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
        addExpenseBtn.addEventListener('click', openAddExpenseModal);
        closeModalBtn.addEventListener('click', closeAddExpenseModal);
        saveExpenseBtn.addEventListener('click', handleSaveExpense);
        
        // Close modal when clicking outside
        addExpenseModal.addEventListener('click', (e) => {
            if (e.target === addExpenseModal) {
                closeAddExpenseModal();
            }
        });
        
        // Set default date to today
        expenseDate.value = new Date().toISOString().split('T')[0];
    }

    // ===============================================
    // Main Data Fetch & Display Logic
    // ===============================================
    async function fetchData() {
        showLoading();
        try {
            console.log('Fetching expenses data...');
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('expense_date', { ascending: false });

            console.log('Supabase response:', { data, error });

            if (error) {
                throw new Error(error.message);
            }

            allData = data || [];
            console.log('Loaded expenses:', allData.length, 'items');
            hideLoading();
            renderList();

        } catch (error) {
            console.error('Error fetching data:', error);
            hideLoading();
            expenseList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
        }
    }

    function renderList() {
        expenseList.innerHTML = '';

        if (allData.length === 0) {
            expenseList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada data pengeluaran.</p>`;
            return;
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        allData.forEach(item => {
            const amount = item.amount ? formatter.format(item.amount) : 'N/A';
            const date = item.expense_date ? new Date(item.expense_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
            const description = item.description || 'Deskripsi tidak tersedia';

            const expenseItem = document.createElement('div');
            expenseItem.className = "flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200";
            expenseItem.innerHTML = `
                <div class="flex flex-col justify-center flex-1">
                    <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${description}</p>
                    <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${amount}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <p class="text-[#110e1b] text-base font-normal leading-normal">${date}</p>
                    <div class="flex gap-1">
                        <button class="edit-expense-btn text-blue-600 hover:text-blue-800 p-1" data-id="${item.id}" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                                <path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96A16,16,0,0,0,227.31,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.31,64l24-24L216,84.69Z"></path>
                            </svg>
                        </button>
                        <button class="delete-expense-btn text-red-600 hover:text-red-800 p-1" data-id="${item.id}" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                                <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listeners for edit and delete buttons
            const editBtn = expenseItem.querySelector('.edit-expense-btn');
            const deleteBtn = expenseItem.querySelector('.delete-expense-btn');
            
            editBtn.addEventListener('click', () => openEditExpenseModal(item));
            deleteBtn.addEventListener('click', () => handleDeleteExpense(item.id));
            
            expenseList.appendChild(expenseItem);
        });
    }

    // ===============================================
    // Modal Functions
    // ===============================================
    function openAddExpenseModal() {
        addExpenseModal.classList.remove('hidden');
        // Clear form
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
        // Fill form with existing data
        expenseDescription.value = item.description || '';
        expenseAmount.value = item.amount || '';
        
        if (item.expense_date) {
            expenseDate.value = new Date(item.expense_date).toISOString().split('T')[0];
        } else {
            expenseDate.value = new Date().toISOString().split('T')[0];
        }
        
        // Change modal title and button text
        document.querySelector('#add-expense-modal h2').textContent = 'Edit Pengeluaran';
        saveExpenseBtn.textContent = 'UPDATE';
        
        // Store the item being edited
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

            let result;
            if (isEditing) {
                const { data, error } = await supabase
                    .from('expenses')
                    .update(expenseData)
                    .eq('id', currentEditingId)
                    .select();
                
                if (error) throw error;
                result = { data, message: 'Pengeluaran berhasil diupdate' };
            } else {
                const { data, error } = await supabase
                    .from('expenses')
                    .insert([expenseData])
                    .select();
                
                if (error) throw error;
                result = { data, message: 'Pengeluaran berhasil ditambahkan' };
            }

            hidePaymentLoading();
            showSuccessNotification(result.message);
            closeAddExpenseModal();
            
            // Reset modal state
            document.querySelector('#add-expense-modal h2').textContent = 'Tambah Pengeluaran';
            saveExpenseBtn.textContent = 'SIMPAN';
            currentEditingId = null;
            
            fetchData(); // Refresh data

        } catch (error) {
            console.error('Error saving expense:', error);
            hidePaymentLoading();
            showErrorNotification(`Error: ${error.message}`);
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
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId);

            if (error) {
                throw new Error(error.message);
            }

            hidePaymentLoading();
            showSuccessNotification('Pengeluaran berhasil dihapus');
            fetchData(); // Refresh data

        } catch (error) {
            console.error('Error deleting expense:', error);
            hidePaymentLoading();
            showErrorNotification(`Error: ${error.message}`);
        }
    }

    // ===============================================
    // Skeleton Loading Functions
    // ===============================================
    function showLoading() {
        // Clear existing content and show skeleton
        expenseList.innerHTML = '';
        
        // Create skeleton items
        for (let i = 0; i < 10; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'skeleton-item flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="flex flex-col justify-center flex-1 gap-2">
                    <div class="skeleton-line h-4 bg-gray-300 rounded w-3/4"></div>
                    <div class="skeleton-line h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div class="shrink-0">
                    <div class="skeleton-line h-4 bg-gray-300 rounded w-16"></div>
                </div>
            `;
            expenseList.appendChild(skeletonItem);
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
                
                .skeleton-line {
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

    // ===============================================
    // Payment Loading Functions (for actions)
    // ===============================================
    function showPaymentLoading(text = 'Memproses...') {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'payment-loading-overlay';
        loadingOverlay.id = 'payment-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const content = loadingOverlay.querySelector('.loading-content');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        
        const spinner = loadingOverlay.querySelector('.loading-spinner');
        spinner.style.cssText = `
            border: 4px solid #f3f3f3;
            border-top: 4px solid #683fe4;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        `;
        
        // Add CSS animation if not exists
        if (!document.getElementById('payment-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'payment-loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingOverlay);
    }

    function hidePaymentLoading() {
        const loadingOverlay = document.getElementById('payment-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    // ===============================================
    // Notification Functions
    // ===============================================
    function showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        // Add slide-in animation
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 4 seconds (longer for errors)
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }
});
