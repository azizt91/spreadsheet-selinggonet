// payment-methods.js - Payment Methods Management (CRUD)
import { supabase } from './supabase-client.js';

export default class PaymentMethodsManager {
    constructor() {
        this.currentMethod = null; // For edit mode
        this.init();
    }

    init() {
        // Check if we're on profile page
        if (!window.location.pathname.includes('profile.html')) {
            return;
        }

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Navigate to payment methods list
        document.getElementById('payment-methods-card')?.addEventListener('click', () => {
            this.showPaymentMethodsView();
        });

        // Back buttons
        document.getElementById('payment-methods-back-btn')?.addEventListener('click', () => {
            this.hidePaymentMethodsView();
        });

        document.getElementById('payment-form-back-btn')?.addEventListener('click', () => {
            this.hideFormView();
        });

        // Add new payment method
        document.getElementById('add-payment-btn')?.addEventListener('click', () => {
            this.showAddForm();
        });

        // Save button
        document.getElementById('pm-save-btn')?.addEventListener('click', () => {
            this.savePaymentMethod();
        });

        // Cancel button
        document.getElementById('pm-cancel-btn')?.addEventListener('click', () => {
            this.hideFormView();
        });

        // Delete button
        document.getElementById('pm-delete-btn')?.addEventListener('click', () => {
            this.deletePaymentMethod();
        });
    }

    // ===============================================
    // View Management
    // ===============================================
    async showPaymentMethodsView() {
        // Hide other views
        document.getElementById('profile-view').classList.add('hidden');
        document.getElementById('edit-view')?.classList.add('hidden');
        document.getElementById('app-settings-view')?.classList.add('hidden');
        document.getElementById('payment-method-form-view')?.classList.add('hidden');
        
        // Show payment methods view
        document.getElementById('payment-methods-view').classList.remove('hidden');

        // Load payment methods
        await this.loadPaymentMethods();
    }

    hidePaymentMethodsView() {
        document.getElementById('payment-methods-view').classList.add('hidden');
        document.getElementById('profile-view').classList.remove('hidden');
    }

    showAddForm() {
        // Reset form
        this.resetForm();
        
        // Set title to "Tambah"
        document.getElementById('payment-form-title').textContent = 'Tambah Bank Baru';
        
        // Hide delete button (add mode)
        document.getElementById('pm-delete-btn').classList.add('hidden');
        
        // Hide list view, show form view
        document.getElementById('payment-methods-view').classList.add('hidden');
        document.getElementById('payment-method-form-view').classList.remove('hidden');
    }

    showEditForm(method) {
        // Store current method for editing
        this.currentMethod = method;
        
        // Populate form
        document.getElementById('pm-id').value = method.id;
        document.getElementById('pm-bank-name').value = method.bank_name;
        document.getElementById('pm-account-number').value = method.account_number;
        document.getElementById('pm-account-holder').value = method.account_holder;
        document.getElementById('pm-sort-order').value = method.sort_order || '';
        document.getElementById('pm-is-active').checked = method.is_active;
        
        // Set title to "Edit"
        document.getElementById('payment-form-title').textContent = 'Edit Bank';
        
        // Show delete button (edit mode)
        document.getElementById('pm-delete-btn').classList.remove('hidden');
        
        // Hide list view, show form view
        document.getElementById('payment-methods-view').classList.add('hidden');
        document.getElementById('payment-method-form-view').classList.remove('hidden');
    }

    hideFormView() {
        // Hide form, show list
        document.getElementById('payment-method-form-view').classList.add('hidden');
        document.getElementById('payment-methods-view').classList.remove('hidden');
        
        // Reset form
        this.resetForm();
    }

    resetForm() {
        document.getElementById('pm-id').value = '';
        document.getElementById('pm-bank-name').value = '';
        document.getElementById('pm-account-number').value = '';
        document.getElementById('pm-account-holder').value = '';
        document.getElementById('pm-sort-order').value = '';
        document.getElementById('pm-is-active').checked = true;
        this.currentMethod = null;
    }

    // ===============================================
    // CRUD Operations
    // ===============================================
    async loadPaymentMethods() {
        try {
            // Fetch all payment methods (including inactive for admin)
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;

            // Render list
            this.renderPaymentMethodsList(data || []);
        } catch (error) {
            console.error('Error loading payment methods:', error);
            this.showToast('Gagal memuat data payment methods', 'error');
        }
    }

    renderPaymentMethodsList(methods) {
        const container = document.getElementById('payment-methods-list');
        
        if (methods.length === 0) {
            container.innerHTML = `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <svg class="mx-auto mb-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="48px" height="48px" fill="currentColor" viewBox="0 0 256 256"><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Z"></path></svg>
                    <p class="text-gray-600 font-medium">Belum ada metode pembayaran</p>
                    <p class="text-gray-500 text-sm mt-1">Klik "Tambah Bank Baru" untuk menambahkan</p>
                </div>
            `;
            return;
        }

        container.innerHTML = methods.map(method => `
            <div class="flex items-start gap-3 bg-white px-4 py-3 rounded-lg border ${method.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'} cursor-pointer hover:border-[#683fe4] transition-colors" onclick="window.paymentMethodsManager.showEditForm(${JSON.stringify(method).replace(/"/g, '&quot;')})">
                <div class="text-[#110e1b] flex items-center justify-center rounded-lg bg-[#f0f2f4] shrink-0 size-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Z"></path>
                    </svg>
                </div>
                <div class="flex flex-col flex-1">
                    <div class="flex items-center gap-2">
                        <p class="text-[#110e1b] text-sm font-semibold leading-normal">${method.bank_name}</p>
                        ${!method.is_active ? '<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Nonaktif</span>' : ''}
                    </div>
                    <p class="text-[#110e1b] text-sm font-normal leading-normal">${method.account_number}</p>
                    <p class="text-[#110e1b] text-sm font-normal leading-normal">${method.account_holder}</p>
                    <p class="text-gray-500 text-xs mt-1">Urutan: ${method.sort_order || '-'}</p>
                </div>
                <svg class="text-gray-400" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
                </svg>
            </div>
        `).join('');
    }

    async savePaymentMethod() {
        try {
            // Validate inputs
            const bankName = document.getElementById('pm-bank-name').value.trim();
            const accountNumber = document.getElementById('pm-account-number').value.trim();
            const accountHolder = document.getElementById('pm-account-holder').value.trim();
            const sortOrder = parseInt(document.getElementById('pm-sort-order').value) || 0;
            const isActive = document.getElementById('pm-is-active').checked;
            const methodId = document.getElementById('pm-id').value;

            if (!bankName || !accountNumber || !accountHolder) {
                this.showToast('Mohon lengkapi semua field yang diperlukan', 'error');
                return;
            }

            // Show loading
            const saveBtn = document.getElementById('pm-save-btn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'MENYIMPAN...';
            saveBtn.disabled = true;

            const paymentData = {
                bank_name: bankName,
                account_number: accountNumber,
                account_holder: accountHolder,
                sort_order: sortOrder,
                is_active: isActive,
                updated_at: new Date().toISOString()
            };

            let result;
            if (methodId) {
                // Update existing
                result = await supabase
                    .from('payment_methods')
                    .update(paymentData)
                    .eq('id', methodId);
            } else {
                // Insert new
                result = await supabase
                    .from('payment_methods')
                    .insert([paymentData]);
            }

            if (result.error) throw result.error;

            this.showToast(`✅ Payment method berhasil ${methodId ? 'diupdate' : 'ditambahkan'}!`, 'success');
            
            // Back to list and reload
            this.hideFormView();
            await this.loadPaymentMethods();

        } catch (error) {
            console.error('Error saving payment method:', error);
            this.showToast('❌ Gagal menyimpan: ' + error.message, 'error');
        } finally {
            // Reset button
            const saveBtn = document.getElementById('pm-save-btn');
            saveBtn.textContent = 'SIMPAN';
            saveBtn.disabled = false;
        }
    }

    async deletePaymentMethod() {
        if (!this.currentMethod) return;

        const confirmDelete = confirm(
            `Hapus ${this.currentMethod.bank_name}?\n\n` +
            `Nomor: ${this.currentMethod.account_number}\n` +
            `Pemilik: ${this.currentMethod.account_holder}\n\n` +
            `Data akan dihapus permanen!`
        );

        if (!confirmDelete) return;

        try {
            // Show loading
            const deleteBtn = document.getElementById('pm-delete-btn');
            const originalText = deleteBtn.textContent;
            deleteBtn.textContent = 'MENGHAPUS...';
            deleteBtn.disabled = true;

            const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', this.currentMethod.id);

            if (error) throw error;

            this.showToast('✅ Payment method berhasil dihapus!', 'success');
            
            // Back to list and reload
            this.hideFormView();
            await this.loadPaymentMethods();

        } catch (error) {
            console.error('Error deleting payment method:', error);
            this.showToast('❌ Gagal menghapus: ' + error.message, 'error');
            
            // Reset button
            const deleteBtn = document.getElementById('pm-delete-btn');
            deleteBtn.textContent = 'HAPUS BANK';
            deleteBtn.disabled = false;
        }
    }

    // ===============================================
    // Helper Functions
    // ===============================================
    showToast(message, type = 'info') {
        // Create toast if doesn't exist
        let toast = document.getElementById('pm-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pm-toast';
            toast.className = 'fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg opacity-0 invisible transition-all duration-300 ease-in-out z-[150] max-w-sm';
            document.body.appendChild(toast);
        }

        // Set color based on type
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        toast.className = `fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out z-[150] max-w-sm ${colors[type]}`;
        toast.textContent = message;

        // Show toast
        setTimeout(() => {
            toast.classList.remove('opacity-0', 'invisible');
        }, 10);

        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0', 'invisible');
        }, 3000);
    }
}

// Initialize Payment Methods Manager
if (window.location.pathname.includes('profile.html')) {
    window.paymentMethodsManager = new PaymentMethodsManager();
}
