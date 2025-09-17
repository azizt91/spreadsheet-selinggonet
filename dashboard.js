// dashboard.js (Supabase version)
import { supabase } from './supabase-client.js';
import { requireRole } from './auth.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Ensure the user is an ADMIN, otherwise redirect.
    await requireRole('ADMIN');

    // DOM Selectors
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const cardsContainer = document.getElementById('cards-container');

    // Initial Setup
    populateFilters();
    initializeEventListeners();
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
        
        showLoading();
        
        try {
            // Call the RPC function in Supabase
            const { data: stats, error } = await supabase.rpc('get_dashboard_stats', {
                p_month: month_filter,
                p_year: year_filter
            });

            if (error) {
                throw new Error(`Supabase RPC Error: ${error.message}`);
            }

            hideLoading();
            displayStats(stats[0]); // RPC returns an array, get the first element

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            hideLoading();
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


        const statsCards = [
            { label: 'Profit', value: formatter.format(stats.profit || 0), gradient: 'gradient-card-1', icon: '💰' },
            { label: 'Pendapatan', value: formatter.format(stats.total_revenue || 0), gradient: 'gradient-card-2', icon: '📈' },
            { label: 'Pengeluaran', value: formatter.format(stats.total_expenses || 0), gradient: 'gradient-card-3', icon: '💸' },
            { label: 'Pelanggan Aktif', value: stats.active_customers || 0, gradient: 'gradient-card-4', icon: '👥' },
            { label: 'Pelanggan Tdk Aktif', value: stats.inactive_customers || 0, gradient: 'gradient-card-5', icon: '😴' },
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
});

