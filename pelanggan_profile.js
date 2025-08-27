// pelanggan_profile.js - Customer Profile Management

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

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const profileForm = document.getElementById('profile-form');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const cancelBtn = document.getElementById('cancel-btn');
    
    // Form fields
    const rowNumberField = document.getElementById('rowNumber');
    const idplField = document.getElementById('idpl');
    const namaField = document.getElementById('nama');
    const userField = document.getElementById('user');
    const passwordField = document.getElementById('password');
    const whatsappField = document.getElementById('whatsapp');
    
    // Info display elements
    const infoIdpl = document.getElementById('info-idpl');
    const infoStatus = document.getElementById('info-status');
    const infoPaket = document.getElementById('info-paket');
    const infoTanggal = document.getElementById('info-tanggal');

    // ===============================================
    // Loading Management Functions
    // ===============================================
    function showLoading(text = 'Memuat profile Anda...') {
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

    function setButtonLoading(button, loading, originalText) {
        if (loading) {
            button.dataset.originalText = originalText || button.innerHTML;
            button.innerHTML = '<span class="loading-spinner-sm"></span>Menyimpan...';
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText || originalText || '<i class="fas fa-save"></i> Simpan Perubahan';
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        profileForm.addEventListener('submit', handleProfileUpdate);
        
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
        
        cancelBtn.addEventListener('click', () => {
            if (confirm('Apakah Anda yakin ingin membatalkan perubahan?')) {
                loadCustomerProfile(); // Reload original data
            }
        });
    }

    // ===============================================
    // Password Toggle Functionality
    // ===============================================
    function togglePasswordVisibility() {
        const passwordInput = passwordField;
        const icon = togglePasswordBtn.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    // ===============================================
    // Data Loading Functions
    // ===============================================
    async function loadCustomerProfile() {
        showLoading('Memuat data profile Anda...');
        
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getPelanggan`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();

            if (!Array.isArray(responseData)) {
                if (responseData && responseData.error) throw new Error(`Error dari server: ${responseData.error}`);
                throw new TypeError('Format data yang diterima dari server salah.');
            }
            
            // Find current customer data
            const customerProfile = responseData.find(customer => customer.IDPL === userIdpl);
            if (!customerProfile) {
                throw new Error('Data profile tidak ditemukan');
            }

            // Populate form fields
            populateProfileForm(customerProfile);
            populateProfileInfo(customerProfile);

        } catch (error) {
            console.error('Error loading profile:', error);
            alert(`Gagal memuat data profile: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    // ===============================================
    // Form Population Functions
    // ===============================================
    function populateProfileForm(profile) {
        rowNumberField.value = profile.rowNumber || '';
        idplField.value = profile.IDPL || '';
        namaField.value = profile.NAMA || '';
        userField.value = profile.USER || '';
        passwordField.value = ''; // Always start empty for security
        whatsappField.value = profile.WHATSAPP || '';
    }

    function populateProfileInfo(profile) {
        infoIdpl.textContent = profile.IDPL || '-';
        
        // Status with styling
        const status = profile.STATUS || 'N/A';
        infoStatus.textContent = status;
        infoStatus.className = `info-value status-pill ${status.toUpperCase() === 'AKTIF' ? 'status-aktif' : 'status-nonaktif'}`;
        
        infoPaket.textContent = profile.PAKET || '-';
        
        // Format date
        const tanggalPasang = profile['TANGGAL PASANG'];
        if (tanggalPasang) {
            try {
                const date = new Date(tanggalPasang);
                infoTanggal.textContent = date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            } catch (error) {
                infoTanggal.textContent = tanggalPasang;
            }
        } else {
            infoTanggal.textContent = '-';
        }
    }

    // ===============================================
    // Profile Update Functions
    // ===============================================
    async function handleProfileUpdate(event) {
        event.preventDefault();
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        // Validate required fields
        if (!namaField.value.trim() || !userField.value.trim() || !whatsappField.value.trim()) {
            alert('Mohon lengkapi semua field yang diperlukan.');
            return;
        }

        // Confirm update
        if (!confirm('Apakah Anda yakin ingin menyimpan perubahan profile?')) {
            return;
        }

        setButtonLoading(submitButton, true);
        
        try {
            const updateData = {
                nama: namaField.value.trim(),
                user: userField.value.trim(),
                whatsapp: whatsappField.value.trim()
            };
            
            // Only include password if it's not empty
            if (passwordField.value.trim()) {
                updateData.password = passwordField.value.trim();
            }

            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'updatePelanggan',
                    rowNumber: parseInt(rowNumberField.value),
                    data: updateData
                })
            });

            const result = await response.json();
            
            if (response.ok && !result.error) {
                // Update session storage if username changed
                if (updateData.user !== loggedInUser) {
                    sessionStorage.setItem('loggedInUser', updateData.user);
                }
                
                alert('Profile berhasil diperbarui!');
                
                // Clear password field for security
                passwordField.value = '';
                
                // Reload profile data to reflect changes
                await loadCustomerProfile();
                
            } else {
                throw new Error(result.error || 'Gagal memperbarui profile');
            }
            
        } catch (error) {
            console.error('Error updating profile:', error);
            alert(`Gagal memperbarui profile: ${error.message}`);
        } finally {
            setButtonLoading(submitButton, false);
        }
    }

    // ===============================================
    // Utility Functions
    // ===============================================
    function formatPhoneNumber(phone) {
        // Remove non-digits
        let cleaned = phone.replace(/\D/g, '');
        
        // Add country code if missing
        if (cleaned.startsWith('8')) {
            cleaned = '62' + cleaned;
        } else if (cleaned.startsWith('08')) {
            cleaned = '62' + cleaned.substring(1);
        }
        
        return cleaned;
    }

    // Format WhatsApp number on input
    whatsappField.addEventListener('blur', function() {
        if (this.value.trim()) {
            this.value = formatPhoneNumber(this.value);
        }
    });

    // ===============================================
    // Initialize Profile Page
    // ===============================================
    initializeEventListeners();
    loadCustomerProfile();
});