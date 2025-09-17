// pelanggan_riwayat_lunas.js - Customer Payment History with Tabs
import { supabase } from './supabase-client.js';
import { checkAuth, requireRole } from './auth.js';

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication and require USER role
    currentUser = await requireRole('USER');
    if (!currentUser) return; // Stop if not authenticated or not USER role

    // DOM Elements
    const contentList = document.getElementById('content-list');
    const searchInput = document.getElementById('search-input');
    const unpaidTab = document.getElementById('unpaidTab');
    const paidTab = document.getElementById('paidTab');
    
    // State management
    let unpaidData = [];
    let paidData = [];
    let currentTab = 'paid'; // Start with paid tab active

    // Initialize the page
    await initializePage();

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderList);
        unpaidTab.addEventListener('click', () => switchTab('unpaid'));
        paidTab.addEventListener('click', () => switchTab('paid'));
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
            
            // Fetch unpaid bills (invoices with status='unpaid')
            const { data: unpaidBills, error: unpaidError } = await supabase
                .from('invoices')
                .select('*')
                .eq('customer_id', currentUser.id)
                .eq('status', 'unpaid')
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
                .select('*')
                .eq('customer_id', currentUser.id)
                .eq('status', 'paid')
                .order('paid_at', { ascending: false });

            if (paidError) {
                throw new Error(`Gagal mengambil data riwayat: ${paidError.message}`);
            }

            console.log('Paid bills loaded:', paidBills);

            // Store data globally
            unpaidData = unpaidBillsWithDueDate || [];
            paidData = paidBills || [];

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
            contentList.innerHTML = `<p class="text-center text-red-500 p-4">Error: Format data tidak valid</p>`;
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
            contentList.innerHTML = `<p class="text-center text-gray-500 p-4">${emptyMessage}</p>`;
            return;
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        filteredData.forEach(item => {
            if (!item) return;

            const amount = item.amount ? formatter.format(item.amount) : 'N/A';
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
                } else {
                    // If no installation_date, use default: 1st of the month
                    // Handle both "YYYY-MM" and "Month YYYY" formats
                    const period = item.invoice_period || '';
                    let year, month;
                    
                    if (period.includes('-')) {
                        [year, month] = period.split('-');
                        month = parseInt(month);
                    } else {
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
                        
                        const parts = period.trim().split(' ');
                        if (parts.length >= 2) {
                            const monthName = parts[0];
                            year = parts[1];
                            month = monthNames[monthName];
                        }
                    }
                    
                    if (year && month) {
                        const defaultDueDate = new Date(parseInt(year), month - 1, 1);
                        dueDate = formatDate(defaultDueDate.toISOString().split('T')[0]);
                    }
                }
                
                console.log(`Rendering bill ${item.invoice_period}: due_date = ${dueDate}`);
                itemDiv.innerHTML = `
                    <div class="flex flex-col justify-center">
                        <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${period}</p>
                        <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">Jatuh tempo: ${dueDate}</p>
                        <p class="text-red-600 text-sm font-medium">${amount}</p>
                    </div>
                    <div class="shrink-0">
                        <button onclick="window.location.href='pelanggan_info.html'" class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#5324e0] text-white text-sm font-medium leading-normal w-fit hover:bg-[#4318d4]">
                            <span class="truncate">Bayar</span>
                        </button>
                    </div>
                `;
            } else {
                const paymentDate = item.paid_at ? 
                    formatDate(item.paid_at) : 'Tanggal tidak tersedia';
                itemDiv.innerHTML = `
                    <div class="flex flex-col justify-center">
                        <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${period}</p>
                        <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">Dibayar: ${paymentDate}</p>
                    </div>
                    <div class="shrink-0 text-right">
                        <p class="text-[#110e1b] text-base font-medium leading-normal">${amount}</p>
                        <p class="text-green-600 text-xs font-medium">✓ Lunas</p>
                    </div>
                `;
            }
            contentList.appendChild(itemDiv);
        });
    }

    // ===============================================
    // Utility Functions
    // ===============================================
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
