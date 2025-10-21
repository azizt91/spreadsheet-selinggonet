// pelanggan_profile.js - Customer Profile with Photo Upload
import { supabase } from './supabase-client.js';
import { checkAuth, requireRole } from './auth.js';

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication and require USER role
    currentUser = await requireRole('USER');
    if (!currentUser) return; // Stop if not authenticated or not USER role

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
                throw new Error('Profil pelanggan tidak ditemukan');
            }

            currentProfile = profile;
            console.log('Customer profile loaded:', profile);

            populateViewMode(profile);
            populateEditMode(profile);

        } catch (error) {
            console.error('Error loading profile:', error);
            customerName.textContent = 'Gagal Memuat';
            customerEmail.textContent = 'Silakan coba lagi';
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

        alert('Mengunggah foto...'); // Simple loading notification

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload file to Supabase Storage
            let { error: uploadError } = await supabase.storage
                .from('avatars') // Ensure this bucket name is correct
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true // Overwrite existing file
                });
            if (uploadError) throw uploadError;

            // 2. Get the public URL for the uploaded file
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            if (!data.publicUrl) throw new Error("Could not get public URL.");
            
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

    // --- Populate view mode with data ---
    function populateViewMode(data) {
        customerName.textContent = data.full_name || 'Nama Pelanggan';
        customerEmail.textContent = currentUser.email || 'email@example.com';
        
        const photoUrl = data.photo_url;
        if (photoUrl && photoUrl.startsWith('http')) {
            profileAvatar.style.backgroundImage = `url("${photoUrl}")`;
            profileAvatar.innerHTML = '';
        } else {
            const initials = (data.full_name || 'P').charAt(0).toUpperCase();
            profileAvatar.style.backgroundImage = `none`;
            profileAvatar.style.backgroundColor = '#6a5acd';
            profileAvatar.innerHTML = `<span class="text-white text-4xl font-bold">${initials}</span>`;
        }
    }

    // --- Populate edit form with data ---
    function populateEditMode(data) {
        editNama.value = data.full_name || '';
        editUser.value = currentUser.email || '';
        editPassword.value = ''; // Always clear password
        editWhatsapp.value = data.whatsapp_number || '';
    }


    // --- Save changes ---
    async function saveChanges() {
        if (!currentProfile) {
            alert('Error: Data profil tidak tersedia.');
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
            // Update profile data in Supabase
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: newNama,
                    whatsapp_number: newWhatsapp
                })
                .eq('id', currentUser.id);

            if (updateError) {
                throw new Error(`Gagal memperbarui profil: ${updateError.message}`);
            }

            // Update password if provided
            if (newPassword) {
                const { error: passwordError } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (passwordError) {
                    throw new Error(`Gagal memperbarui password: ${passwordError.message}`);
                }
            }

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

    // --- Check GenieACS Enabled ---
    async function checkGenieACSEnabled() {
        try {
            const { data, error } = await supabase
                .from('genieacs_settings')
                .select('setting_value')
                .eq('setting_key', 'genieacs_enabled')
                .single();

            if (error) throw error;

            const gantiWifiCard = document.getElementById('ganti-wifi-card');
            if (data && data.setting_value === 'true' && gantiWifiCard) {
                gantiWifiCard.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error checking GenieACS status:', error);
        }
    }

    // --- Event Listeners ---
    editInfoCard.addEventListener('click', () => toggleMode(true));
    
    // Ganti WiFi menu
    document.getElementById('ganti-wifi-card')?.addEventListener('click', () => {
        window.location.href = 'ganti-wifi.html';
    });
    
    // Back button event listener
    editBackBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
            populateEditMode(currentProfile); // Reset form data
            toggleMode(false);
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin membatalkan perubahan?')) {
            populateEditMode(currentProfile); // Reset form data
            toggleMode(false);
        }
    });
    
    saveBtn.addEventListener('click', saveChanges);
    
    // Logout functionality
    logoutBtn.addEventListener('click', async () => {
        if (confirm('Yakin ingin logout?')) {
            try {
                await supabase.auth.signOut();
                sessionStorage.clear();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                // Force logout even if there's an error
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        }
    });

    // Photo upload event listeners
    const avatarContainer = document.getElementById('avatarContainer');
    const avatarUploadInput = document.getElementById('avatarUpload');
    if (avatarContainer && avatarUploadInput) {
        avatarContainer.addEventListener('click', () => {
            avatarUploadInput.click();
        });
        avatarUploadInput.addEventListener('change', handlePhotoUpload);
    }

    // Initial load
    loadUserProfile();
    checkGenieACSEnabled();
});
