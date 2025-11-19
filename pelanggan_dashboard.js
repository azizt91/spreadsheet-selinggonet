// pelanggan_dashboard.js - New version for the revamped customer dashboard
import { supabase } from './supabase-client.js';
import { requireRole } from './auth.js';
import { getWhatsAppNumber } from './apply-settings.js';


let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async function () {
    const loadingOverlay = document.getElementById('loading-overlay');

    // Show loading overlay immediately
    loadingOverlay.style.display = 'flex';

    currentUser = await requireRole('USER');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize logout functionality
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (confirm('Yakin ingin logout?')) {
                try {
                    await supabase.auth.signOut();
                    sessionStorage.clear(); // Clear session storage as well
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Error logging out:', error);
                    showToast('Gagal logout. Silakan coba lagi.', 'error');
                    // Optionally force logout even if there's an error, similar to pelanggan_profile.js
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                }
            }
        });
    }

    await fetchAndDisplayData();
    initializeModalEventListeners();
    await loadPaymentMethods();
});

async function fetchAndDisplayData() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const mainContent = document.querySelector('main');

    try {
        // Fetch profile with package name, unpaid bills, and recent paid bills in parallel
        const [profileRes, unpaidRes, paidRes] = await Promise.all([
            supabase.from('profiles').select('*, packages(package_name)').eq('id', currentUser.id).single(),
            supabase.from('invoices').select('*').eq('customer_id', currentUser.id).eq('status', 'unpaid').order('due_date', { ascending: false }),
            supabase.from('invoices').select('*').eq('customer_id', currentUser.id).eq('status', 'paid').order('paid_at', { ascending: false }).limit(4)
        ]);

        const { data: profile, error: profileError } = profileRes;
        if (profileError) throw profileError;
        if (!profile) throw new Error("Profil pelanggan tidak ditemukan.");
        currentProfile = profile; // Store profile globally

        const { data: unpaidBills, error: unpaidError } = unpaidRes;
        if (unpaidError) throw unpaidError;

        const { data: paidBills, error: paidError } = paidRes;
        if (paidError) throw paidError;

        // Display header info
        displayHeader(profile);

        // Render the main dashboard components
        renderTagihanCard(unpaidBills, paidBills);
        renderPaketAktifCard(profile);
        renderRiwayatPembayaran(paidBills);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        mainContent.innerHTML = `
            <div class="p-4 text-center text-red-600 bg-red-50 rounded-xl">
                <p>Gagal memuat data dashboard.</p>
                <p class="text-sm">${error.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg">Coba Lagi</button>
            </div>`;
    } finally {
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

function displayHeader(profile) {
    const welcomeText = document.getElementById('welcome-text');
    const userAvatar = document.getElementById('user-avatar');

    welcomeText.textContent = `Halo, ${profile.full_name || 'Pelanggan'}!`;

    if (profile.photo_url) {
        userAvatar.style.backgroundImage = `url('${profile.photo_url}')`;
    } else {
        userAvatar.style.backgroundImage = "url('assets/login_illustration.svg')"; // Fallback image
    }
}

function renderTagihanCard(unpaidBills, paidBills) {
    const tagihanCard = document.getElementById('tagihan-card');
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    // State 1: Arrears (Tunggakan)
    if (unpaidBills && unpaidBills.length > 0) {
        const totalTunggakan = unpaidBills.reduce((sum, bill) => sum + bill.amount, 0);
        tagihanCard.innerHTML = `
            <div class="flex flex-col">
                <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Tunggakan</p>
                <p class="text-slate-900 dark:text-white text-3xl font-bold mt-1">${formatter.format(totalTunggakan)}</p>
                <p class="text-red-600 dark:text-red-400 text-sm font-medium mt-1">${unpaidBills.length} tagihan belum dibayar</p>
            </div>
            <div class="flex flex-col gap-3 mt-4">
                ${unpaidBills.slice(0, 2).map(bill => `
                    <div class="flex items-center justify-between rounded-lg bg-white dark:bg-slate-800 p-3">
                        <div class="flex items-center gap-3">
                            <div class="flex items-center justify-center rounded-md size-10 bg-red-100 dark:bg-red-900/50">
                                <span class="material-symbols-outlined text-red-600 dark:text-red-400">receipt_long</span>
                            </div>
                            <div class="flex flex-col justify-center">
                                <p class="font-bold text-slate-900 dark:text-white text-sm">Tagihan ${bill.invoice_period}</p>
                                <p class="text-red-500 dark:text-red-400 text-xs font-semibold">Belum Dibayar</p>
                            </div>
                        </div>
                        <p class="font-semibold text-slate-900 dark:text-white text-sm">${formatter.format(bill.amount)}</p>
                    </div>
                `).join('')}
            </div>
            <button id="bayar-sekarang-btn" class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-base font-bold shadow-lg shadow-primary/30 mt-5">
                <span class="truncate">Bayar Sekarang</span>
            </button>
        `;

        document.getElementById('bayar-sekarang-btn').addEventListener('click', () => {
            const periods = unpaidBills.map(b => b.invoice_period).join(', ');
            const totalAmount = unpaidBills.reduce((sum, b) => sum + b.amount, 0);
            showPaymentModal(periods, totalAmount, formatter.format(totalAmount));
        });
    }
    // State 2: Current month's bill is paid
    else if (paidBills && paidBills.length > 0) {
        const latestBill = paidBills[0];
        tagihanCard.innerHTML = `
            <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Tagihan Bulan Ini</p>
            <p class="text-slate-900 dark:text-white text-3xl font-bold mt-1">${formatter.format(latestBill.amount_paid)}</p>
            <div class="flex items-center justify-between mt-4">
                <div class="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1">
                    <div class="size-2 rounded-full bg-emerald-500"></div>
                    <p class="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">Sudah Dibayar</p>
                </div>
                <button id="lihat-detail-btn" class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold">
                    <span class="truncate">Lihat Detail</span>
                </button>
            </div>
        `;

        document.getElementById('lihat-detail-btn').addEventListener('click', () => {
            sessionStorage.setItem('showDetailForInvoiceId', latestBill.id);
            window.location.href = 'pelanggan_riwayat_lunas.html';
        });
    }
    // State 3: No bills at all (or everything is settled)
    else {
        tagihanCard.innerHTML = `
            <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Tagihan Bulan Ini</p>
            <p class="text-slate-900 dark:text-white text-3xl font-bold mt-1">Rp 0</p>
            <div class="flex items-center justify-between mt-4">
                <div class="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-900/50 px-3 py-1">
                    <div class="size-2 rounded-full bg-gray-500"></div>
                    <p class="text-gray-700 dark:text-gray-300 text-sm font-semibold">Tidak Ada Tagihan</p>
                </div>
            </div>
        `;
    }
}


function renderPaketAktifCard(profile) {
    const paketAktifCard = document.getElementById('paket-aktif-card');
    const speed = profile.packages ? profile.packages.package_name : 'Tidak ada paket';
    const status = profile.status === 'AKTIF' ? 'Terhubung' : 'Nonaktif';
    const statusColor = profile.status === 'AKTIF' ? 'text-primary' : 'text-red-500';

    paketAktifCard.innerHTML = `
        <div class="flex items-center justify-between">
            <p class="text-slate-900 dark:text-white text-base font-bold">Paket Aktif</p>
            <div class="flex items-center gap-1.5 ${statusColor}">
                <span class="material-symbols-outlined text-xl">wifi</span>
                <p class="text-sm font-bold">${status}</p>
            </div>
        </div>
        <div class="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
            <p class="text-slate-900 dark:text-white text-lg font-bold">${speed}</p>
        </div>
    `;
}

function renderRiwayatPembayaran(paidBills) {
    const riwayatList = document.getElementById('riwayat-pembayaran-list');
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    if (!paidBills || paidBills.length === 0) {
        riwayatList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
                <span class="material-symbols-outlined text-slate-300 dark:text-slate-600 mb-3" style="font-size: 48px;">history</span>
                <p class="text-slate-500 dark:text-slate-400 text-sm">Belum ada riwayat pembayaran.</p>
            </div>
        `;
        return;
    }

    riwayatList.innerHTML = paidBills.map((bill, index) => `
        <div class="flex items-center justify-between p-4 ${index < paidBills.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}">
            <div class="flex items-center gap-3">
                <div class="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400">check_circle</span>
                </div>
                <div>
                    <p class="font-bold text-slate-900 dark:text-white text-sm">Pembayaran ${bill.invoice_period}</p>
                    <p class="text-slate-500 dark:text-slate-400 text-xs">${new Date(bill.paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
            </div>
            <p class="font-semibold text-slate-900 dark:text-white text-sm">${formatter.format(bill.amount_paid)}</p>
        </div>
    `).join('');
}

// ===============================================
// Modal and Payment Logic
// ===============================================

function initializeModalEventListeners() {
    const paymentModal = document.getElementById('payment-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const qrisTab = document.getElementById('qris-tab');
    const transferTab = document.getElementById('transfer-tab');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');

    if (closeModalBtn) closeModalBtn.addEventListener('click', hidePaymentModal);
    if (paymentModal) paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            hidePaymentModal();
        }
    });

    if (qrisTab) qrisTab.addEventListener('click', () => switchPaymentTab('qris'));
    if (transferTab) transferTab.addEventListener('click', () => switchPaymentTab('transfer'));
    if (confirmPaymentBtn) confirmPaymentBtn.addEventListener('click', handlePaymentConfirmation);
}

function showPaymentModal(period, amount, amountFormatted) {
    const modal = document.getElementById('payment-modal');
    const modalContent = document.getElementById('modal-content');
    document.getElementById('modal-invoice-period').textContent = period;
    document.getElementById('modal-invoice-amount').textContent = amountFormatted;

    const confirmBtn = document.getElementById('confirm-payment-btn');
    confirmBtn.dataset.period = period;
    confirmBtn.dataset.amountFormatted = amountFormatted;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        if (modalContent) modalContent.classList.remove('scale-95', 'opacity-0');
        if (modalContent) modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hidePaymentModal() {
    const modal = document.getElementById('payment-modal');
    const modalContent = document.getElementById('modal-content');
    if (modalContent) modalContent.classList.remove('scale-100', 'opacity-100');
    if (modalContent) modalContent.classList.add('scale-95', 'opacity-0');
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

    const whatsappNumber = getWhatsAppNumber();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
}

async function loadPaymentMethods() {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        renderPaymentMethods(data || []);
    } catch (error) {
        console.error('Error loading payment methods:', error);
        const container = document.getElementById('payment-methods-container');
        if (container) {
            container.innerHTML = `<p class="text-center text-red-500">Gagal memuat metode transfer.</p>`;
        }
    }
}

function renderPaymentMethods(methods) {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    if (methods.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500">Tidak ada metode transfer yang tersedia.</p>`;
        return;
    }

    container.innerHTML = methods.map(method => {
        const uniqueId = `acc-${method.id}`;
        return `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                <div>
                    <p class="font-semibold text-gray-800">${method.bank_name}</p>
                    <p id="${uniqueId}" class="font-mono text-gray-700">${method.account_number}</p>
                    <p class="text-xs text-gray-500">a.n. ${method.account_holder}</p>
                </div>
                <button class="copy-btn p-2 rounded-md bg-indigo-100 text-indigo-600 hover:bg-indigo-200" onclick="copyToClipboard('${uniqueId}', this)">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM5 11a1 1 0 100 2h4a1 1 0 100-2H5z"></path><path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm2-1a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1H4z" clip-rule="evenodd"></path></svg>
                </button>
            </div>
        `;
    }).join('');
}

window.copyToClipboard = function (elementId, buttonElement) {
    const textElement = document.getElementById(elementId);
    if (!textElement) return;

    const textToCopy = textElement.textContent.trim();
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Nomor rekening ${textToCopy} berhasil disalin!`);
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
    toast.classList.remove('bg-green-500', 'bg-red-500', 'opacity-0', 'invisible');

    if (type === 'success') {
        toast.classList.add('bg-green-500');
    } else {
        toast.classList.add('bg-red-500');
    }

    toast.classList.add('opacity-100', 'visible');

    setTimeout(() => {
        toast.classList.remove('opacity-100', 'visible');
        toast.classList.add('opacity-0', 'invisible');
    }, 3000);
}