// pelanggan_profile.js - Customer Profile with Photo Upload
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

    // --- Global variable to hold current customer data ---
    let currentCustomerData = null;

    // --- DOM Element Selectors ---
    const profileView = document.getElementById('profile-view');
    const editView = document.getElementById('edit-view');

    // View Mode Elements
    const profileAvatar = document.getElementById('profileAvatar');
    const customerName = document.getElementById('customerName');
    const customerEmail = document.getElementById('customerEmail');
    const editInfoCard = document.getElementById('edit-info-card');

    // Edit Mode Elements
    const editBackBtn = document.getElementById('edit-back-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const editNama = document.getElementById('edit-nama');
    const editUser = document.getElementById('edit-user');
    const editPassword = document.getElementById('edit-password');
    const editWhatsapp = document.getElementById('edit-whatsapp');

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');

    // --- Toggle between view and edit mode ---
    function toggleMode(showEdit) {
        if (showEdit) {
            profileView.classList.add('hidden');
            editView.classList.remove('hidden');
        } else {
            profileView.classList.remove('hidden');
            editView.classList.add('hidden');
        }
    }

    // --- Fetch and display profile data ---
    async function loadUserProfile() {
        showSkeletonLoading();
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getPelanggan`);
            if (!response.ok) throw new Error('Gagal mengambil data dari server.');
            
            const allUsers = await response.json();
            if (!Array.isArray(allUsers)) throw new Error('Format data tidak valid.');

            currentCustomerData = allUsers.find(user => 
                user.USER === loggedInUser && 
                user.LEVEL === 'USER' && 
                user.IDPL === userIdpl
            );
            
            if (!currentCustomerData) throw new Error('Profil pelanggan tidak ditemukan.');

            populateViewMode(currentCustomerData);
            populateEditMode(currentCustomerData);

        } catch (error) {
            console.error('Error loading profile:', error);
            customerName.textContent = 'Gagal Memuat';
            customerEmail.textContent = 'Silakan coba lagi';
        } finally {
            hideSkeletonLoading();
        }
    }

    // --- Populate view mode with data ---
    function populateViewMode(data) {
        customerName.textContent = data.NAMA || 'Nama Pelanggan';
        customerEmail.textContent = data.USER || 'username';
        
        const photoUrl = data.FOTO;
        if (photoUrl && photoUrl.startsWith('http')) {
            profileAvatar.style.backgroundImage = `url("${photoUrl}")`;
        } else {
            const initials = (data.NAMA || 'P').charAt(0).toUpperCase();
            profileAvatar.style.backgroundImage = `none`;
            profileAvatar.style.backgroundColor = '#6a5acd';
            profileAvatar.innerHTML = `<span class="text-white text-4xl font-bold">${initials}</span>`;
        }
    }

    // --- Populate edit form with data ---
    function populateEditMode(data) {
        editNama.value = data.NAMA || '';
        editUser.value = data.USER || '';
        editPassword.value = ''; // Always clear password
        editWhatsapp.value = data.WHATSAPP || '';
    }


    // --- Save changes ---
    async function saveChanges() {
        if (!currentCustomerData || !currentCustomerData.rowNumber) {
            alert('Error: Data pelanggan tidak lengkap untuk disimpan.');
            return;
        }

        const newNama = editNama.value.trim();
        const newPassword = editPassword.value.trim();
        const newWhatsapp = editWhatsapp.value.trim();

        if (!newNama) {
            alert('Nama Lengkap tidak boleh kosong.');
            return;
        }

        saveBtn.textContent = 'MENYIMPAN...';
        saveBtn.disabled = true;

        try {
            // Data yang akan dikirim ke backend
            const updateData = { 
                ...currentCustomerData, 
                nama: newNama,
                whatsapp: newWhatsapp
            };
            
            // Hanya tambahkan password ke payload jika diisi
            if (newPassword) {
                updateData.password = newPassword;
            }

            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'updatePelanggan',
                    rowNumber: currentCustomerData.rowNumber,
                    data: updateData
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            alert('Profil berhasil diperbarui!');
            await loadUserProfile(); // Reload data
            toggleMode(false);

        } catch (error) {
            console.error('Error saving profile:', error);
            alert(`Gagal menyimpan: ${error.message}`);
        } finally {
            saveBtn.textContent = 'SIMPAN';
            saveBtn.disabled = false;
        }
    }

    // --- Skeleton Loading Functions ---
    function showSkeletonLoading() {
        customerName.className = 'h-7 bg-gray-200 rounded animate-pulse w-48 mb-2';
        customerName.textContent = '';
        customerEmail.className = 'h-5 bg-gray-200 rounded animate-pulse w-32';
        customerEmail.textContent = '';
        profileAvatar.style.backgroundColor = '#e0e0e0';
        profileAvatar.classList.add('animate-pulse');
        profileAvatar.innerHTML = '';
    }

    function hideSkeletonLoading() {
        customerName.className = 'text-[#110e1b] text-[22px] font-bold leading-tight tracking-[-0.015em] text-center';
        customerEmail.className = 'text-[#625095] text-base font-normal leading-normal text-center';
        profileAvatar.classList.remove('animate-pulse');
    }

    // --- Event Listeners ---
    editInfoCard.addEventListener('click', () => toggleMode(true));
    
    // Back button event listener
    editBackBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
            populateEditMode(currentCustomerData); // Reset form data
            toggleMode(false);
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin membatalkan perubahan?')) {
            populateEditMode(currentCustomerData); // Reset form data
            toggleMode(false);
        }
    });
    
    saveBtn.addEventListener('click', saveChanges);
    
    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin logout?')) {
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    });

    // Initial load
    loadUserProfile();
});