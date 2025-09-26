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

    // Initial Setup
    populateFilters();
    initializeEventListeners();
    
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
            { label: 'Profit', value: formatter.format(stats.profit || 0), gradient: 'gradient-card-1', icon: '💰' },
            { label: 'Pendapatan', value: formatter.format(stats.total_revenue || 0), gradient: 'gradient-card-2', icon: '📈' },
            { label: 'Pengeluaran', value: formatter.format(stats.total_expenses || 0), gradient: 'gradient-card-3', icon: '💸' },
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
            
            cardElement.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div class="text-3xl">${card.icon}</div>
                </div>
                <p class="text-white/90 text-sm font-medium mb-2">${card.label}</p>
                <p class="text-white text-xl font-bold leading-tight">${card.value}</p>
                ${card.link ? '<div class="mt-4 text-white/80 text-xs">👆 Ketuk untuk detail</div>' : ''}
            `;

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