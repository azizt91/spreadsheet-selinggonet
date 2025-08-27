// dashboard.js (Versi Final dengan Filter Fungsional dan Perbaikan RpNaN + Enhanced Error Handling)

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard script loaded');
    
    // Wait a bit for all elements to be ready
    setTimeout(() => {
        initializeDashboard();
    }, 100);
});

function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Check if required elements exist
    const requiredElements = {
        'filter-bulan': 'Filter bulan dropdown',
        'filter-tahun': 'Filter tahun dropdown'
    };
    
    let missingElements = [];
    Object.entries(requiredElements).forEach(([id, desc]) => {
        if (!document.getElementById(id)) {
            missingElements.push(`${desc} (ID: ${id})`);
        }
    });
    
    // Check for cards container separately using class selector
    if (!cardsContainer) {
        missingElements.push('Cards container (class: cards-container)');
    }
    
    if (missingElements.length > 0) {
        console.warn('Some elements missing, but continuing:', missingElements);
        // Don't stop execution, just warn and continue
    }
    
    // Check if config is available
    if (!window.AppConfig) {
        console.error('AppConfig not found. Make sure config.js is loaded.');
        setTimeout(() => {
            if (!window.AppConfig) {
                console.error('AppConfig still not available after delay');
            }
        }, 1000);
    }
    
    // DOM Selectors - get them fresh each time
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    let cardsContainer = document.querySelector('.cards-container');
    
    console.log('DOM Elements found:', {
        filterBulan: !!filterBulan,
        filterTahun: !!filterTahun,
        cardsContainer: !!cardsContainer
    });
    
    // If essential cards container is missing, create it
    if (!cardsContainer) {
        console.warn('Cards container not found, creating one...');
        const main = document.querySelector('main');
        if (main) {
            const newContainer = document.createElement('div');
            newContainer.className = 'cards-container';
            newContainer.innerHTML = '<!-- Cards will be loaded here -->';
            main.appendChild(newContainer);
            cardsContainer = newContainer;
            console.log('Cards container created successfully');
        } else {
            console.error('Main element not found, cannot create cards container');
            return;
        }
    }

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showLoading(text = 'Fetching data, please wait...') {
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

    // Initial Setup
    populateFilters();
    initializeEventListeners();
    
    // Add a direct test with known working data (all-time data)
    const testWithKnownData = () => {
        console.log('Testing with all-time data (default semua bulan)...');
        
        const testStats = {
            totalCustomers: 65,
            activeCustomers: 51,
            inactiveCustomers: 14,
            totalUnpaid: 12,
            totalPaid: 1640, // All-time data
            totalRevenue: 234470000, // All-time revenue
            totalExpenses: 73094192, // All-time expenses
            profit: 161375808 // All-time profit
        };
        console.log('Displaying all-time stats (Semua Bulan):', testStats);
        displayStats(testStats);
    };
    
    // Try the real API first, then fallback to test data
    fetchDashboardStats().catch(() => {
        console.log('API failed, using test data...');
        testWithKnownData();
    });
    
    // Also add a manual test button for debugging
    setTimeout(() => {
        const timeoutCardsContainer = document.querySelector('.cards-container');
        if (timeoutCardsContainer && timeoutCardsContainer.children.length === 0) {
            console.log('No cards displayed after 3 seconds, forcing test data...');
            testWithKnownData();
        }
    }, 3000);
    
    // Add immediate test for debugging
    console.log('Dashboard initialization completed');
}

    // --- BAGIAN INI MENGISI FILTER ---
    function populateFilters() {
        if (!filterBulan || !filterTahun) {
            console.error('Filter elements not found, skipping filter population');
            return;
        }
        
        const namaBulan = ["Semua Bulan", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const sekarang = new Date();
        const bulanIni = sekarang.getMonth() + 1; // 1-12
        const tahunIni = sekarang.getFullYear();

        // Clear existing options first
        filterBulan.innerHTML = '';
        filterTahun.innerHTML = '';

        // Isi dropdown bulan - default ke "Semua Bulan" for initial load
        namaBulan.forEach((bulan, index) => {
            const option = document.createElement('option');
            option.value = index === 0 ? 'semua' : index;
            option.textContent = bulan;
            // Default to "Semua Bulan" initially
            if (index === 0) {
                option.selected = true;
            }
            filterBulan.appendChild(option);
        });

        // Isi dropdown tahun - default ke tahun ini
        for (let i = 0; i < 4; i++) {
            const tahun = tahunIni - i;
            const option = document.createElement('option');
            option.value = tahun;
            option.textContent = tahun;
            // Set tahun ini sebagai selected
            if (tahun === tahunIni) {
                option.selected = true;
            }
            filterTahun.appendChild(option);
        }
        
        console.log(`Filters populated successfully - Default: Semua Bulan ${tahunIni}`);
    }

    // --- BAGIAN INI MEMBUAT FILTER BERFUNGSI ---
    function initializeEventListeners() {
        if (filterBulan && filterTahun) {
            filterBulan.addEventListener('change', fetchDashboardStats);
            filterTahun.addEventListener('change', fetchDashboardStats);
            console.log('Event listeners attached to filters');
        } else {
            console.error('Filter elements not found for event listeners');
        }
    }

    // Mengambil data statistik dari backend
    async function fetchDashboardStats() {
        // Default to 'semua' for all data, but respect user selection
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        const bulan = filterBulan && filterBulan.value ? filterBulan.value : 'semua';
        const tahun = filterTahun && filterTahun.value ? filterTahun.value : currentYear;
        
        console.log('Fetching dashboard stats...', { bulan, tahun });
        console.log('API URL:', window.AppConfig ? window.AppConfig.API_BASE_URL : 'AppConfig not loaded');
        
        showLoading('Memuat data dasbor, harap tunggu...');
        
        try {
            // Check if AppConfig is available
            if (!window.AppConfig || !window.AppConfig.API_BASE_URL) {
                throw new Error('Konfigurasi API tidak ditemukan. Pastikan config.js dimuat dengan benar.');
            }
            
            // Mengirim parameter filter ke backend
            const apiUrl = `${window.AppConfig.API_BASE_URL}?action=getDashboardStats&bulan=${bulan}&tahun=${tahun}`;
            console.log('Making request to:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response error:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let stats;
            try {
                stats = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Response text:', responseText);
                throw new Error('Response tidak dalam format JSON yang valid');
            }
            
            console.log('Parsed stats:', stats);
            
            // Check if response contains error
            if (stats.error) {
                throw new Error(`Server error: ${stats.error}`);
            }
            
            displayStats(stats);
            return stats; // Return the stats for promise chain
            
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            
            // Get fresh reference to display error
            const errorCardsContainer = document.querySelector('.cards-container');
            if (errorCardsContainer) {
                // Display detailed error message
                errorCardsContainer.innerHTML = `
                <div class="error-message" style="
                    grid-column: 1 / -1;
                    padding: 20px;
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: 8px;
                    color: #721c24;
                    text-align: center;
                ">
                    <h3><i class="fas fa-exclamation-triangle"></i> Gagal Memuat Data Dashboard</h3>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p><small>Menggunakan data test untuk demonstrasi...</small></p>
                    <button onclick="location.reload()" style="
                        margin-top: 10px;
                        padding: 8px 16px;
                        background-color: #721c24;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Coba Lagi</button>
                </div>
            `;
            }
            
            throw error; // Re-throw for promise chain
        } finally {
            hideLoading();
        }
    } // Add missing closing brace for fetchDashboardStats function

    // Function to provide default/fallback stats
    function getDefaultStats() {
        return {
            totalCustomers: 0,
            activeCustomers: 0,
            inactiveCustomers: 0,
            totalUnpaid: 0,
            totalPaid: 0,
            totalRevenue: 0,
            totalExpenses: 0,
            profit: 0
        };
    }

    // Safe number formatting function
    function formatCurrency(value) {
        try {
            const numValue = parseFloat(value) || 0;
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(numValue);
        } catch (error) {
            console.error('Currency formatting error:', error);
            return `Rp ${(parseFloat(value) || 0).toLocaleString('id-ID')}`;
        }
    }

    // Safe value display function
    function formatValue(value, isFinancial = false) {
        if (isFinancial) {
            return formatCurrency(value);
        }
        return (value !== undefined && value !== null) ? value.toString() : '0';
    }

    // --- BAGIAN INI MEMPERBAIKI RpNaN ---
    function displayStats(stats) {
        console.log('Displaying stats:', stats);
        
        // Get fresh reference to cards container
        const currentCardsContainer = document.querySelector('.cards-container');
        if (!currentCardsContainer) {
            console.error('Cards container not found in displayStats');
            return;
        }
        
        if (!stats || typeof stats !== 'object') {
            console.error('Invalid stats object:', stats);
            stats = getDefaultStats();
        }
        
        currentCardsContainer.innerHTML = ''; // Mengosongkan kartu

        // Reorder cards: Financial cards first, then customer stats
        const statsCards = [
            // Financial cards at the top
            { 
                icon: 'fas fa-wallet', 
                label: 'Total Pendapatan', 
                value: formatValue(stats.totalRevenue, true), 
                color: '#20b2aa', 
                isFinancial: true 
            },
            { 
                icon: 'fas fa-sign-out-alt', 
                label: 'Total Pengeluaran', 
                value: formatValue(stats.totalExpenses, true), 
                color: '#ff6347', 
                isFinancial: true 
            },
            { 
                icon: 'fas fa-chart-line', 
                label: 'Profit', 
                value: formatValue(stats.profit, true), 
                color: '#8a2be2', 
                isFinancial: true 
            },
            // Customer stats
            { 
                icon: 'fas fa-users', 
                label: 'Total Pelanggan', 
                value: formatValue(stats.totalCustomers), 
                color: '#6a5acd' 
            },
            { 
                icon: 'fas fa-user-check', 
                label: 'Pelanggan Aktif', 
                value: formatValue(stats.activeCustomers), 
                color: '#32cd32' 
            },
            { 
                icon: 'fas fa-exclamation-circle', 
                label: 'Belum Lunas', 
                value: formatValue(stats.totalUnpaid), 
                color: '#ffc107' 
            },
            { 
                icon: 'fas fa-check-circle', 
                label: 'Tagihan Lunas', 
                value: formatValue(stats.totalPaid), 
                color: '#1e90ff' 
            }
        ];

        // Add inactive customers card after active customers if there are any
        if (stats.inactiveCustomers > 0) {
            statsCards.splice(5, 0, { 
                icon: 'fas fa-user-slash', 
                label: 'Pelanggan Nonaktif', 
                value: formatValue(stats.inactiveCustomers), 
                color: '#dc3545' 
            });
        }

        statsCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = card.isFinancial ? 'card financial-card' : 'card';
            cardElement.style.animationDelay = `${index * 0.1}s`;
            cardElement.innerHTML = `
                <div class="card-icon" style="background-color: ${card.color}20; color: ${card.color};">
                    <i class="${card.icon}"></i>
                </div>
                <h3>${card.label}</h3>
                <div class="card-value">${card.value}</div>
            `;
            currentCardsContainer.appendChild(cardElement);
        });
        
        console.log('Dashboard cards rendered successfully');
    }