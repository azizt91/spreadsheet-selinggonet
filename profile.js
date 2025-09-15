// profile.js (Versi Perbaikan Total untuk Admin)
document.addEventListener('DOMContentLoaded', function() {
    // Fungsi checkSession() sudah dijalankan dari auth.js

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const userLevel = sessionStorage.getItem('userLevel');

    if (userLevel !== 'ADMIN') {
        alert('Hanya admin yang dapat mengakses halaman ini.');
        window.location.href = 'index.html';
        return;
    }

    // --- Global variable to hold current admin data ---
    let currentAdminData = null;

    // --- DOM Element Selectors ---
    const profileView = document.getElementById('profile-view');
    const editView = document.getElementById('edit-view');

    // View Mode Elements
    const profileAvatar = document.getElementById('profileAvatar');
    const adminName = document.getElementById('adminName');
    const adminEmail = document.getElementById('adminEmail');
    const editInfoCard = document.getElementById('edit-info-card');

    // Edit Mode Elements
    const editBackBtn = document.getElementById('edit-back-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const editNama = document.getElementById('edit-nama');
    const editUser = document.getElementById('edit-user');
    const editPassword = document.getElementById('edit-password');

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

            currentAdminData = allUsers.find(user => user.USER === loggedInUser && user.LEVEL === 'ADMIN');
            if (!currentAdminData) throw new Error('Profil admin tidak ditemukan.');

            populateViewMode(currentAdminData);
            populateEditMode(currentAdminData);

        } catch (error) {
            console.error('Error loading profile:', error);
            adminName.textContent = 'Gagal Memuat';
            adminEmail.textContent = 'Silakan coba lagi';
        } finally {
            hideSkeletonLoading();
        }
    }

    // --- Populate view mode with data ---
    function populateViewMode(data) {
        adminName.textContent = data.NAMA || 'Nama Admin';
        adminEmail.textContent = data.USER || 'username';
        
        const photoUrl = data.FOTO;
        if (photoUrl && photoUrl.startsWith('http')) {
            profileAvatar.style.backgroundImage = `url("${photoUrl}")`;
        } else {
            const initials = (data.NAMA || 'A').charAt(0).toUpperCase();
            profileAvatar.style.backgroundImage = `none`;
            profileAvatar.style.backgroundColor = '#6a5acd';
            profileAvatar.innerHTML = `<span class="text-white text-4xl font-bold">${initials}</span>`;
        }
    }

    // --- Populate edit form with data ---
    function populateEditMode(data) {
        editNama.value = data.NAMA || '';
        editUser.value = data.USER || '';
        editPassword.value = ''; // Selalu kosongkan password
    }


    // --- Save changes ---
    async function saveChanges() {
        if (!currentAdminData || !currentAdminData.rowNumber) {
            alert('Error: Data admin tidak lengkap untuk disimpan.');
            return;
        }

        const newNama = editNama.value.trim();
        const newPassword = editPassword.value.trim();

        if (!newNama) {
            alert('Nama Lengkap tidak boleh kosong.');
            return;
        }

        saveBtn.textContent = 'MENYIMPAN...';
        saveBtn.disabled = true;

        try {
            // Data yang akan dikirim ke backend
            const updateData = { ...currentAdminData, nama: newNama };
            
            // Hanya tambahkan password ke payload jika diisi
            if (newPassword) {
                updateData.password = newPassword;
            }

            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'updatePelanggan',
                    rowNumber: currentAdminData.rowNumber,
                    data: updateData
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            alert('Profil berhasil diperbarui!');
            await loadUserProfile(); // Muat ulang data
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
        adminName.className = 'h-7 bg-gray-200 rounded animate-pulse w-48 mb-2';
        adminName.textContent = '';
        adminEmail.className = 'h-5 bg-gray-200 rounded animate-pulse w-32';
        adminEmail.textContent = '';
        profileAvatar.style.backgroundColor = '#e0e0e0';
        profileAvatar.classList.add('animate-pulse');
        profileAvatar.innerHTML = '';
    }

    function hideSkeletonLoading() {
        adminName.className = 'text-[#110e1b] text-[22px] font-bold leading-tight tracking-[-0.015em] text-center';
        adminEmail.className = 'text-[#625095] text-base font-normal leading-normal text-center';
        profileAvatar.classList.remove('animate-pulse');
    }

    // --- Event Listeners ---
    editInfoCard.addEventListener('click', () => toggleMode(true));
    
    // Back button event listener
    editBackBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
            populateEditMode(currentAdminData); // Reset form data
            toggleMode(false);
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin membatalkan perubahan?')) {
            populateEditMode(currentAdminData); // Kembalikan data form
            toggleMode(false);
        }
    });
    saveBtn.addEventListener('click', saveChanges);

    // Initial load
    loadUserProfile();
});
