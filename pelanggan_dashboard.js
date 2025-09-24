// pelanggan_dashboard.js - Customer Dashboard with 4 Cards and Loading Indicators
import { supabase } from './supabase-client.js';
import { checkAuth, requireRole, initLogout } from './auth.js';

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication and require USER role
    currentUser = await requireRole('USER');
    if (!currentUser) return; // Stop if not authenticated or not USER role

    initLogout('customer-logout-btn');

    // DOM Elements
    const welcomeText = document.getElementById('welcome-text');
    const customerEmail = document.getElementById('customer-email');
    const cardsContainer = document.getElementById('cards-container');
    const userAvatar = document.getElementById('user-avatar'); // Get the avatar element

    // Initialize dashboard
    await fetchCustomerData();

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showSkeletonLoading() {
        cardsContainer.innerHTML = '';
        
        // Create 4 skeleton cards matching the new grid design
        for (let i = 0; i < 4; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'rounded-2xl p-6 card-hover animate-fadeInUp skeleton-card';
            skeletonCard.innerHTML = `
                <div class="flex flex-col items-start justify-between h-32">
                    <div class="flex items-center justify-between w-full">
                        <div class="bg-gray-200 w-12 h-12 rounded-full skeleton-line"></div>
                        <div class="bg-gray-200 w-6 h-6 rounded skeleton-line"></div>
                    </div>
                    <div class="w-full">
                        <div class="bg-gray-200 h-8 w-16 rounded mb-2 skeleton-line"></div>
                        <div class="bg-gray-200 h-4 w-24 rounded skeleton-line"></div>
                    </div>
                </div>
            `;
            cardsContainer.appendChild(skeletonCard);
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

    function hideSkeletonLoading() {
        const skeletonStyles = document.getElementById('skeleton-styles');
        if (skeletonStyles) {
            skeletonStyles.remove();
        }
    }

    // ===============================================
    // Data Fetching Functions
    // ===============================================
    async function fetchCustomerData() {
        showSkeletonLoading();
        
        try {
            console.log('Fetching customer data for user:', currentUser.id);
            
            // Fetch current customer profile from Supabase
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (profileError) {
                throw new Error(`Gagal mengambil data profil: ${profileError.message}`);
            }

            if (!profile) {
                throw new Error('Data pelanggan tidak ditemukan');
            }

            currentProfile = profile;
            console.log('Customer profile loaded:', profile);

            // Fetch unpaid bills (invoices with status='unpaid')
            const { data: unpaidBills, error: unpaidError } = await supabase
                .from('invoices')
                .select('*')
                .eq('customer_id', currentUser.id)
                .eq('status', 'unpaid');

            if (unpaidError) {
                throw new Error(`Gagal mengambil data tagihan: ${unpaidError.message}`);
            }

            console.log('Unpaid bills loaded:', unpaidBills);

            // Fetch paid bills (invoices with status='paid')
            const { data: paidBills, error: paidError } = await supabase
                .from('invoices')
                .select('*')
                .eq('customer_id', currentUser.id)
                .eq('status', 'paid');

            if (paidError) {
                throw new Error(`Gagal mengambil data lunas: ${paidError.message}`);
            }

            console.log('Paid bills loaded:', paidBills);

            // Display data
            displayCustomerDashboard(profile, unpaidBills || [], paidBills || []);

        } catch (error) {
            console.error('Error fetching customer data:', error);
            // Show error message
            welcomeText.textContent = 'Hallo, Pelanggan';
            cardsContainer.innerHTML = `
                <div class="col-span-2">
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
            hideSkeletonLoading();
        }
    }

    // ===============================================
    // Display Functions
    // ===============================================
    function displayCustomerDashboard(profile, unpaidBills, paidBills) {
        // Update welcome message
        welcomeText.textContent = `Hallo, ${profile.full_name || 'Pelanggan'}`;
        customerEmail.textContent = currentUser.email;

        // Set the avatar image
        if (profile.photo_url && userAvatar) {
            userAvatar.style.backgroundImage = `url('${profile.photo_url}')`;
        } else if (userAvatar) {
            // Optional: Fallback to initials if no photo
            const initials = (profile.full_name || 'P').charAt(0).toUpperCase();
            userAvatar.innerHTML = `<span class="text-white text-xl font-bold flex items-center justify-center h-full">${initials}</span>`;
            userAvatar.style.backgroundColor = 'rgba(255,255,255,0.3)';
        }

        // Clear cards container
        cardsContainer.innerHTML = '';

        // Calculate totals
        const totalUnpaidAmount = unpaidBills.reduce((sum, bill) => {
            const amount = parseFloat(bill.amount || 0);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        const totalPaidAmount = paidBills.reduce((sum, bill) => {
            const amount = parseFloat(bill.amount || 0);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        // Format currency
        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        // Format installation date
        const installDate = profile.installation_date ? 
            formatDate(profile.installation_date) : 'Tidak tersedia';

        // Define cards data with admin dashboard style
        const cards = [
            {
                title: 'Total Belum Dibayar',
                value: 'Rp ' + formatter.format(totalUnpaidAmount).replace('Rp', '').trim(),
                subtitle: '',
                icon: '💳',
                gradient: 'gradient-card-3'
            },
            {
                title: 'Berlangganan Sejak',
                value: installDate.split(' ')[0] + ' ' + installDate.split(' ')[1], // Show day and month
                subtitle: installDate.split(' ')[2] || '', // Show year
                icon: '📅',
                gradient: 'gradient-card-2'
            },
            {
                title: 'Belum Lunas',
                value: unpaidBills.length.toString(),
                subtitle: 'Tagihan',
                icon: '⚠️',
                gradient: 'gradient-card-1'
            },
            {
                title: 'Sudah Lunas',
                value: paidBills.length.toString(),
                subtitle: 'Pembayaran',
                icon: '✅',
                gradient: 'gradient-card-4'
            }
        ];

        // Create and append cards with admin dashboard style
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = `${card.gradient} rounded-2xl p-6 text-white card-hover animate-fadeInUp cursor-pointer transition-transform hover:scale-105`;
            cardElement.style.animationDelay = `${index * 0.1}s`;
            
            // Add click functionality for specific cards
            if (card.title === 'Tagihan Belum Lunas') {
                cardElement.onclick = () => {
                    // Navigate to payment history with unpaid tab
                    sessionStorage.setItem('activeTab', 'unpaid');
                    window.location.href = 'pelanggan_riwayat_lunas.html';
                };
            } else if (card.title === 'Total Sudah Lunas') {
                cardElement.onclick = () => {
                    // Navigate to payment history with paid tab
                    sessionStorage.setItem('activeTab', 'paid');
                    window.location.href = 'pelanggan_riwayat_lunas.html';
                };
            }
            
            // Add "Ketuk untuk detail" text for clickable cards
            const isClickable = card.title === 'Tagihan Belum Lunas' || card.title === 'Total Sudah Lunas';
            
            cardElement.innerHTML = `
                <div class="flex flex-col items-start justify-between h-32">
                    <div class="flex items-center justify-between w-full">
                        <div class="text-2xl">${card.icon}</div>
                        ${isClickable ? `<svg class="w-6 h-6 opacity-70" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                        </svg>` : ''}
                    </div>
                    <div class="w-full">
                        <div class="text-2xl font-bold mb-1">${card.value}</div>
                        <div class="text-sm opacity-90">${card.subtitle}</div>
                        <div class="text-xs opacity-70 mt-1">${card.title}</div>
                        ${isClickable ? '<div class="text-xs opacity-60 mt-1 italic">Ketuk untuk detail</div>' : ''}
                    </div>
                </div>
            `;
            cardsContainer.appendChild(cardElement);
        });
    }

    // ===============================================
    // Utility Functions
    // ===============================================
    function formatDate(dateString) {
        if (!dateString) return 'Tidak tersedia';
        
        try {
            // Handle various date formats
            let date;
            if (dateString instanceof Date) {
                date = dateString;
            } else if (typeof dateString === 'string') {
                // Try to parse the date string
                date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    // If invalid, try to parse as dd/mm/yyyy or dd-mm-yyyy
                    const parts = dateString.split(/[\/-]/);
                    if (parts.length === 3) {
                        // Assume dd/mm/yyyy or dd-mm-yyyy format
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
