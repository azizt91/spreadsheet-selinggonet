// profile.js (Supabase Version)
import { supabase } from './supabase-client.js';
import { requireRole, checkAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Profile page loaded, checking authentication...');
    
    // --- Global Variables ---
    let currentAdminData = null;
    let currentUser = null;

    // --- DOM Element Selectors ---
    const profileView = document.getElementById('profile-view');
    const editView = document.getElementById('edit-view');
    const profileAvatar = document.getElementById('profileAvatar');
    const adminName = document.getElementById('adminName');
    const adminEmail = document.getElementById('adminEmail');
    const editInfoCard = document.getElementById('edit-info-card');
    const editBackBtn = document.getElementById('edit-back-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const editNama = document.getElementById('edit-nama');
    const editUser = document.getElementById('edit-user');
    const editPassword = document.getElementById('edit-password');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Authentication Check ---
    try {
        const user = await requireRole('ADMIN');
        if (!user) {
            console.log('Authentication failed, user will be redirected');
            return;
        }
        currentUser = user; // Inisialisasi currentUser di sini
        console.log('Authentication successful for user:', currentUser.id);
    } catch (error) {
        console.error('Authentication error:', error);
        return;
    }

    // --- Core Functions ---

    /**
     * Fetches the complete user profile and populates the UI.
     */
    async function loadUserProfile() {
        showSkeletonLoading();
        try {
            if (!currentUser) throw new Error('User not authenticated.');

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (error) throw new Error(error.message);
            if (!profile) throw new Error('Profil tidak ditemukan');

            currentAdminData = profile;
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

    /**
     * Handles the file selection and upload process for the avatar.
     * @param {Event} event - The file input change event.
     */
    async function handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file || !currentUser) return;

        alert('Mengunggah foto...'); // Notifikasi loading sederhana

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload file to Supabase Storage
            let { error: uploadError } = await supabase.storage
                .from('avatars') // Pastikan nama bucket ini benar
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true // Overwrite existing file
                });
            if (uploadError) throw uploadError;

            // 2. Get the public URL for the uploaded file
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            if (!data.publicUrl) throw new Error("Tidak bisa mendapatkan URL publik.");
            
            // 3. Update the photo_url in the profiles table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ photo_url: data.publicUrl })
                .eq('id', currentUser.id);
            if (updateError) throw updateError;

            // 4. Reload the profile to show the new photo
            alert('Foto profil berhasil diperbarui!');
            await loadUserProfile();

        } catch (error) {
            console.error('Error uploading photo:', error);
            alert(`Gagal mengunggah foto: ${error.message}`);
        }
    }

    /**
     * Saves changes made in the edit profile form.
     */
    async function saveChanges() {
        if (!currentAdminData || !currentUser) {
            alert('Error: Data admin tidak lengkap untuk disimpan.');
            return;
        }

        const newNama = editNama.value.trim();
        const newPassword = editPassword.value.trim();
        const newEmail = editUser.value.trim();

        if (!newNama || !newEmail) {
            alert('Nama Lengkap dan Email tidak boleh kosong.');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            alert('Password baru harus minimal 6 karakter.');
            return;
        }

        saveBtn.textContent = 'MENYIMPAN...';
        saveBtn.disabled = true;

        try {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: newNama })
                .eq('id', currentUser.id);
            if (profileError) throw profileError;

            const authUpdateData = {};
            if (newEmail && newEmail !== currentUser.email) {
                authUpdateData.email = newEmail;
            }
            if (newPassword) {
                authUpdateData.password = newPassword;
            }

            if (Object.keys(authUpdateData).length > 0) {
                const { data: { user }, error: authError } = await supabase.auth.updateUser(authUpdateData);
                if (authError) {
                    // Jika gagal, kembalikan data profil yang gagal diupdate
                    await supabase.from('profiles').update({ full_name: currentAdminData.full_name }).eq('id', currentUser.id);
                    throw new Error(`Gagal memperbarui email/password: ${authError.message}`);
                }
            }

            alert('Profil berhasil diperbarui!');
            await loadUserProfile();
            toggleMode(false);

        } catch (error) {
            console.error('Error saving profile:', error);
            alert(`Gagal menyimpan: ${error.message}`);
        } finally {
            saveBtn.textContent = 'SIMPAN';
            saveBtn.disabled = false;
        }
    }
    
    // --- UI Helper Functions ---
    
    function toggleMode(showEdit) {
        profileView.classList.toggle('hidden', showEdit);
        editView.classList.toggle('hidden', !showEdit);
    }

    function populateViewMode(data) {
        adminName.textContent = data.full_name || 'Nama Admin';
        adminEmail.textContent = currentUser?.email || 'email@example.com';
        
        const photoUrl = data.photo_url;
        if (photoUrl && photoUrl.startsWith('http')) {
            profileAvatar.style.backgroundImage = `url("${photoUrl}")`;
            profileAvatar.innerHTML = ''; 
        } else {
            const initials = (data.full_name || 'A').charAt(0).toUpperCase();
            profileAvatar.style.backgroundImage = `none`;
            profileAvatar.style.backgroundColor = '#6a5acd';
            profileAvatar.innerHTML = `<span class="text-white text-4xl font-bold">${initials}</span>`;
        }
    }

    function populateEditMode(data) {
        editNama.value = data.full_name || '';
        editUser.value = currentUser?.email || '';
        editPassword.value = '';
    }

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

    async function handleLogout() {
        if (confirm('Yakin ingin logout?')) {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Logout error:', error);
                }
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = 'index.html';
            }
        }
    }

    // --- Initialize Event Listeners ---
    editInfoCard.addEventListener('click', () => toggleMode(true));
    editBackBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
            populateEditMode(currentAdminData);
            toggleMode(false);
        }
    });
    cancelBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin membatalkan perubahan?')) {
            populateEditMode(currentAdminData);
            toggleMode(false);
        }
    });
    saveBtn.addEventListener('click', saveChanges);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Event listeners untuk upload foto
    const avatarContainer = document.getElementById('avatarContainer');
    const avatarUploadInput = document.getElementById('avatarUpload');
    if (avatarContainer && avatarUploadInput) {
        avatarContainer.addEventListener('click', () => {
            avatarUploadInput.click();
        });
        avatarUploadInput.addEventListener('change', handlePhotoUpload);
    }
    
    // Event listener untuk Laporan card
    const laporanCard = document.getElementById('laporan-card');
    if (laporanCard) {
        laporanCard.addEventListener('click', () => {
            window.location.href = 'laporan.html';
        });
    }
    
    // --- Initial Load ---
    await loadUserProfile();
});
