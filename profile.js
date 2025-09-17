// profile.js (Supabase Version)
import { supabase } from './supabase-client.js';
import { requireRole, checkAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Profile page loaded, checking authentication...');
    
    try {
        const user = await requireRole('ADMIN');
        if (!user) {
            console.log('Authentication failed, user will be redirected');
            return;
        }
        console.log('Authentication successful for user:', user.id);
    } catch (error) {
        console.error('Authentication error:', error);
        return;
    }

    // --- Global variable to hold current admin data ---
    let currentAdminData = null;
    let currentUser = null;

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
            console.log('Fetching user profile...');
            
            // Get current authenticated user
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Sesi tidak valid');
            }
            
            currentUser = session.user;
            
            // Fetch profile data from profiles table
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            console.log('Profile data:', { profile, error });

            if (error) {
                throw new Error(error.message);
            }

            if (!profile) {
                throw new Error('Profil tidak ditemukan');
            }

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

    // --- Populate view mode with data ---
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

    // --- Populate edit form with data ---
    function populateEditMode(data) {
        editNama.value = data.full_name || '';
        editUser.value = currentUser?.email || '';
        editPassword.value = ''; // Selalu kosongkan password
    }


    // --- Save changes ---
    async function saveChanges() {
        if (!currentAdminData || !currentUser) {
            alert('Error: Data admin tidak lengkap untuk disimpan.');
            return;
        }

        const newNama = editNama.value.trim();
        const newPassword = editPassword.value.trim();

        if (!newNama) {
            alert('Nama Lengkap tidak boleh kosong.');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            alert('Password baru harus minimal 6 karakter.');
            return;
        }

        saveBtn.textContent = 'MENYIMPAN...';
        saveBtn.disabled = true;

        try {
            // Update profile data in profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: newNama })
                .eq('id', currentUser.id);

            if (profileError) {
                throw new Error(profileError.message);
            }

            // Update password if provided
            if (newPassword) {
                const { error: passwordError } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (passwordError) {
                    throw new Error(`Gagal mengubah password: ${passwordError.message}`);
                }
            }

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

    // --- Logout function ---
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
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Initial load
    await loadUserProfile();
});
