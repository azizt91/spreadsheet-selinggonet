// pelanggan_riwayat_lunas.js - Customer Payment History with Tabs
import { supabase } from './supabase-client.js';
import { checkAuth, requireRole } from './auth.js';
import { getWhatsAppNumber } from './apply-settings.js';

let currentUser = null;
let currentProfile = null;
let currentDetailData = null; // For storing detail view data

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication and require USER role
    currentUser = await requireRole('USER');
    if (!currentUser) return; // Stop if not authenticated or not USER role

    // Get current user profile
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (!profileError && profile) {
            currentProfile = profile;
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }

    // DOM Elements
    let views = {};
    const contentList = document.getElementById('content-list');
    const searchInput = document.getElementById('search-input');
    const unpaidTab = document.getElementById('unpaidTab');
    const paidTab = document.getElementById('paidTab');
    
    // Detail view elements - akan diinisialisasi saat dibutuhkan
    let detailCustomerName, detailCustomerId, detailCustomerWhatsapp, 
        detailInvoicePeriod, detailInvoiceAmount, detailPaidDate, 
        detailPaymentMethod;
    
    // State management
    let unpaidData = [];
    let paidData = [];
    let currentTab = 'paid'; // Start with paid tab active

    // Initialize the page
    await initializePage();

    // ===============================================
    // View Management
    // ===============================================
    function initializeViews() {
        views = { 
            list: document.getElementById('list-view'), 
            detail: document.getElementById('detail-view') 
        };
    }

    function switchView(viewName) {
        // Initialize views if not already done
        if (!views.list || !views.detail) {
            initializeViews();
        }
        
        // Add null safety
        Object.values(views).forEach(view => {
            if (view) view.classList.add('hidden');
        });
        
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }
        
        window.scrollTo(0, 0);
    }

    // Initialize detail view elements
    function initializeDetailElements() {
        detailCustomerName = document.getElementById('detail-customer-name');
        detailCustomerId = document.getElementById('detail-customer-id');
        detailCustomerWhatsapp = document.getElementById('detail-customer-whatsapp');
        detailInvoicePeriod = document.getElementById('detail-invoice-period');
        detailInvoiceAmount = document.getElementById('detail-invoice-amount');
        detailPaidDate = document.getElementById('detail-paid-date');
        detailPaymentMethod = document.getElementById('detail-payment-method');
    }

    async function navigateToPaymentDetail(invoice) {
        if (!invoice || !invoice.id) {
            showToast('Error: Data tagihan tidak lengkap.', 'error');
            return;
        }
        
        // Store current detail data
        currentDetailData = invoice;
        
        // Ensure DOM is ready with a small delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Populate detail view
        await displayPaymentDetail(invoice);
        
        // Switch to detail view
        switchView('detail');
    }
    
    async function displayPaymentDetail(invoiceData) {
        // Initialize detail elements first
        initializeDetailElements();
        
        // Format currency
        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        // Format date
        let formattedDate = 'Tidak tersedia';
        if (invoiceData.paid_at) {
            const date = new Date(invoiceData.paid_at);
            formattedDate = date.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // For paid invoices, use total_due or amount_paid instead of amount (which is remaining)
        const displayAmount = invoiceData.status === 'paid' 
            ? (invoiceData.total_due || invoiceData.amount_paid || invoiceData.amount)
            : invoiceData.amount;

        // Populate data with null safety
        if (detailCustomerName) detailCustomerName.textContent = invoiceData.profiles?.full_name || 'Tidak tersedia';
        if (detailCustomerId) detailCustomerId.textContent = invoiceData.profiles?.idpl || 'Tidak tersedia';
        if (detailCustomerWhatsapp) detailCustomerWhatsapp.textContent = invoiceData.profiles?.whatsapp_number || 'Tidak tersedia';
        if (detailInvoicePeriod) detailInvoicePeriod.textContent = invoiceData.invoice_period || 'Tidak tersedia';
        if (detailInvoiceAmount) detailInvoiceAmount.textContent = formatter.format(displayAmount || 0);
        if (detailPaidDate) detailPaidDate.textContent = formattedDate;
        if (detailPaymentMethod) detailPaymentMethod.textContent = invoiceData.payment_method || 'Tidak diketahui';
    }

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderList);
        unpaidTab.addEventListener('click', () => switchTab('unpaid'));
        paidTab.addEventListener('click', () => switchTab('paid'));

        // Back button from detail view
        const backFromDetailBtn = document.getElementById('back-from-detail');
        if (backFromDetailBtn) {
            backFromDetailBtn.addEventListener('click', () => {
                switchView('list');
            });
        }

        // Modal Listeners
        const paymentModal = document.getElementById('payment-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const qrisTab = document.getElementById('qris-tab');
        const transferTab = document.getElementById('transfer-tab');
        const confirmPaymentBtn = document.getElementById('confirm-payment-btn');

        closeModalBtn.addEventListener('click', hidePaymentModal);
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) {
                hidePaymentModal();
            }
        });

        qrisTab.addEventListener('click', () => switchPaymentTab('qris'));
        transferTab.addEventListener('click', () => switchPaymentTab('transfer'));

        // Use event delegation for dynamically created pay buttons
        contentList.addEventListener('click', function(event) {
            const payButton = event.target.closest('.pay-button');
            if (payButton) {
                const period = payButton.dataset.period;
                const amount = payButton.dataset.amount;
                const amountFormatted = payButton.dataset.amountFormatted;
                showPaymentModal(period, amount, amountFormatted);
            }
        });

        confirmPaymentBtn.addEventListener('click', handlePaymentConfirmation);

        // Add event listener for detail buttons
        contentList.addEventListener('click', (event) => {
            const detailBtn = event.target.closest('.detail-btn');
            if (detailBtn) {
                const invoiceId = detailBtn.dataset.invoiceId;
                const invoice = paidData.find(item => item.id === invoiceId);
                if (invoice) {
                    navigateToPaymentDetail(invoice);
                }
            }
        });
    }

    async function initializePage() {
        initializeEventListeners();
        
        // Check for activeTab from sessionStorage (from dashboard navigation)
        const activeTabFromStorage = sessionStorage.getItem('activeTab');
        if (activeTabFromStorage && (activeTabFromStorage === 'paid' || activeTabFromStorage === 'unpaid')) {
            currentTab = activeTabFromStorage;
            switchTab(currentTab);
            // Clear the sessionStorage after using it
            sessionStorage.removeItem('activeTab');
        }
        
        await fetchData();
    }

    // ===============================================
    // Tab Management
    // ===============================================
    function switchTab(tab) {
        currentTab = tab;
        if (tab === 'unpaid') {
            // Set unpaid tab as active
            unpaidTab.classList.add('active');
            unpaidTab.classList.remove('border-b-transparent');
            unpaidTab.classList.add('border-b-[#5324e0]', 'text-[#110e1b]');
            
            // Set paid tab as inactive
            paidTab.classList.remove('active');
            paidTab.classList.remove('border-b-[#5324e0]', 'text-[#110e1b]');
            paidTab.classList.add('border-b-transparent', 'text-[#625095]');
            
            searchInput.placeholder = 'Cari tagihan belum dibayar...';
        } else {
            // Set paid tab as active
            paidTab.classList.add('active');
            paidTab.classList.remove('border-b-transparent');
            paidTab.classList.add('border-b-[#5324e0]', 'text-[#110e1b]');
            
            // Set unpaid tab as inactive
            unpaidTab.classList.remove('active');
            unpaidTab.classList.remove('border-b-[#5324e0]', 'text-[#110e1b]');
            unpaidTab.classList.add('border-b-transparent', 'text-[#625095]');
            
            searchInput.placeholder = 'Cari riwayat pembayaran...';
        }
        renderList();
    }

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showLoading() {
        contentList.innerHTML = '';
        
        // Create skeleton loading items
        for (let i = 0; i < 10; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="flex flex-col justify-center flex-1 gap-2">
                    <div class="bg-gray-200 h-4 w-3/4 rounded skeleton-shimmer"></div>
                    <div class="bg-gray-200 h-3 w-1/2 rounded skeleton-shimmer"></div>
                </div>
                <div class="shrink-0">
                    <div class="bg-gray-200 h-4 w-20 rounded skeleton-shimmer"></div>
                </div>
            `;
            contentList.appendChild(skeletonItem);
        }
        
        // Add skeleton animation styles
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                @keyframes skeleton-loading {
                    0% { background-color: #e0e0e0; }
                    50% { background-color: #f0f0f0; }
                    100% { background-color: #e0e0e0; }
                }
                .skeleton-shimmer {
                    animation: skeleton-loading 1.5s infinite;
                }
            `;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        const skeletonStyles = document.getElementById('skeleton-styles');
        if (skeletonStyles) {
            skeletonStyles.remove();
        }
    }

    // ===============================================
    // Utility Functions
    // ===============================================
    function calculateDueDate(invoicePeriod, installationDate) {
        console.log('calculateDueDate called with:', { invoicePeriod, installationDate });
        
        if (!installationDate || !invoicePeriod) {
            console.log('Missing data:', { installationDate, invoicePeriod });
            return null;
        }
        
        let year, month;
        
        // Parse invoice period - handle both "YYYY-MM" and "Month YYYY" formats
        if (invoicePeriod.includes('-')) {
            // Format: "YYYY-MM"
            [year, month] = invoicePeriod.split('-');
            month = parseInt(month);
        } else {
            // Format: "Month YYYY" (e.g., "September 2025")
            const monthNames = {
                'January': 1, 'Januari': 1,
                'February': 2, 'Februari': 2,
                'March': 3, 'Maret': 3,
                'April': 4,
                'May': 5, 'Mei': 5,
                'June': 6, 'Juni': 6,
                'July': 7, 'Juli': 7,
                'August': 8, 'Agustus': 8,
                'September': 9,
                'October': 10, 'Oktober': 10,
                'November': 11,
                'December': 12, 'Desember': 12
            };
            
            const parts = invoicePeriod.trim().split(' ');
            if (parts.length >= 2) {
                const monthName = parts[0];
                year = parts[1];
                month = monthNames[monthName];
                
                if (!month) {
                    console.log('Unknown month name:', monthName);
                    return null;
                }
            } else {
                console.log('Invalid invoice period format:', invoicePeriod);
                return null;
            }
        }
        
        if (!year || !month) {
            console.log('Could not parse year/month from:', invoicePeriod);
            return null;
        }
        
        // Get installation day
        const installDate = new Date(installationDate);
        if (isNaN(installDate.getTime())) {
            console.log('Invalid installation date:', installationDate);
            return null;
        }
        
        const installDay = installDate.getDate();
        console.log('Installation day:', installDay);
        
        // Create due date using installation day
        const dueDate = new Date(parseInt(year), month - 1, installDay);
        console.log('Calculated due date:', dueDate);
        
        return dueDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }

    // ===============================================
    // Data Fetching Functions
    // ===============================================
    async function fetchData() {
        showLoading();
        
        try {
            console.log('Fetching payment history for user:', currentUser.id);
            console.log('Current profile:', currentProfile);
            
            // First, get customer profile to get installation_date
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('installation_date')
                .eq('id', currentUser.id)
                .single();

            if (profileError) {
                throw new Error(`Gagal mengambil data profil: ${profileError.message}`);
            }

            console.log('Customer profile loaded:', profile);
            console.log('Installation date from profile:', profile?.installation_date);
            
            // Fetch unpaid bills (invoices with status='unpaid' or 'partially_paid')
            const { data: unpaidBills, error: unpaidError } = await supabase
                .from('invoices')
                .select(`
                    id,
                    invoice_period,
                    amount,
                    total_due,
                    amount_paid,
                    status,
                    paid_at,
                    due_date,
                    created_at
                `)
                .eq('customer_id', currentUser.id)
                .in('status', ['unpaid', 'partially_paid'])
                .order('invoice_period', { ascending: false });

            if (unpaidError) {
                throw new Error(`Gagal mengambil data tagihan: ${unpaidError.message}`);
            }

            // Calculate due dates for unpaid bills based on installation_date
            const unpaidBillsWithDueDate = unpaidBills.map(bill => {
                const calculatedDate = calculateDueDate(bill.invoice_period, profile.installation_date);
                console.log(`Bill ${bill.invoice_period}: calculated_due_date = ${calculatedDate}`);
                return {
                    ...bill,
                    calculated_due_date: calculatedDate
                };
            });

            console.log('Unpaid bills loaded:', unpaidBillsWithDueDate);

            // Fetch paid bills (invoices with status='paid')
            const { data: paidBills, error: paidError } = await supabase
                .from('invoices')
                .select(`
                    id,
                    invoice_period,
                    amount,
                    total_due,
                    amount_paid,
                    status,
                    paid_at,
                    payment_method,
                    due_date,
                    created_at,
                    profiles (
                        full_name,
                        idpl,
                        whatsapp_number
                    )
                `)
                .eq('customer_id', currentUser.id)
                .eq('status', 'paid')
                .order('paid_at', { ascending: false });

            if (paidError) {
                throw new Error(`Gagal mengambil data riwayat: ${paidError.message}`);
            }

            console.log('Paid bills loaded:', paidBills);
            console.log('Unpaid bills loaded:', unpaidBillsWithDueDate);

            unpaidData = unpaidBillsWithDueDate || [];
            paidData = paidBills || [];

            console.log('Final data - unpaidData:', unpaidData.length, 'paidData:', paidData.length);
            console.log('Current tab:', currentTab);

            renderList();

        } catch (error) {
            console.error('Error fetching payment history:', error);
            contentList.innerHTML = `
                <div class="p-4">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        <p class="text-red-700 mb-4">Gagal memuat data: ${error.message}</p>
                        <button onclick="location.reload()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Coba Lagi</button>
                    </div>
                </div>
            `;
        } finally {
            hideLoading();
        }
    }

    // ===============================================
    // Render Functions
    // ===============================================
    function renderList() {
        contentList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        const data = currentTab === 'unpaid' ? unpaidData : paidData;

        if (!Array.isArray(data)) {
            contentList.innerHTML = '<p class="text-center text-red-500 p-4">Error: Format data tidak valid</p>';
            return;
        }

        const filteredData = data.filter(item => {
            if (!item) return false;
            return (item.invoice_period && item.invoice_period.toLowerCase().includes(searchTerm)) ||
                   (item.amount && item.amount.toString().includes(searchTerm));
        });

        if (filteredData.length === 0) {
            const emptyMessage = currentTab === 'unpaid' ? 
                'Tidak ada tagihan belum dibayar' : 'Belum ada riwayat pembayaran';
            contentList.innerHTML = '<p class="text-center text-gray-500 p-4">' + emptyMessage + '</p>';
            return;
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        filteredData.forEach(item => {
            if (!item) return;

            // Determine amount based on tab and data structure
            let amount = 'N/A';
            if (currentTab === 'unpaid') {
                // For unpaid bills, show remaining amount (amount) or total_due
                amount = item.amount ? formatter.format(item.amount) : 
                        (item.total_due ? formatter.format(item.total_due) : 'N/A');
            } else {
                // For paid bills, show amount_paid (actual payment) or total_due
                amount = item.amount_paid ? formatter.format(item.amount_paid) : 
                        (item.total_due ? formatter.format(item.total_due) : 
                        (item.amount ? formatter.format(item.amount) : 'N/A'));
            }
            
            const period = item.invoice_period || 'Periode tidak tersedia';

            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';

            if (currentTab === 'unpaid') {
                // Use calculated_due_date based on installation_date, fallback to original due_date
                let dueDate = 'Tanggal tidak tersedia';
                
                if (item.calculated_due_date) {
                    dueDate = formatDate(item.calculated_due_date);
                } else if (item.due_date) {
                    dueDate = formatDate(item.due_date);
                }
                
                const rawAmount = item.amount || item.total_due || 0;
                itemDiv.innerHTML = 
                    '<div class="flex flex-col justify-center">' +
                        '<p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">' + period + '</p>' +
                        '<p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">Jatuh tempo: ' + dueDate + '</p>' +
                        '<p class="text-red-600 text-sm font-medium">' + amount + '</p>' +
                    '</div>' +
                    '<div class="shrink-0">' +
                        '<button class="pay-button flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#5324e0] text-white text-sm font-medium leading-normal w-fit hover:bg-[#4318d4]" data-period="' + period + '" data-amount="' + rawAmount + '" data-amount-formatted="' + amount + '">' +
                            '<span class="truncate">Bayar</span>' +
                        '</button>' +
                    '</div>';
            } else {
                const paymentDate = item.paid_at ? 
                    formatDate(item.paid_at) : 'Tanggal tidak tersedia';
                itemDiv.innerHTML = 
                    '<div class="flex flex-col justify-center flex-1">' +
                        '<p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">' + period + '</p>' +
                        '<p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">Dibayar: ' + paymentDate + '</p>' +
                    '</div>' +
                    '<div class="shrink-0 flex items-center gap-3">' +
                        '<div class="text-right">' +
                            '<p class="text-[#110e1b] text-base font-medium leading-normal">' + amount + '</p>' +
                            '<p class="text-green-600 text-xs font-medium">✓ Lunas</p>' +
                        '</div>' +
                        '<button class="detail-btn flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 transition-colors" data-invoice-id="' + item.id + '" title="Lihat Detail">' +
                            '<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">' +
                                '<path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>' +
                            '</svg>' +
                        '</button>' +
                    '</div>';
            }
            contentList.appendChild(itemDiv);
        });
    }

    // ===============================================
    // Payment Modal Functions
    // ===============================================
    function showPaymentModal(period, amount, amountFormatted) {
        const modal = document.getElementById('payment-modal');
        const modalContent = document.getElementById('modal-content');
        document.getElementById('modal-invoice-period').textContent = period;
        document.getElementById('modal-invoice-amount').textContent = amountFormatted;

        // Store data for confirmation button
        const confirmBtn = document.getElementById('confirm-payment-btn');
        confirmBtn.dataset.period = period;
        confirmBtn.dataset.amountFormatted = amountFormatted;

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('opacity-100');
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    function hidePaymentModal() {
        const modal = document.getElementById('payment-modal');
        const modalContent = document.getElementById('modal-content');
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('opacity-100');
        }, 300);
    }

    function switchPaymentTab(tab) {
        const qrisTab = document.getElementById('qris-tab');
        const transferTab = document.getElementById('transfer-tab');
        const qrisContent = document.getElementById('qris-content');
        const transferContent = document.getElementById('transfer-content');

        if (tab === 'qris') {
            qrisTab.classList.add('active', 'text-indigo-600', 'border-indigo-600');
            qrisTab.classList.remove('text-gray-500');
            transferTab.classList.remove('active', 'text-indigo-600', 'border-indigo-600');
            transferTab.classList.add('text-gray-500');
            qrisContent.classList.remove('hidden');
            transferContent.classList.add('hidden');
        } else {
            transferTab.classList.add('active', 'text-indigo-600', 'border-indigo-600');
            transferTab.classList.remove('text-gray-500');
            qrisTab.classList.remove('active', 'text-indigo-600', 'border-indigo-600');
            qrisTab.classList.add('text-gray-500');
            transferContent.classList.remove('hidden');
            qrisContent.classList.add('hidden');
        }
    }

    async function handlePaymentConfirmation() {
        const confirmBtn = document.getElementById('confirm-payment-btn');
        const period = confirmBtn.dataset.period;
        const amount = confirmBtn.dataset.amountFormatted;
        
        const customerName = currentProfile ? currentProfile.full_name : currentUser.email;
        const customerIdpl = currentProfile ? currentProfile.idpl : 'N/A';

        const message = `Halo Admin Selinggonet, saya ingin mengkonfirmasi pembayaran tagihan:

- *Nama:* ${customerName}
- *ID Pelanggan:* ${customerIdpl}
- *Periode:* ${period}
- *Jumlah:* ${amount}

Saya sudah melakukan pembayaran. Mohon untuk diverifikasi. Terima kasih.`;

        const whatsappNumber = getWhatsAppNumber(); // Get from app settings
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    }

    // ===============================================
    // Utility Functions
    // ===============================================
    window.copyToClipboard = function(elementId, buttonElement) {
        const textElement = document.getElementById(elementId);
        if (!textElement) return;

        const textToCopy = textElement.textContent.trim();
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast(`Nomor rekening ${textToCopy} berhasil disalin!`);
            
            // Optional: Change button icon to checkmark
            const originalIcon = buttonElement.innerHTML;
            buttonElement.innerHTML = `<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>`;
            setTimeout(() => {
                buttonElement.innerHTML = originalIcon;
            }, 2000);

        }).catch(err => {
            console.error('Gagal menyalin:', err);
            showToast('Gagal menyalin nomor rekening.', 'error');
        });
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;

        toastMessage.textContent = message;
        
        // Reset classes
        toast.classList.remove('bg-green-500', 'bg-red-500', 'opacity-0', 'invisible');
        
        // Set color based on type
        if (type === 'success') {
            toast.classList.add('bg-green-500');
        } else {
            toast.classList.add('bg-red-500');
        }

        // Show toast
        toast.classList.add('opacity-100', 'visible');

        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('opacity-100', 'visible');
            toast.classList.add('opacity-0', 'invisible');
        }, 3000);
    }

    function formatDate(dateString) {
        if (!dateString) return 'Tidak tersedia';
        
        try {
            let date;
            if (dateString instanceof Date) {
                date = dateString;
            } else if (typeof dateString === 'string') {
                date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    const parts = dateString.split(/[\/-]/);
                    if (parts.length === 3) {
                        date = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                }
            } else {
                return 'Format tanggal tidak valid';
            }

            if (isNaN(date.getTime())) {
                return 'Tanggal tidak valid';
            }

            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Format tanggal bermasalah';
        }
    }

});
