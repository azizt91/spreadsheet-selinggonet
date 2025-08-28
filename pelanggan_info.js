// pelanggan_info.js - Payment Information Page with Copy Functionality and WhatsApp Integration

document.addEventListener('DOMContentLoaded', function() {
    // Check session and get user data
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const userLevel = sessionStorage.getItem('userLevel');
    const userIdpl = sessionStorage.getItem('userIdpl');

    // Redirect if not logged in or not a customer
    if (!loggedInUser || userLevel !== 'USER' || !userIdpl) {
        alert('Akses tidak valid. Silakan login sebagai pelanggan.');
        window.location.href = 'index.html';
        return;
    }

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
            // Get customer data for personalized message
            const customerData = await fetchCustomerData();
            const customerName = customerData ? customerData.NAMA : loggedInUser;
            
            // Create WhatsApp message
            const message = createTransferConfirmationMessage(customerName, userIdpl);
            
            // Send to WhatsApp
            sendWhatsAppMessage(message);
            
        } catch (error) {
            console.error('Error fetching customer data:', error);
            // Fallback to basic message
            const basicMessage = createTransferConfirmationMessage(loggedInUser, userIdpl);
            sendWhatsAppMessage(basicMessage);
        }
    }

    function handleLocationRequest() {
        const customerName = loggedInUser;
        const message = createLocationRequestMessage(customerName, userIdpl);
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
    async function fetchCustomerData() {
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getPelanggan`);
            if (!response.ok) throw new Error('Gagal mengambil data pelanggan');
            
            const customerList = await response.json();
            return customerList.find(customer => customer.IDPL === userIdpl);
        } catch (error) {
            console.error('Error fetching customer data:', error);
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