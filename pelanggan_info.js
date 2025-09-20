// pelanggan_info.js - Payment Information Page with Copy Functionality and WhatsApp Integration
import { supabase } from './supabase-client.js';
import { checkAuth, requireRole } from './auth.js';

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication and require USER role
    currentUser = await requireRole('USER');
    if (!currentUser) return; // Stop if not authenticated or not USER role

    // Fetch current user profile
    await fetchCurrentProfile();

    // DOM Elements
    const confirmTransferBtn = document.getElementById('confirm-transfer-btn');
    const contactLocationBtn = document.getElementById('contact-location-btn');
    
    // Initialize event listeners
    initializeEventListeners();

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        // Transfer confirmation button
        if (confirmTransferBtn) {
            confirmTransferBtn.addEventListener('click', handleTransferConfirmation);
        }

        // Contact for location button
        if (contactLocationBtn) {
            contactLocationBtn.addEventListener('click', handleLocationRequest);
        }

        // QRIS Modal Listeners
        const qrisImage = document.getElementById('qris-image');
        const qrisModal = document.getElementById('qris-modal');
        const closeQrisModalBtn = document.getElementById('close-qris-modal');

        if (qrisImage && qrisModal && closeQrisModalBtn) {
            qrisImage.addEventListener('click', () => {
                qrisModal.classList.remove('hidden');
            });

            closeQrisModalBtn.addEventListener('click', () => {
                qrisModal.classList.add('hidden');
            });

            // Hide modal if backdrop is clicked
            qrisModal.addEventListener('click', (e) => {
                if (e.target === qrisModal) {
                    qrisModal.classList.add('hidden');
                }
            });
        }
    }

    // ===============================================
    // Copy to Clipboard Functionality
    // ===============================================
    window.copyToClipboard = function(elementId, buttonElement) {
        const textElement = document.getElementById(elementId);
        const textToCopy = textElement.textContent.trim();
        
        // Create a temporary textarea element
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = textToCopy;
        document.body.appendChild(tempTextarea);
        
        try {
            // Select and copy the text
            tempTextarea.select();
            tempTextarea.setSelectionRange(0, 99999); // For mobile devices
            document.execCommand('copy');
            
            // Update button appearance
            const originalIcon = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="fas fa-check"></i>';
            buttonElement.classList.add('copied');
            
            // Show toast notification
            showToast(`Nomor rekening ${textToCopy} berhasil disalin!`, 'success');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                buttonElement.innerHTML = originalIcon;
                buttonElement.classList.remove('copied');
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showToast('Gagal menyalin nomor rekening. Silakan salin manual.', 'error');
        } finally {
            // Remove temporary element
            document.body.removeChild(tempTextarea);
        }
    };

    // ===============================================
    // WhatsApp Integration Functions
    // ===============================================
    async function handleTransferConfirmation() {
        try {
            // Use current profile data for personalized message
            const customerName = currentProfile ? currentProfile.full_name : currentUser.email;
            const customerIdpl = currentProfile ? currentProfile.idpl : 'N/A';
            
            // Create WhatsApp message
            const message = createTransferConfirmationMessage(customerName, customerIdpl);
            
            // Send to WhatsApp
            sendWhatsAppMessage(message);
            
        } catch (error) {
            console.error('Error creating transfer confirmation:', error);
            // Fallback to basic message
            const basicMessage = createTransferConfirmationMessage(currentUser.email, 'N/A');
            sendWhatsAppMessage(basicMessage);
        }
    }

    function handleLocationRequest() {
        const customerName = currentProfile ? currentProfile.full_name : currentUser.email;
        const customerIdpl = currentProfile ? currentProfile.idpl : 'N/A';
        const message = createLocationRequestMessage(customerName, customerIdpl);
        sendWhatsAppMessage(message);
    }

    function createTransferConfirmationMessage(customerName, idpl) {
        const currentDate = new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const currentTime = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `🏦 *KONFIRMASI PEMBAYARAN TRANSFER*

Halo Admin Selinggonet,

Saya ingin mengkonfirmasi pembayaran tagihan internet:

👤 *Nama:* ${customerName}
🆔 *ID Pelanggan:* ${idpl}
📅 *Tanggal:* ${currentDate}
🕐 *Waktu:* ${currentTime}

💰 *Status:* Sudah melakukan transfer pembayaran
📋 *Keterangan:* Mohon verifikasi pembayaran saya

Bukti transfer akan saya kirim setelah pesan ini.

Terima kasih! 🙏

_Pesan otomatis dari aplikasi Selinggonet_`;
    }

    function createLocationRequestMessage(customerName, idpl) {
        return `📍 *PERMINTAAN ALAMAT LENGKAP*

Halo Admin Selinggonet,

Saya ingin mendapatkan alamat lengkap untuk pembayaran langsung:

👤 *Nama:* ${customerName}
🆔 *ID Pelanggan:* ${idpl}
🏠 *Keperluan:* Pembayaran tagihan langsung ke rumah

Mohon dikirimkan:
• Alamat lengkap
• Koordinat lokasi (jika ada)
• Jam operasional terbaru

Terima kasih! 🙏

_Pesan otomatis dari aplikasi Selinggonet_`;
    }

    function sendWhatsAppMessage(message) {
        const whatsappNumber = '6281914170701'; // Admin WhatsApp number
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        
        // Open WhatsApp in new tab
        window.open(whatsappUrl, '_blank');
        
        // Show confirmation toast
        showToast('Mengarahkan ke WhatsApp...', 'info');
    }

    // ===============================================
    // Helper Functions
    // ===============================================
    async function fetchCurrentProfile() {
        try {
            console.log('Fetching profile for user:', currentUser.id);
            
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
            
            return profile;
        } catch (error) {
            console.error('Error fetching customer profile:', error);
            return null;
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        if (!toast || !toastMessage) return;
        
        // Set message and type
        toastMessage.textContent = message;
        toast.className = `toast toast-${type}`;
        
        // Show toast
        toast.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ===============================================
    // UI Enhancement Functions
    // ===============================================
    function addCardHoverEffects() {
        const bankCards = document.querySelectorAll('.bank-card');
        
        bankCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            });
        });
    }

    // Initialize UI enhancements
    addCardHoverEffects();

    // ===============================================
    // Loading Functions (if needed for future use)
    // ===============================================
    function showLoading(text = 'Memuat...') {
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
});