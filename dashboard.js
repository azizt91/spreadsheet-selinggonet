// dashboard.js (Supabase version)
import { supabase } from './supabase-client.js';
import { requireRole, initLogout } from './auth.js';
import { getUnreadNotificationCount } from './notification-service.js';
import { addNotificationIconToHeader, initNotificationBadge } from './notification-badge.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Ensure the user is an ADMIN, otherwise redirect.
    const user = await requireRole('ADMIN');
    if (!user) return; // Stop execution if not authenticated

    initLogout('dashboard-logout-btn');
    populateUserInfo(user);

    // Inisialisasi ikon notifikasi dan badge
    addNotificationIconToHeader();
    initNotificationBadge(user.id);


    // New function to populate user info
    async function populateUserInfo(user) {
        const userGreeting = document.getElementById('user-greeting');
        const userEmail = document.getElementById('user-email');
        const userAvatar = document.getElementById('user-avatar'); // Get the avatar element

        if (!userGreeting || !userEmail) return;

        // Set email immediately
        userEmail.textContent = user.email;

        // Fetch full_name and photo_url from profiles
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('full_name, photo_url') // Fetch photo_url as well
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (profile) {
                userGreeting.textContent = `Hallo, ${profile.full_name || 'Admin'}`;
                
                // Set the avatar image
                if (profile.photo_url && userAvatar) {
                    userAvatar.style.backgroundImage = `url('${profile.photo_url}')`;
                } else if (userAvatar) {
                    // Optional: Fallback to initials if no photo
                    const initials = (profile.full_name || 'A').charAt(0).toUpperCase();
                    userAvatar.innerHTML = `<span class="text-white text-xl font-bold flex items-center justify-center h-full">${initials}</span>`;
                    userAvatar.style.backgroundColor = 'rgba(255,255,255,0.3)';
                }
            } else {
                userGreeting.textContent = `Hallo, Admin`;
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            userGreeting.textContent = 'Hallo!';
        }
    }

    // DOM Selectors
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const cardsContainer = document.getElementById('cards-container');
    // ... (setelah const cardsContainer)
    const chartsWrapper = document.getElementById('charts-wrapper');
    const chartsSkeletonContainer = document.getElementById('charts-skeleton-container');

    // State untuk visibility nominal (gunakan localStorage)
    let nominalVisibility = {
        profit: localStorage.getItem('visibility_profit') !== 'false',
        pendapatan: localStorage.getItem('visibility_pendapatan') !== 'false',
        pengeluaran: localStorage.getItem('visibility_pengeluaran') !== 'false'
    };

    // Initial Setup
    populateFilters();
    initializeEventListeners();
    initializeStickyHeader(); // Initialize sticky header behavior
    
    // Show loading immediately before any async operations
    showLoading();
    showChartsLoading();
    
    fetchDashboardStats(); // Initial call on page load

    function populateFilters() {
        const namaBulan = ["Semua Bulan", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const sekarang = new Date();
        const bulanIni = sekarang.getMonth() + 1;
        const tahunIni = sekarang.getFullYear();

        namaBulan.forEach((bulan, index) => {
            const option = document.createElement('option');
            option.value = index; // Use 0 for "Semua Bulan"
            option.textContent = bulan;
            if (index === bulanIni) {
                option.selected = true;
            }
            filterBulan.appendChild(option);
        });

        for (let i = 0; i < 4; i++) {
            const tahun = tahunIni - i;
            const option = document.createElement('option');
            option.value = tahun;
            option.textContent = tahun;
            filterTahun.appendChild(option);
        }
    }

    // Sticky Header Management
    function initializeStickyHeader() {
        const stickyElement = document.querySelector('.header-sticky');
        if (!stickyElement) return;
        
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.intersectionRatio < 1) {
                    stickyElement.classList.add('is-sticky');
                } else {
                    stickyElement.classList.remove('is-sticky');
                }
            },
            { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
        );
        
        observer.observe(stickyElement);
    }

    function initializeEventListeners() {
        filterBulan.addEventListener('change', fetchDashboardStats);
        filterTahun.addEventListener('change', fetchDashboardStats);
    }

    async function fetchDashboardStats() {
        const month_filter = parseInt(filterBulan.value, 10);
        const year_filter = parseInt(filterTahun.value, 10);
        
        // Only show loading if not already showing (to prevent double loading on initial load)
        if (!document.querySelector('.skeleton-card')) {
            showLoading();
        }
        
        try {
            // Call the RPC function in Supabase for stats
            const { data: stats, error } = await supabase.rpc('get_dashboard_stats', {
                p_month: month_filter,
                p_year: year_filter
            });

            if (error) {
                throw new Error(`Supabase RPC Error: ${error.message}`);
            }

            // Call the RPC function for charts data
            const { data: chartsData, error: chartsError } = await supabase.rpc('get_dashboard_charts_data', {
                p_months: 6
            });

            if (chartsError) {
                console.warn('Charts data error:', chartsError.message);
            }

            hideLoading();
            displayStats(stats[0]); // RPC returns an array, get the first element
            
            // Render charts if data available
            if (chartsData) {
                console.log('Charts data received:', chartsData);
                renderCharts(chartsData);
                hideChartsLoading();
            } else {
                console.warn('No charts data received');
                hideChartsLoading();
            }

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            hideLoading();
            hideChartsLoading();
            cardsContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Gagal memuat data: ${error.message}</p>`;
        }
    }

    // Fungsi untuk toggle visibility nominal
    function toggleNominalVisibility(cardType) {
        nominalVisibility[cardType] = !nominalVisibility[cardType];
        localStorage.setItem(`visibility_${cardType}`, nominalVisibility[cardType]);
        
        // Update tampilan card
        const valueElement = document.getElementById(`value-${cardType}`);
        const eyeIcon = document.getElementById(`eye-icon-${cardType}`);
        
        if (valueElement && eyeIcon) {
            if (nominalVisibility[cardType]) {
                valueElement.textContent = valueElement.dataset.originalValue;
                eyeIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path></svg>`;
            } else {
                valueElement.textContent = 'Rp ...';
                eyeIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.11,127.11,0,0,0,52.07-10.83l22,24.21a8,8,0,1,0,11.84-10.76Zm47.33,75.84,41.67,45.85a32,32,0,0,1-41.67-45.85ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,63.66,70l14.73,16.2A112,112,0,0,1,128,192Zm6-95.43a8,8,0,0,1,3-15.72,48.16,48.16,0,0,1,38.77,42.64,8,8,0,0,1-7.22,8.71,6.39,6.39,0,0,1-.75,0,8,8,0,0,1-8-7.26A32.09,32.09,0,0,0,134,96.57Zm113.28,34.69c-.42.94-10.55,23.37-33.36,43.8a8,8,0,1,1-10.67-11.92A132.77,132.77,0,0,0,231.05,128a133.15,133.15,0,0,0-23.12-30.77C185.67,75.19,158.78,64,128,64a118.37,118.37,0,0,0-19.36,1.57A8,8,0,1,1,106,49.79,134,134,0,0,1,128,48c34.88,0,66.57,13.26,91.66,38.35,18.83,18.83,27.3,37.62,27.65,38.41A8,8,0,0,1,247.31,131.26Z"></path></svg>`;
            }
        }
    }

    function displayStats(stats) {
        cardsContainer.innerHTML = '';

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        const selectedMonth = filterBulan.value;
        const selectedYear = filterTahun.value;
        
        // Membuat URL dengan parameter filter
        const unpaidLink = `tagihan.html?status=unpaid&bulan=${selectedMonth}&tahun=${selectedYear}`;
        const paidLink = `tagihan.html?status=paid&bulan=${selectedMonth}&tahun=${selectedYear}`;
        const activeCustomersLink = `pelanggan.html?status=AKTIF`;
        const inactiveCustomersLink = `pelanggan.html?status=NONAKTIF`;

        const statsCards = [
            { label: 'Profit', value: formatter.format(stats.profit || 0), gradient: 'gradient-card-1', icon: '💰', hideToggle: true, cardType: 'profit' },
            { label: 'Pendapatan', value: formatter.format(stats.total_revenue || 0), gradient: 'gradient-card-2', icon: '📈', hideToggle: true, cardType: 'pendapatan' },
            { label: 'Pengeluaran', value: formatter.format(stats.total_expenses || 0), gradient: 'gradient-card-3', icon: '💸', hideToggle: true, cardType: 'pengeluaran' },
            { label: 'Pelanggan Aktif', value: stats.active_customers || 0, gradient: 'gradient-card-4', icon: '👥', link: activeCustomersLink },
            { label: 'Pelanggan Tdk Aktif', value: stats.inactive_customers || 0, gradient: 'gradient-card-5', icon: '😴', link: inactiveCustomersLink },
            { label: 'Belum Dibayar', value: stats.unpaid_invoices_count || 0, gradient: 'gradient-card-6', icon: '⏳', link: unpaidLink },
            { label: 'Lunas Bulan Ini', value: stats.paid_invoices_count || 0, gradient: 'gradient-card-7', icon: '✅', link: paidLink }
        ];

        statsCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            let cardClasses = 'card-hover rounded-3xl p-6 text-white shadow-lg animate-fadeInUp';
            
            if (index === 0) {
                cardClasses += ' col-span-2';
            }
            cardElement.className = `${card.gradient} ${cardClasses}`;
            cardElement.style.animationDelay = `${index * 0.1}s`;
            
            // Tentukan apakah nilai harus disembunyikan
            const isVisible = card.hideToggle ? nominalVisibility[card.cardType] : true;
            const displayValue = isVisible ? card.value : 'Rp ...';
            
            // Icon mata
            const eyeIconSVG = isVisible 
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.11,127.11,0,0,0,52.07-10.83l22,24.21a8,8,0,1,0,11.84-10.76Zm47.33,75.84,41.67,45.85a32,32,0,0,1-41.67-45.85ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,63.66,70l14.73,16.2A112,112,0,0,1,128,192Zm6-95.43a8,8,0,0,1,3-15.72,48.16,48.16,0,0,1,38.77,42.64,8,8,0,0,1-7.22,8.71,6.39,6.39,0,0,1-.75,0,8,8,0,0,1-8-7.26A32.09,32.09,0,0,0,134,96.57Zm113.28,34.69c-.42.94-10.55,23.37-33.36,43.8a8,8,0,1,1-10.67-11.92A132.77,132.77,0,0,0,231.05,128a133.15,133.15,0,0,0-23.12-30.77C185.67,75.19,158.78,64,128,64a118.37,118.37,0,0,0-19.36,1.57A8,8,0,1,1,106,49.79,134,134,0,0,1,128,48c34.88,0,66.57,13.26,91.66,38.35,18.83,18.83,27.3,37.62,27.65,38.41A8,8,0,0,1,247.31,131.26Z"></path></svg>`;
            
            cardElement.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div class="text-3xl">${card.icon}</div>
                    ${card.hideToggle ? `<button class="eye-toggle-btn" id="eye-btn-${card.cardType}" aria-label="Toggle visibility"><span id="eye-icon-${card.cardType}">${eyeIconSVG}</span></button>` : ''}
                </div>
                <p class="text-white/90 text-sm font-medium mb-2">${card.label}</p>
                <p class="text-white text-xl font-bold leading-tight value-transition" id="value-${card.cardType}" data-original-value="${card.value}">${displayValue}</p>
                ${card.link ? '<div class="mt-4 text-white/80 text-xs">👆 Ketuk untuk detail</div>' : ''}
            `;

            // Add event listener untuk toggle eye
            if (card.hideToggle) {
                const eyeBtn = cardElement.querySelector(`#eye-btn-${card.cardType}`);
                if (eyeBtn) {
                    eyeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleNominalVisibility(card.cardType);
                    });
                }
            }

            if (card.link) {
                cardElement.classList.add('cursor-pointer');
                cardElement.addEventListener('click', () => {
                    window.location.href = card.link;
                });
            }

            cardsContainer.appendChild(cardElement);
        });
    }

    function showLoading() {
        cardsContainer.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'skeleton-card glass-card rounded-2xl p-4 min-h-[120px]';
            if (i === 0) {
                skeletonCard.classList.add('col-span-2');
                skeletonCard.className += ' min-h-[100px]';
            }
            skeletonCard.innerHTML = `
                <div class="flex items-start justify-between mb-2">
                    <div class="skeleton-line w-6 h-6 rounded-full"></div>
                </div>
                <div class="flex-1">
                    <div class="skeleton-line h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
                    <div class="skeleton-line h-5 bg-gray-300 rounded w-3/4"></div>
                </div>
            `;
            cardsContainer.appendChild(skeletonCard);
        }
    }

    function hideLoading() {
        const skeletonCards = document.querySelectorAll('.skeleton-card');
        skeletonCards.forEach(card => card.remove());
    }

    // function showChartsLoading() {
    //     const chartContainers = ['revenueChart', 'paymentStatusChart', 'customerGrowthChart', 'customerTotalChart'];
        
    //     chartContainers.forEach(chartId => {
    //         const canvas = document.getElementById(chartId);
    //         if (canvas) {
    //             const container = canvas.parentElement;
    //             // Hide canvas and show loading
    //             canvas.style.display = 'none';
                
    //             // Create loading element
    //             const loadingDiv = document.createElement('div');
    //             loadingDiv.className = 'chart-loading-skeleton';
    //             loadingDiv.innerHTML = `
    //                 <div class="flex items-center justify-center h-full">
    //                     <div class="skeleton-line w-32 h-4 rounded"></div>
    //                 </div>
    //             `;
    //             container.appendChild(loadingDiv);
    //         }
    //     });
    // }

    function showChartsLoading() {
        // Kosongkan container skeleton
        chartsSkeletonContainer.innerHTML = '';
        // Pastikan container chart asli tersembunyi dan skeleton terlihat
        chartsWrapper.style.display = 'none';
        chartsSkeletonContainer.style.display = 'grid';

        // Buat 4 skeleton card untuk chart
        for (let i = 0; i < 4; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'bg-white rounded-2xl shadow-lg p-6 chart-loading'; // Gunakan class .chart-loading
            skeleton.innerHTML = `<div class="w-full h-full skeleton-line"></div>`;
            chartsSkeletonContainer.appendChild(skeleton);
        }
    }

    // function hideChartsLoading() {
    //     const chartContainers = ['revenueChart', 'paymentStatusChart', 'customerGrowthChart', 'customerTotalChart'];
        
    //     chartContainers.forEach(chartId => {
    //         const canvas = document.getElementById(chartId);
    //         if (canvas) {
    //             const container = canvas.parentElement;
    //             // Show canvas and remove loading
    //             canvas.style.display = 'block';
                
    //             // Remove loading element
    //             const loadingDiv = container.querySelector('.chart-loading-skeleton');
    //             if (loadingDiv) {
    //                 loadingDiv.remove();
    //             }
    //         }
    //     });
    // }

    function hideChartsLoading() {
        // Sembunyikan container skeleton
        chartsSkeletonContainer.style.display = 'none';
        // Tampilkan kembali container chart yang asli
        chartsWrapper.style.display = 'grid';
    }

    // Chart instances
    let revenueChart = null;
    let paymentStatusChart = null;
    let customerGrowthChart = null;
    let customerTotalChart = null;

    // Chart rendering function
    function renderCharts(chartsData) {
        try {
            console.log('Rendering charts with data:', chartsData);
            
            // Destroy existing charts
            if (revenueChart) revenueChart.destroy();
            if (paymentStatusChart) paymentStatusChart.destroy();
            if (customerGrowthChart) customerGrowthChart.destroy();
            if (customerTotalChart) customerTotalChart.destroy();

            // Revenue & Profit Line Chart
            const revenueCtx = document.getElementById('revenueChart');
            if (revenueCtx && chartsData.revenue_chart) {
                revenueChart = new Chart(revenueCtx, {
                    type: 'line',
                    data: chartsData.revenue_chart,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': Rp ' + 
                                               new Intl.NumberFormat('id-ID').format(context.parsed.y);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return 'Rp ' + new Intl.NumberFormat('id-ID', {
                                            notation: 'compact',
                                            compactDisplay: 'short'
                                        }).format(value);
                                    }
                                }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        }
                    }
                });
            }

            // Payment Status Pie Chart
            const paymentStatusCtx = document.getElementById('paymentStatusChart');
            console.log('Payment Status Chart - Context:', paymentStatusCtx);
            console.log('Payment Status Chart - Data:', chartsData.payment_status_chart);
            
            if (paymentStatusCtx && chartsData.payment_status_chart) {
                paymentStatusChart = new Chart(paymentStatusCtx, {
                    type: 'doughnut',
                    data: chartsData.payment_status_chart,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                                        return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                                    }
                                }
                            }
                        },
                        cutout: '60%'
                    }
                });
            }

            // Customer Growth Bar Chart (New vs Churn)
            const customerGrowthCtx = document.getElementById('customerGrowthChart');
            if (customerGrowthCtx && chartsData.customer_growth_chart) {
                customerGrowthChart = new Chart(customerGrowthCtx, {
                    type: 'bar',
                    data: chartsData.customer_growth_chart,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + context.parsed.y + ' pelanggan';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }

            // Customer Total Line Chart
            const customerTotalCtx = document.getElementById('customerTotalChart');
            if (customerTotalCtx && chartsData.customer_total_chart) {
                customerTotalChart = new Chart(customerTotalCtx, {
                    type: 'line',
                    data: chartsData.customer_total_chart,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return 'Total Aktif: ' + context.parsed.y + ' pelanggan';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 5
                                }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error rendering charts:', error);
        }
    }
});