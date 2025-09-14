// pelanggan_profile.js (Versi Perbaikan Total)
document.addEventListener('DOMContentLoaded', function() {
    // Check session
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const userLevel = sessionStorage.getItem('userLevel');
    const userIdpl = sessionStorage.getItem('userIdpl');

    if (!loggedInUser || userLevel !== 'USER' || !userIdpl) {
        alert('Akses tidak valid. Silakan login sebagai pelanggan.');
        window.location.href = 'index.html';
        return;
    }

    // Global variable to hold user data
    let currentUserData = null;

    // DOM Elements
    const profileView = document.getElementById('profile-view');
    const editView = document.getElementById('edit-view');

    // View Mode Elements
    const viewAvatar = document.getElementById('view-avatar');
    const viewNama = document.getElementById('view-nama');
    const viewUser = document.getElementById('view-user');
    const viewWhatsapp = document.getElementById('view-whatsapp');
    const editBtn = document.getElementById('edit-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Edit Mode Elements
    const backBtn = document.getElementById('back-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const editNama = document.getElementById('edit-nama');
    const editUser = document.getElementById('edit-user');
    const editPassword = document.getElementById('edit-password');
    const editWhatsapp = document.getElementById('edit-whatsapp');

    // Toggle between view and edit mode
    function toggleMode(showEdit) {
        if (showEdit) {
            profileView.classList.add('hidden');
            editView.classList.remove('hidden');
        } else {
            profileView.classList.remove('hidden');
            editView.classList.add('hidden');
        }
    }

    // Fetch and display profile data
    async function loadAndDisplayProfile() {
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getPelanggan`);
            if (!response.ok) throw new Error('Gagal mengambil data dari server.');
            
            const allUsers = await response.json();
            if (!Array.isArray(allUsers)) throw new Error('Format data tidak valid.');

            currentUserData = allUsers.find(user => user.IDPL === userIdpl);
            if (!currentUserData) throw new Error('Profil pelanggan tidak ditemukan.');

            // Populate view mode
            populateViewMode(currentUserData);
            // Populate edit form
            populateEditMode(currentUserData);

        } catch (error) {
            console.error('Error loading profile:', error);
            alert(error.message);
            viewNama.textContent = 'Gagal Memuat';
            viewUser.textContent = 'Silakan coba lagi';
        }
    }

    // Populate view mode with data
    function populateViewMode(data) {
        // Replace skeleton with actual content
        viewNama.className = "text-[#110e1b] text-[22px] font-bold leading-tight tracking-[-0.015em] text-center";
        viewNama.textContent = data.NAMA || 'Nama tidak tersedia';
        
        viewUser.className = "text-[#625095] text-base font-normal leading-normal text-center";
        viewUser.textContent = data.USER || 'Username tidak tersedia';
        
        viewWhatsapp.className = "text-[#625095] text-base font-normal leading-normal text-center";
        viewWhatsapp.textContent = data.WHATSAPP || 'No. WhatsApp tidak tersedia';
        
        // Replace avatar skeleton
        viewAvatar.className = "bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32";
        const photoUrl = data.FOTO;
        if (photoUrl && photoUrl.startsWith('http')) {
            viewAvatar.style.backgroundImage = `url("${photoUrl}")`;
        } else {
            const initials = (data.NAMA || 'P').charAt(0).toUpperCase();
            viewAvatar.style.backgroundImage = `url("https://via.placeholder.com/128/683fe4/ffffff?text=${initials}")`;
        }
        
        // Replace button skeletons with actual buttons
        const editBtn = document.getElementById('edit-btn');
        editBtn.className = "flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#eae8f3] text-[#110e1b] text-sm font-bold leading-normal tracking-[0.015em] w-full max-w-[480px]";
        editBtn.innerHTML = '<span class="truncate">Edit Profile</span>';
        
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.className = "flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#683fe4] text-[#f9f8fc] text-sm font-bold leading-normal tracking-[0.015em]";
        logoutBtn.innerHTML = '<span class="truncate">Logout</span>';
    }

    // Populate edit form with data
    function populateEditMode(data) {
        editNama.value = data.NAMA || '';
        editUser.value = data.USER || '';
        editPassword.value = ''; // Keep password empty for security
        editWhatsapp.value = data.WHATSAPP || '';
    }

    // Save changes
    async function saveChanges() {
        if (!currentUserData || !currentUserData.rowNumber) {
            alert('Error: Data pengguna tidak lengkap untuk disimpan.');
            return;
        }

        const newNama = editNama.value.trim();
        const newUser = editUser.value.trim();
        const newPassword = editPassword.value.trim();
        const newWhatsapp = editWhatsapp.value.trim();

        if (!newNama || !newUser || !newWhatsapp) {
            alert('Nama, Username, dan Nomor WhatsApp tidak boleh kosong.');
            return;
        }

        saveBtn.textContent = 'MENYIMPAN...';
        saveBtn.disabled = true;

        try {
            const updateData = {
                nama: newNama,
                user: newUser,
                whatsapp: newWhatsapp
            };

            // Only include password in payload if it was changed
            if (newPassword) {
                updateData.password = newPassword;
            }

            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'updatePelanggan',
                    rowNumber: currentUserData.rowNumber,
                    data: updateData
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Update sessionStorage if username was changed
            if (newUser !== loggedInUser) {
                sessionStorage.setItem('loggedInUser', newUser);
            }

            alert('Profil berhasil diperbarui!');
            await loadAndDisplayProfile(); // Reload data
            toggleMode(false); // Switch back to view mode

        } catch (error) {
            console.error('Error saving profile:', error);
            alert(`Gagal menyimpan: ${error.message}`);
        } finally {
            saveBtn.textContent = 'SIMPAN';
            saveBtn.disabled = false;
        }
    }

    // Event Listeners
    editBtn.addEventListener('click', () => toggleMode(true));
    backBtn.addEventListener('click', () => toggleMode(false));
    cancelBtn.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin membatalkan perubahan?')) {
            // Reset form to original values
            if (currentUserData) {
                populateEditMode(currentUserData);
            }
            toggleMode(false);
        }
    });
    saveBtn.addEventListener('click', saveChanges);
    logoutBtn.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    });

    // Initial load
    loadAndDisplayProfile();
});