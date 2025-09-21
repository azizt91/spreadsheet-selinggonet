import { supabase } from './supabase-client.js';
import { sendPaymentNotification, getCurrentAdminName, showNotificationResult, sendCustomerPaymentNotification } from './whatsapp-notification.js'; // Pastikan `sendCustomerPaymentNotification` ada di sini

document.addEventListener('DOMContentLoaded', () => {
    
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    let unpaidData = [];
    let installmentData = [];
    let paidData = [];
    let allPaidData = []; // Store all paid data for filtering
    let filteredPaidData = []; // Store filtered paid data
    let currentTab = 'unpaid'; // Default tab
    let currentDetailData = null; // For storing detail view data

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    // Views will be initialized when needed
    let views = {};
    const invoiceList = document.getElementById('invoice-list');
    const searchInput = document.getElementById('search-input');
    const unpaidTab = document.getElementById('unpaid-tab');
    const installmentTab = document.getElementById('installment-tab');
    const paidTab = document.getElementById('paid-tab');
    const addInvoiceBtn = document.getElementById('add-invoice-btn');
    
    // Filter Elements
    const filterBtn = document.getElementById('filter-btn');
    const filterModal = document.getElementById('filter-modal');
    const closeFilterModalBtn = document.getElementById('close-filter-modal-btn');
    const customerNameInput = document.getElementById('customer-name-input');
    const paymentMethodInput = document.getElementById('payment-method-input');
    const startDateInput = document.getElementById('start-date-input');
    const endDateInput = document.getElementById('end-date-input');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const totalContainer = document.getElementById('total-container');
    const totalDisplay = document.getElementById('total-display');
    const filterInfo = document.getElementById('filter-info');
    
    // Detail view elements - akan diinisialisasi saat dibutuhkan
    let detailCustomerName, detailCustomerId, detailCustomerWhatsapp, 
        detailInvoicePeriod, detailInvoiceAmount, detailPaidDate, 
        detailPaymentMethod, detailAdminName;

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
        detailAdminName = document.getElementById('detail-admin-name');
        
    }

    // ===============================================
    // Helper Function for Pill Colors
    // ===============================================
    function getMonthPillClass(periodString) {
        const month = (periodString || '').split(' ')[0];
        let bgClass = 'bg-gray-100';
        let textClass = 'text-gray-800';

        switch (month) {
            case 'Januari':
                bgClass = 'bg-sky-100'; textClass = 'text-sky-800';
                break;
            case 'Februari':
                bgClass = 'bg-blue-100'; textClass = 'text-blue-800';
                break;
            case 'Maret':
                bgClass = 'bg-emerald-100'; textClass = 'text-emerald-800';
                break;
            case 'April':
                bgClass = 'bg-green-100'; textClass = 'text-green-800';
                break;
            case 'Mei':
                bgClass = 'bg-lime-100'; textClass = 'text-lime-800';
                break;
            case 'Juni':
                bgClass = 'bg-yellow-100'; textClass = 'text-yellow-800';
                break;
            case 'Juli':
                bgClass = 'bg-amber-100'; textClass = 'text-amber-800';
                break;
            case 'Agustus':
                bgClass = 'bg-orange-100'; textClass = 'text-orange-800';
                break;
            case 'September':
                bgClass = 'bg-red-100'; textClass = 'text-red-800';
                break;
            case 'Oktober':
                bgClass = 'bg-rose-100'; textClass = 'text-rose-800';
                break;
            case 'November':
                bgClass = 'bg-violet-100'; textClass = 'text-violet-800';
                break;
            case 'Desember':
                bgClass = 'bg-indigo-100'; textClass = 'text-indigo-800';
                break;
        }
        return { bg: bgClass, text: textClass };
    }

    // ===============================================
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    fetchData();

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderList);
        unpaidTab.addEventListener('click', () => {
            if (new URLSearchParams(window.location.search).has('bulan')) {
                window.history.pushState({}, document.title, window.location.pathname);
                fetchData();
            } else {
                switchTab('unpaid');
            }
        });
        installmentTab.addEventListener('click', () => {
            if (new URLSearchParams(window.location.search).has('bulan')) {
                window.history.pushState({}, document.title, window.location.pathname);
                fetchData();
            } else {
                switchTab('installment');
            }
        });
        paidTab.addEventListener('click', () => {
            if (new URLSearchParams(window.location.search).has('bulan')) {
                window.history.pushState({}, document.title, window.location.pathname);
                fetchData();
            } else {
                switchTab('paid');
            }
        });
        
        invoiceList.addEventListener('click', handleInvoiceListClick);

        if (addInvoiceBtn) {
            addInvoiceBtn.addEventListener('click', handleCreateInvoices);
        }

        // Back button from detail view
        const backFromDetailBtn = document.getElementById('back-from-detail');
        if (backFromDetailBtn) {
            backFromDetailBtn.addEventListener('click', () => {
                switchView('list');
            });
        }

        // Filter Event Listeners
        if (filterBtn) {
            filterBtn.addEventListener('click', () => filterModal.classList.remove('hidden'));
        }
        if (closeFilterModalBtn) {
            closeFilterModalBtn.addEventListener('click', () => filterModal.classList.add('hidden'));
        }
        if (filterModal) {
            filterModal.addEventListener('click', (e) => {
                if (e.target === filterModal) filterModal.classList.add('hidden');
            });
        }
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', handleApplyFilter);
        }
        if (resetFilterBtn) {
            resetFilterBtn.addEventListener('click', handleResetFilter);
        }
    }

    // ===============================================
    // Filter Functions
    // ===============================================
    function handleApplyFilter() {
        const customerName = customerNameInput.value.trim();
        const paymentMethod = paymentMethodInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        // Apply filter only to paid tab
        if (currentTab === 'paid') {
            applyPaidFilter(customerName, paymentMethod, startDate, endDate);
            updateFilterInfo(customerName, paymentMethod, startDate, endDate);
            totalContainer.classList.remove('hidden');
            updateTotal();
        }
        
        filterModal.classList.add('hidden');
    }

    function handleResetFilter() {
        customerNameInput.value = '';
        paymentMethodInput.value = '';
        startDateInput.value = '';
        endDateInput.value = '';
        
        if (currentTab === 'paid') {
            filteredPaidData = [...allPaidData];
            renderList();
            updateTotal();
        }
        
        totalContainer.classList.add('hidden');
        filterInfo.textContent = '';
        filterModal.classList.add('hidden');
    }

    function applyPaidFilter(customerName, paymentMethod, startDate, endDate) {
        filteredPaidData = allPaidData.filter(invoice => {
            // Filter by customer name
            if (customerName && !invoice.profiles?.full_name?.toLowerCase().includes(customerName.toLowerCase())) {
                return false;
            }
            
            // Filter by payment method
            if (paymentMethod && invoice.payment_method !== paymentMethod) {
                return false;
            }
            
            // Filter by date range
            if (startDate || endDate) {
                const paidDate = new Date(invoice.paid_at);
                if (startDate && paidDate < new Date(startDate + 'T00:00:00')) {
                    return false;
                }
                if (endDate && paidDate > new Date(endDate + 'T23:59:59')) {
                    return false;
                }
            }
            
            return true;
        });
        
        renderList();
    }

    function updateFilterInfo(customerName, paymentMethod, startDate, endDate) {
        const filters = [];
        
        if (customerName) filters.push(`Nama: ${customerName}`);
        if (paymentMethod) filters.push(`Metode: ${paymentMethod}`);
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '...';
            const end = endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '...';
            filters.push(`${start} - ${end}`);
        }
        
        if (filters.length > 0) {
            filterInfo.textContent = `Filter aktif: ${filters.join(', ')}`;
        } else {
            filterInfo.textContent = '';
        }
    }

    function updateTotal() {
        const dataToCalculate = currentTab === 'paid' ? filteredPaidData : [];
        const total = dataToCalculate.reduce((sum, invoice) => {
            // Use total_due for paid invoices as it represents the full amount
            return sum + (invoice.total_due || invoice.amount_paid || invoice.amount || 0);
        }, 0);
        
        const formatter = new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR', 
            minimumFractionDigits: 0 
        });
        totalDisplay.textContent = formatter.format(total);
    }

    // ===============================================
    // Main Data Fetch & Display Logic (PERBAIKAN FINAL)
    // ===============================================
    async function fetchData() {
        showLoading('Memuat data tagihan...');
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const filterStatus = urlParams.get('status');
            const filterBulan = urlParams.get('bulan');
            const filterTahun = urlParams.get('tahun');
            const isFiltering = filterBulan && filterTahun && filterBulan !== '0';

            // Atur tab aktif berdasarkan parameter URL
            if (filterStatus === 'paid') {
                currentTab = 'paid';
            } else if (filterStatus === 'installment') {
                currentTab = 'installment';
            } else {
                currentTab = 'unpaid';
            }

            if (isFiltering) {
                const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const targetPeriode = `${namaBulan[parseInt(filterBulan, 10)]} ${filterTahun}`;
                
                console.log(`Filtering data for period: ${targetPeriode}`); // Untuk debugging
                
                searchInput.placeholder = `Disaring: ${targetPeriode}`;
                searchInput.disabled = true;

                // --- LOGIKA FETCH SAAT FILTER AKTIF ---

                // Ambil data Unpaid dengan filter (hanya unpaid, tidak termasuk partially_paid)
                const { data: unpaid, error: unpaidErr } = await supabase
                    .from('invoices')
                    .select(`id, invoice_period, amount, total_due, amount_paid, status, paid_at, payment_method, profiles (full_name, idpl, whatsapp_number)`)
                    .eq('status', 'unpaid')
                    .eq('invoice_period', targetPeriode)
                    .order('created_at', { ascending: false });
                if (unpaidErr) throw unpaidErr;
                unpaidData = unpaid;

                // Ambil data Installment dengan filter (dengan error handling untuk enum)
                try {
                    const { data: installment, error: installmentErr } = await supabase
                        .from('invoices')
                        .select(`id, invoice_period, amount, total_due, amount_paid, status, paid_at, payment_method, profiles (full_name, idpl, whatsapp_number)`)
                        .eq('status', 'partially_paid')
                        .eq('invoice_period', targetPeriode)
                        .order('created_at', { ascending: false });
                    if (installmentErr) throw installmentErr;
                    installmentData = installment;
                } catch (enumError) {
                    console.warn('Enum partially_paid belum ada, menggunakan fallback query');
                    // Fallback: ambil data berdasarkan kondisi amount_paid > 0 dan status != 'paid'
                    const { data: installmentFallback, error: fallbackErr } = await supabase
                        .from('invoices')
                        .select(`id, invoice_period, amount, total_due, amount_paid, status, paid_at, payment_method, profiles (full_name, idpl, whatsapp_number)`)
                        .neq('status', 'paid')
                        .gt('amount_paid', 0)
                        .eq('invoice_period', targetPeriode)
                        .order('created_at', { ascending: false });
                    if (fallbackErr) throw fallbackErr;
                    installmentData = installmentFallback || [];
                }

                // Ambil data Paid dengan filter (dan paginasi)
                let allPaid = [];
                let page = 0;
                const CHUNK_SIZE = 1000;
                while (true) {
                    const { data: paidChunk, error: paidErrChunk } = await supabase
                        .from('invoices')
                        .select(`id, invoice_period, amount, total_due, amount_paid, status, paid_at, payment_method, profiles (full_name, idpl, whatsapp_number)`)
                        .eq('status', 'paid')
                        .eq('invoice_period', targetPeriode)
                        .order('paid_at', { ascending: false })
                        .range(page * CHUNK_SIZE, (page + 1) * CHUNK_SIZE - 1);
                    if (paidErrChunk) throw paidErrChunk;
                    if (paidChunk.length > 0) allPaid.push(...paidChunk);
                    if (paidChunk.length < CHUNK_SIZE) break;
                    page++;
                }
                paidData = allPaid;
                allPaidData = [...allPaid]; // Store for filtering
                filteredPaidData = [...allPaid]; // Initialize filtered data

            } else {
                // --- LOGIKA FETCH NORMAL (TANPA FILTER) ---
                searchInput.placeholder = 'Cari tagihan';
                searchInput.disabled = false;

                // Ambil data Unpaid tanpa filter (hanya unpaid, tidak termasuk partially_paid)
                const { data: unpaid, error: unpaidErr } = await supabase
                    .from('invoices')
                    .select(`id, invoice_period, amount, total_due, amount_paid, status, paid_at, payment_method, profiles (full_name, idpl, whatsapp_number)`)
                    .eq('status', 'unpaid')
                    .order('created_at', { ascending: false });
                if (unpaidErr) throw unpaidErr;
                unpaidData = unpaid;

                // Ambil data Installment tanpa filter (dengan error handling untuk enum)
                try {
                    const { data: installment, error: installmentErr } = await supabase
                        .from('invoices')
                        .select(`id, invoice_period, amount, total_due, amount_paid, status, paid_at, payment_method, profiles (full_name, idpl, whatsapp_number)`)
                        .eq('status', 'partially_paid')
                        .order('created_at', { ascending: false });
                    if (installmentErr) throw installmentErr;
                    installmentData = installment;
                } catch (enumError) {
                    console.warn('Enum partially_paid belum ada, menggunakan fallback query');
                    // Fallback: ambil data berdasarkan kondisi amount_paid > 0 dan status != 'paid'
                    const { data: installmentFallback, error: fallbackErr } = await supabase
                        .from('invoices')
                        .select(`id, invoice_period, amount, total_due, amount_paid, status, paid_at, payment_method, profiles (full_name, idpl, whatsapp_number)`)
                        .neq('status', 'paid')
                        .gt('amount_paid', 0)
                        .order('created_at', { ascending: false });
                    if (fallbackErr) throw fallbackErr;
                    installmentData = installmentFallback || [];
                }

                // Ambil data Paid tanpa filter (dan paginasi)
                 let allPaid = [];
                let page = 0;
                const CHUNK_SIZE = 1000;
                while (true) {
                    const { data: paidChunk, error: paidErrChunk } = await supabase
                        .from('invoices')
                        .select(`id, invoice_period, amount, total_due, amount_paid, status, paid_at, payment_method, profiles (full_name, idpl, whatsapp_number)`)
                        .eq('status', 'paid')
                        .order('paid_at', { ascending: false })
                        .range(page * CHUNK_SIZE, (page + 1) * CHUNK_SIZE - 1);
                    if (paidErrChunk) throw paidErrChunk;
                    if (paidChunk.length > 0) allPaid.push(...paidChunk);
                    if (paidChunk.length < CHUNK_SIZE) break;
                    page++;
                }
                paidData = allPaid;
                allPaidData = [...allPaid]; // Store for filtering
                filteredPaidData = [...allPaid]; // Initialize filtered data
            }

            // Render berdasarkan tab yang sudah ditentukan
            switchTab(currentTab);

        } catch (error) {
            console.error('Error fetching data:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            
            let errorMessage = 'Gagal memuat data tagihan';
            if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            if (error.code) {
                errorMessage += ` (Code: ${error.code})`;
            }
            
            invoiceList.innerHTML = `<p class="text-center text-red-500 p-4">${errorMessage}</p>`;
            unpaidData = [];
            installmentData = [];
            paidData = [];
        } finally {
            hideLoading();
        }
    }
    
    // ... SISA KODE DARI SINI KE BAWAH TETAP SAMA DAN TIDAK PERLU DIUBAH ...
    // Pastikan semua fungsi lainnya (switchTab, renderList, markAsPaid, dll.) tetap ada.

    function switchTab(tab) {
        currentTab = tab;
        
        // Reset semua tab
        unpaidTab.classList.remove('active');
        installmentTab.classList.remove('active');
        paidTab.classList.remove('active');
        
        // Aktifkan tab yang dipilih
        if (tab === 'unpaid') {
            unpaidTab.classList.add('active');
            if (addInvoiceBtn) addInvoiceBtn.style.display = 'flex';
        } else if (tab === 'installment') {
            installmentTab.classList.add('active');
            if (addInvoiceBtn) addInvoiceBtn.style.display = 'none';
        } else if (tab === 'paid') {
            paidTab.classList.add('active');
            if (addInvoiceBtn) addInvoiceBtn.style.display = 'none';
            // Show filter button only on paid tab
            if (filterBtn) filterBtn.classList.remove('hidden');
        }
        
        // Hide filter button on other tabs
        if (tab !== 'paid' && filterBtn) {
            filterBtn.classList.add('hidden');
            // Hide total container when switching away from paid tab
            if (totalContainer) totalContainer.classList.add('hidden');
        }
        
        renderList();
    }

    function renderList() {
        invoiceList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        let data;
        
        if (currentTab === 'unpaid') {
            data = unpaidData;
        } else if (currentTab === 'installment') {
            data = installmentData;
        } else {
            data = filteredPaidData; // Use filtered data for paid tab
        }

        if (!Array.isArray(data)) {
            invoiceList.innerHTML = `<p class="text-center text-red-500 p-4">Error: Format data tidak valid</p>`;
            return;
        }

        const filteredData = data.filter(item => {
            if (!item || !item.profiles) return false;
            if (searchInput.disabled) return true;
            return (item.profiles.full_name && item.profiles.full_name.toLowerCase().includes(searchTerm)) ||
                   (item.invoice_period && item.invoice_period.toLowerCase().includes(searchTerm));
        });

        if (filteredData.length === 0) {
            invoiceList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada tagihan ditemukan.</p>`;
            return;
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        filteredData.forEach(item => {
            const period = item.invoice_period || 'Periode tidak tersedia';
            const customerName = item.profiles?.full_name || 'Nama tidak tersedia';
            const invoiceId = item.id;
            const pillClasses = getMonthPillClass(period);
            const invoiceDiv = document.createElement('div');
            invoiceDiv.id = `invoice-item-${invoiceId}`;
            invoiceDiv.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';

            if (currentTab === 'unpaid') {
                invoiceDiv.innerHTML = `
                    <div class="flex flex-col justify-center gap-1">
                        <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
                        <span class="${pillClasses.bg} ${pillClasses.text} text-xs font-medium w-fit px-2.5 py-0.5 rounded-full">
                            ${period}
                        </span>
                    </div>
                    <div class="shrink-0 flex gap-2">
                        <button class="whatsapp-btn flex items-center justify-center w-8 h-8 bg-green-500 hover:bg-green-600 rounded-lg transition-colors" title="Kirim WhatsApp" data-invoice-id="${invoiceId}">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" /></svg>
                        </button>
                        <button class="installment-btn flex items-center justify-center h-8 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors" title="Bayar Cicilan" data-invoice-id="${invoiceId}" data-remaining-amount="${item.amount}" data-customer-name="${customerName}">
                            Cicil
                        </button>
                        <button class="mark-paid-btn flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#eae8f3] text-[#110e1b] text-sm font-medium leading-normal w-fit" data-invoice-id="${invoiceId}">
                            <span class="truncate">LUNAS</span>
                        </button>
                    </div>
                `;
            } else if (currentTab === 'installment') {
                const progressPercentage = ((item.amount_paid || 0) / (item.total_due || 1)) * 100;
                
                invoiceDiv.innerHTML = `
                    <div class="flex flex-col justify-center flex-1 gap-1">
                        <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
                        <span class="${pillClasses.bg} ${pillClasses.text} text-xs font-medium w-fit px-2.5 py-0.5 rounded-full">
                            ${period}
                        </span>
                        <div class="mt-2">
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-orange-600 font-medium">Terbayar: ${formatter.format(item.amount_paid || 0)}</span>
                                <span class="text-red-600 font-medium">Sisa: ${formatter.format(item.amount || 0)}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-orange-500 h-2 rounded-full transition-all duration-300" style="width: ${progressPercentage}%"></div>
                            </div>
                            <p class="text-xs text-gray-600 mt-1">Total: ${formatter.format(item.total_due || 0)}</p>
                        </div>
                    </div>
                    <div class="shrink-0 flex gap-2 ml-4">
                        <button class="whatsapp-btn flex items-center justify-center w-8 h-8 bg-green-500 hover:bg-green-600 rounded-lg transition-colors" title="Kirim WhatsApp" data-invoice-id="${invoiceId}">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" /></svg>
                        </button>
                        <button class="installment-btn flex items-center justify-center h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors" title="Bayar Cicilan Lagi" data-invoice-id="${invoiceId}" data-remaining-amount="${item.amount}" data-customer-name="${customerName}">
                            Cicil Lagi
                        </button>
                        <button class="mark-paid-btn flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-medium leading-normal w-fit" data-invoice-id="${invoiceId}">
                            <span class="truncate">Lunas</span>
                        </button>
                    </div>
                `;
            } else { // Tab 'paid'
    // Siapkan variabel untuk tanggal pembayaran
    let paymentDateHtml = '<div class="w-12 shrink-0"></div>'; // Placeholder jika tanggal tidak ada

    // Cek apakah ada data paid_at
    if (item.paid_at) {
        const paidDate = new Date(item.paid_at);
        const day = paidDate.getDate().toString().padStart(2, '0');
        const month = paidDate.toLocaleString('id-ID', { month: 'short' });
        const year = paidDate.getFullYear();
        
        paymentDateHtml = `
            <div class="flex flex-col items-center justify-center w-12 shrink-0 text-center">
                <p class="text-lg font-bold text-gray-800">${day}</p>
                <p class="text-xs text-gray-500">${month}</p>
                <p class="text-xs text-gray-500">${year}</p>
            </div>
        `;
    }

    // Gabungkan semua bagian menjadi satu
    invoiceDiv.innerHTML = `
        ${paymentDateHtml}
        <div class="flex flex-col justify-center gap-1 flex-1">
            <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
            <span class="${pillClasses.bg} ${pillClasses.text} text-xs font-medium w-fit px-2.5 py-0.5 rounded-full">
                ${period}
            </span>
        </div>
        <div class="shrink-0 flex items-center gap-3">
            <div class="flex flex-col items-end">
                <p class="text-green-600 text-base font-bold leading-normal">LUNAS</p>
                <p class="text-gray-500 text-xs font-medium leading-normal">${item.payment_method || 'Tidak diketahui'}</p>
            </div>
            <button class="detail-btn flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 transition-colors" data-invoice-id="${invoiceId}" title="Lihat Detail">
                <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
                </svg>
            </button>
        </div>
    `;
}
            invoiceList.appendChild(invoiceDiv);
        });
    }

    function handleInvoiceListClick(event) {
        const button = event.target.closest('button');
        if (!button) return;
        const invoiceId = button.dataset.invoiceId;
        if (!invoiceId) return;
        
        // Cari data di semua array berdasarkan tab aktif
        let targetItem;
        if (currentTab === 'unpaid') {
            targetItem = unpaidData.find(item => item.id === invoiceId);
        } else if (currentTab === 'installment') {
            targetItem = installmentData.find(item => item.id === invoiceId);
        } else {
            targetItem = paidData.find(item => item.id === invoiceId);
        }
        
        if (!targetItem) {
            showErrorNotification('Data tagihan tidak ditemukan.');
            return;
        }
        
        if (button.classList.contains('mark-paid-btn')) {
            markAsPaid(targetItem);
        } else if (button.classList.contains('whatsapp-btn')) {
            sendWhatsAppMessage(targetItem);
        } else if (button.classList.contains('installment-btn')) {
            handleInstallmentPayment(targetItem);
        } else if (button.classList.contains('detail-btn')) {
            navigateToPaymentDetail(targetItem);
        }
    }
    
    async function navigateToPaymentDetail(invoice) {
        if (!invoice || !invoice.id) {
            showErrorNotification('Error: Data tagihan tidak lengkap.');
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

        // Get current admin name
        const currentAdmin = await getCurrentAdminName();


        // Populate data with null safety
        if (detailCustomerName) detailCustomerName.textContent = invoiceData.profiles?.full_name || 'Tidak tersedia';
        if (detailCustomerId) detailCustomerId.textContent = invoiceData.profiles?.idpl || 'Tidak tersedia';
        if (detailCustomerWhatsapp) detailCustomerWhatsapp.textContent = invoiceData.profiles?.whatsapp_number || 'Tidak tersedia';
        if (detailInvoicePeriod) detailInvoicePeriod.textContent = invoiceData.invoice_period || 'Tidak tersedia';
        // For paid invoices, use total_due or amount_paid instead of amount (which is remaining)
        const displayAmount = invoiceData.status === 'paid' 
            ? (invoiceData.total_due || invoiceData.amount_paid || invoiceData.amount)
            : invoiceData.amount;
        if (detailInvoiceAmount) detailInvoiceAmount.textContent = formatter.format(displayAmount || 0);
        if (detailPaidDate) detailPaidDate.textContent = formattedDate;
        if (detailPaymentMethod) detailPaymentMethod.textContent = invoiceData.payment_method || 'Tidak diketahui';
        if (detailAdminName) detailAdminName.textContent = currentAdmin || 'Admin';
    }
    
    async function handleInstallmentPayment(invoice) {
        if (!invoice || !invoice.id) {
            showErrorNotification('Error: Data tagihan tidak lengkap.');
            return;
        }

        const customerName = invoice.profiles.full_name || 'Pelanggan';
        const remainingAmount = invoice.amount || 0;
        const totalDue = invoice.total_due || remainingAmount;
        const amountPaid = invoice.amount_paid || 0;

        // Buat modal cicilan
        showInstallmentModal({
            invoiceId: invoice.id,
            customerName: customerName,
            totalDue: totalDue,
            amountPaid: amountPaid,
            remainingAmount: remainingAmount,
            invoicePeriod: invoice.invoice_period
        });
    }

    async function markAsPaid(invoice) {
        if (!invoice || !invoice.id) {
            showErrorNotification('Error: Data tagihan tidak lengkap.');
            return;
        }

        const customerName = invoice.profiles.full_name || 'Pelanggan';
        const remainingAmount = invoice.amount || 0;
        const totalDue = invoice.total_due || remainingAmount;
        const amountPaid = invoice.amount_paid || 0;

        // Buat modal pembayaran lunas
        showFullPaymentModal({
            invoiceId: invoice.id,
            customerName: customerName,
            totalDue: totalDue,
            amountPaid: amountPaid,
            remainingAmount: remainingAmount,
            invoicePeriod: invoice.invoice_period
        });
    }
    
    function sendWhatsAppMessage(rowData) {
        if (!rowData || !rowData.profiles) {
            showErrorNotification('Data pelanggan tidak valid untuk mengirim WhatsApp');
            return;
        }
        const customerName = rowData.profiles.full_name || 'Pelanggan';
        const customerId = rowData.profiles.idpl || '';
        const whatsappNumber = rowData.profiles.whatsapp_number || '';
        const billAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(rowData.amount);
        const billPeriod = rowData.invoice_period || '';
        if (!whatsappNumber) {
            alert('Nomor WhatsApp pelanggan tidak tersedia!');
            return;
        }
        const message = `Informasi Tagihan WiFi Anda\n\nHai Bapak/Ibu ${customerName},\nID Pelanggan: ${customerId}\n\nInformasi tagihan Bapak/Ibu bulan ini adalah:\nJumlah Tagihan: ${billAmount}\nPeriode Tagihan: ${billPeriod}\n\nBayar tagihan Anda di salah satu rekening di bawah ini:\n• Seabank 901307925714 An. TAUFIQ AZIZ\n• BCA 3621053653 An. TAUFIQ AZIZ\n• BSI 7211806138 An. TAUFIQ AZIZ\n• Dana 089609497390 An. TAUFIQ AZIZ\n\nTerima kasih atas kepercayaan Anda menggunakan layanan kami.\n_____________________________\n*Ini adalah pesan otomatis. Jika telah membayar tagihan, abaikan pesan ini.`;
        let cleanedNumber = String(whatsappNumber).replace(/[^0-9+]/g, '');
        if (!cleanedNumber.startsWith('+') && !cleanedNumber.startsWith('62')) {
            cleanedNumber = cleanedNumber.startsWith('0') ? '62' + cleanedNumber.substring(1) : '62' + cleanedNumber;
        }
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        showSuccessNotification(`Pesan WhatsApp untuk ${customerName} telah dibuka!`);
    }

    async function handleCreateInvoices() {
        const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' });
        const currentYear = new Date().getFullYear();
        const confirmMessage = `Apakah Anda yakin ingin membuat tagihan untuk bulan ${currentMonthName} ${currentYear}? Proses ini akan dijalankan untuk semua pelanggan aktif yang belum memiliki tagihan bulan ini.`;
    
        if (!confirm(confirmMessage)) {
            return;
        }
    
        showPaymentLoading('Membuat tagihan bulanan...');
    
        try {
            const { data, error } = await supabase.rpc('create_monthly_invoices_v2');
    
            hidePaymentLoading();
    
            if (error) {
                throw new Error(error.message);
            }
    
            if (data && data.status === 'success') {
                showSuccessNotification(data.message);
                fetchData();
            } else {
                throw new Error(data.message || 'Terjadi kesalahan di server.');
            }
    
        } catch (error) {
            hidePaymentLoading();
            console.error('Error creating invoices:', error);
            showErrorNotification(`Gagal membuat tagihan: ${error.message}`);
        }
    }

    function showLoading() {
        invoiceList.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'skeleton-item flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="flex flex-col justify-center flex-1 gap-2">
                    <div class="skeleton-line h-4 bg-gray-300 rounded w-3/4"></div>
                    <div class="skeleton-line h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div class="shrink-0 flex gap-2">
                    <div class="skeleton-button w-8 h-8 bg-gray-300 rounded-lg"></div>
                    <div class="skeleton-button w-12 h-8 bg-gray-300 rounded-lg"></div>
                    <div class="skeleton-button w-20 h-8 bg-gray-300 rounded-lg"></div>
                </div>
            `;
            invoiceList.appendChild(skeletonItem);
        }
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `@keyframes skeleton-loading { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } } .skeleton-line, .skeleton-button { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200px 100%; animation: skeleton-loading 1.5s infinite; } .skeleton-item { pointer-events: none; }`;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        const skeletonItems = document.querySelectorAll('.skeleton-item');
        skeletonItems.forEach(item => item.remove());
    }
    
    function showPaymentLoading(text = 'Memproses...') {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'payment-loading-overlay';
        loadingOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
        loadingOverlay.innerHTML = `<div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);"><div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #683fe4; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div><div>${text}</div></div>`;
        if (!document.getElementById('payment-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'payment-loading-styles';
            style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
        document.body.appendChild(loadingOverlay);
    }

    function hidePaymentLoading() {
        const loadingOverlay = document.getElementById('payment-loading-overlay');
        if (loadingOverlay) loadingOverlay.remove();
    }
    
    function showSuccessNotification(message) {
        showNotification(message, '#28a745', '✓');
    }
    
    function showErrorNotification(message) {
        showNotification(message, '#dc3545', '⚠');
    }
    
    function showInstallmentModal(invoiceData) {
        // Hapus modal yang sudah ada jika ada
        const existingModal = document.getElementById('installment-modal');
        if (existingModal) existingModal.remove();

        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
        
        const modal = document.createElement('div');
        modal.id = 'installment-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0, 0, 0, 0.5); display: flex; 
            justify-content: center; align-items: center; z-index: 1001;
        `;
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">Pembayaran Cicilan</h3>
                    <button id="close-installment-modal" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
                </div>
                
                <div class="space-y-3 mb-4">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Pelanggan:</span>
                        <span class="font-medium">${invoiceData.customerName}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Periode:</span>
                        <span class="font-medium">${invoiceData.invoicePeriod}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Total Tagihan:</span>
                        <span class="font-medium">${formatter.format(invoiceData.totalDue)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Sudah Dibayar:</span>
                        <span class="font-medium text-green-600">${formatter.format(invoiceData.amountPaid)}</span>
                    </div>
                    <div class="flex justify-between border-t pt-2">
                        <span class="text-gray-800 font-semibold">Sisa Tagihan:</span>
                        <span class="font-bold text-red-600">${formatter.format(invoiceData.remainingAmount)}</span>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Jumlah Bayar:</label>
                        <input type="number" id="payment-amount" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                               placeholder="Masukkan jumlah" min="1" max="${invoiceData.remainingAmount}">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran:</label>
                        <select id="payment-method" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="cash">Tunai</option>
                            <option value="transfer">Transfer Bank</option>
                            <option value="ewallet">E-Wallet</option>
                            <option value="qris">QRIS</option> </select>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Catatan (Opsional):</label>
                        <textarea id="payment-note" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                  rows="2" placeholder="Catatan pembayaran..."></textarea>
                    </div>
                </div>
                
                <div class="flex gap-3 mt-6">
                    <button id="cancel-payment" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                        Batal
                    </button>
                    <button id="process-payment" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                        Proses Pembayaran
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners untuk modal
        document.getElementById('close-installment-modal').addEventListener('click', () => modal.remove());
        document.getElementById('cancel-payment').addEventListener('click', () => modal.remove());
        document.getElementById('process-payment').addEventListener('click', () => processInstallmentPayment(invoiceData, modal));
        
        // Close modal saat klik di luar
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Focus ke input amount
        setTimeout(() => {
            document.getElementById('payment-amount').focus();
        }, 100);
    }

    function showFullPaymentModal(invoiceData) {
        // Hapus modal yang sudah ada jika ada
        const existingModal = document.getElementById('full-payment-modal');
        if (existingModal) existingModal.remove();

        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
        
        const modal = document.createElement('div');
        modal.id = 'full-payment-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0, 0, 0, 0.5); display: flex; 
            justify-content: center; align-items: center; z-index: 1001;
        `;
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">Pembayaran Lunas</h3>
                    <button id="close-full-payment-modal" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
                </div>
                
                <div class="space-y-3 mb-4">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Pelanggan:</span>
                        <span class="font-medium">${invoiceData.customerName}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Periode:</span>
                        <span class="font-medium">${invoiceData.invoicePeriod}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Total Tagihan:</span>
                        <span class="font-medium">${formatter.format(invoiceData.totalDue)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Sudah Dibayar:</span>
                        <span class="font-medium text-green-600">${formatter.format(invoiceData.amountPaid)}</span>
                    </div>
                    <div class="flex justify-between border-t pt-2">
                        <span class="text-gray-800 font-semibold">Sisa Tagihan:</span>
                        <span class="font-bold text-red-600">${formatter.format(invoiceData.remainingAmount)}</span>
                    </div>
                </div>
                
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-green-800">
                                <strong>Pembayaran Lunas</strong><br>
                                Jumlah yang akan dibayar: <strong>${formatter.format(invoiceData.remainingAmount)}</strong>
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran:</label>
                        <select id="full-payment-method" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="cash">Tunai</option>
                            <option value="transfer">Transfer Bank</option>
                            <option value="ewallet">E-Wallet</option>
                            <option value="qris">QRIS</option> </select>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Catatan (Opsional):</label>
                        <textarea id="full-payment-note" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" 
                                  rows="2" placeholder="Catatan pembayaran..."></textarea>
                    </div>
                </div>
                
                <div class="flex gap-3 mt-6">
                    <button id="cancel-full-payment" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                        Batal
                    </button>
                    <button id="process-full-payment" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
                        Bayar Lunas
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners untuk modal
        document.getElementById('close-full-payment-modal').addEventListener('click', () => modal.remove());
        document.getElementById('cancel-full-payment').addEventListener('click', () => modal.remove());
        document.getElementById('process-full-payment').addEventListener('click', () => processFullPayment(invoiceData, modal));
        
        // Close modal saat klik di luar
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Focus ke select method
        setTimeout(() => {
            document.getElementById('full-payment-method').focus();
        }, 100);
    }
    
    async function processInstallmentPayment(invoiceData, modal) {
        const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
        const paymentMethod = document.getElementById('payment-method').value;
        const paymentNote = document.getElementById('payment-note').value;
        
        // Validasi input
        if (!paymentAmount || paymentAmount <= 0) {
            showErrorNotification('Masukkan jumlah pembayaran yang valid');
            return;
        }
        
        if (paymentAmount > invoiceData.remainingAmount) {
            showErrorNotification(`Jumlah pembayaran tidak boleh melebihi sisa tagihan (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(invoiceData.remainingAmount)})`);
            return;
        }
        
        showPaymentLoading('Memproses pembayaran cicilan...');
        
        try {
            const adminName = await getCurrentAdminName();
            
            const { data, error } = await supabase.rpc('process_installment_payment', {
                p_invoice_id: invoiceData.invoiceId,
                p_payment_amount: paymentAmount,
                p_admin_name: adminName,
                p_payment_method: paymentMethod,
                p_note: paymentNote
            });
            
            if (error) throw error;
            
            if (!data.success) {
                throw new Error(data.message);
            }
            
            hidePaymentLoading();
            modal.remove();
            showSuccessNotification(data.message);
            
            // Send WhatsApp notification untuk cicilan
            try {
                const adminName = await getCurrentAdminName();
                
                // Ambil data customer dari invoice untuk notifikasi
                const { data: invoiceWithCustomer, error: customerError } = await supabase
                    .from('invoices')
                    .select(
                        `
                        customer_id,
                        profiles!inner (
                            id, full_name, idpl, whatsapp_number
                        )
                    `)
                    .eq('id', invoiceData.invoiceId)
                    .single();
                
                if (customerError) {
                    console.error('Error fetching customer data:', customerError);
                } else if (invoiceWithCustomer && invoiceWithCustomer.profiles && invoiceWithCustomer.profiles.whatsapp_number) {
                    sendInstallmentWhatsAppNotification({
                        customer: invoiceWithCustomer.profiles,
                        invoiceId: invoiceData.invoiceId,
                        paymentAmount: paymentAmount,
                        remainingAfterPayment: data.data.remaining_amount,
                        totalDue: invoiceData.totalDue,
                        invoicePeriod: invoiceData.invoicePeriod,
                        paymentMethod: paymentMethod,
                        isFullyPaid: data.data.new_status === 'paid'
                    });
                }
            } catch (notificationError) {
                console.error('WhatsApp notification error:', notificationError);
                // Tidak perlu show error karena pembayaran sudah berhasil
            }
            
            fetchData();
            
        } catch (error) {
            console.error('Error processing installment payment:', error);
            hidePaymentLoading();
            showErrorNotification(`Error: ${error.message}`);
        }
    }

    async function processFullPayment(invoiceData, modal) {
        const paymentMethod = document.getElementById('full-payment-method').value;
        const paymentNote = document.getElementById('full-payment-note').value;
        const paymentAmount = invoiceData.remainingAmount; // Selalu bayar sisa tagihan
        
        showPaymentLoading('Memproses pembayaran lunas...');
        
        try {
            const adminName = await getCurrentAdminName();
            
            const { data, error } = await supabase.rpc('process_installment_payment', {
                p_invoice_id: invoiceData.invoiceId,
                p_payment_amount: paymentAmount,
                p_admin_name: adminName,
                p_payment_method: paymentMethod,
                p_note: paymentNote || 'Pembayaran lunas langsung'
            });
            
            if (error) throw error;
            
            if (!data.success) {
                throw new Error(data.message);
            }
            
            hidePaymentLoading();
            modal.remove();
            showSuccessNotification(data.message);
            
            // Send WhatsApp notification untuk pembayaran lunas
            try {
                const adminName = await getCurrentAdminName();
                
                // Ambil data customer dari invoice untuk notifikasi
                const { data: invoiceWithCustomer, error: customerError } = await supabase
                    .from('invoices')
                    .select(
                        `
                        customer_id,
                        profiles!inner (
                            id, full_name, idpl, whatsapp_number
                        )
                    `)
                    .eq('id', invoiceData.invoiceId)
                    .single();
                
                if (customerError) {
                    console.error('Error fetching customer data:', customerError);
                } else if (invoiceWithCustomer && invoiceWithCustomer.profiles && invoiceWithCustomer.profiles.whatsapp_number) {
                    sendInstallmentWhatsAppNotification({
                        customer: invoiceWithCustomer.profiles,
                        invoiceId: invoiceData.invoiceId,
                        paymentAmount: paymentAmount,
                        remainingAfterPayment: 0, // Lunas, sisa 0
                        totalDue: invoiceData.totalDue,
                        invoicePeriod: invoiceData.invoicePeriod,
                        paymentMethod: paymentMethod,
                        isFullyPaid: true // Selalu true untuk pembayaran lunas
                    });
                }
            } catch (notificationError) {
                console.error('WhatsApp notification error:', notificationError);
                // Tidak perlu show error karena pembayaran sudah berhasil
            }
            
            fetchData();
            
        } catch (error) {
            console.error('Error processing full payment:', error);
            hidePaymentLoading();
            showErrorNotification(`Error: ${error.message}`);
        }
    }

    async function sendInstallmentWhatsAppNotification(paymentData) {
        const { customer, paymentAmount, remainingAfterPayment, totalDue, invoicePeriod, paymentMethod, isFullyPaid } = paymentData;
        
        if (!customer.whatsapp_number) {
            console.warn('Customer WhatsApp number not available');
            return;
        }

        try {
            // Get admin name
            const adminName = await getCurrentAdminName();
            
            // Prepare customer data for notification
            const customerData = {
                id: customer.id,
                full_name: customer.full_name,
                idpl: customer.idpl,
                whatsapp_number: customer.whatsapp_number
            };
            
            // Prepare invoice data for notification
            const invoiceData = {
                id: paymentData.invoiceId || 'unknown',
                invoice_period: invoicePeriod,
                amount: isFullyPaid ? totalDue : paymentAmount,
                paid_at: new Date().toISOString(),
                payment_method: paymentMethod,
                remaining_amount: remainingAfterPayment,
                is_fully_paid: isFullyPaid
            };
            
            // Send automatic WhatsApp notification to customer
            const customerNotificationResult = await sendCustomerPaymentNotification(customerData, invoiceData, paymentMethod);
            
            // Send notification to admin about payment received
            const adminNotificationResult = await sendPaymentNotification(customerData, invoiceData, adminName);
            
            // Show results
            if (customerNotificationResult.success) {
                const statusText = isFullyPaid ? 'LUNAS' : 'CICILAN';
                showSuccessNotification(`✅ Notifikasi WhatsApp ${statusText} berhasil dikirim ke ${customer.full_name}`);
            } else {
                showErrorNotification(`⚠️ Gagal mengirim notifikasi ke pelanggan: ${customerNotificationResult.message}`);
            }
            
            if (adminNotificationResult.success) {
                showSuccessNotification(`✅ Notifikasi pembayaran berhasil dikirim ke admin`);
            } else {
                console.warn('Admin notification failed:', adminNotificationResult.message);
            }
            
        } catch (error) {
            console.error('Error sending WhatsApp notifications:', error);
            showErrorNotification(`⚠️ Error mengirim notifikasi: ${error.message}`);
        }
    }

    function showNotification(message, bgColor, icon) {
        const notification = document.createElement('div');
        notification.style.cssText = `position: fixed; top: 20px; right: 20px; background-color: ${bgColor}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 1002; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); animation: slideInRight 0.3s ease;`;
        notification.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><span>${icon}</span><span>${message}</span></div>`;
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }`;
            document.head.appendChild(style);
        }
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                notification.addEventListener('animationend', () => notification.remove());
            }
        }, 3000);
    }
});
