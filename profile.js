// Profile Page JavaScript (Versi Perbaikan)
document.addEventListener('DOMContentLoaded', function() {
    // Fungsi checkSession() dan initLogout() sudah dijalankan dari auth.js
    
    // Memulai proses untuk memuat data profil
    loadUserProfile();
});

async function loadUserProfile() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const userLevel = sessionStorage.getItem('userLevel');

    // Pastikan yang mengakses adalah ADMIN
    if (!loggedInUser || userLevel !== 'ADMIN') {
        alert('Akses tidak diizinkan.');
        window.location.href = 'index.html';
        return;
    }
    
    // Show skeleton loading
    showSkeletonLoading();

    try {
        // Panggil API untuk mendapatkan semua data pelanggan (termasuk admin)
        const response = await fetch(`${window.AppConfig.API_BASE_URL}?action=getPelanggan`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const allUsers = await response.json();
        if (!Array.isArray(allUsers)) {
            throw new Error('Format data tidak valid dari server.');
        }

        // Cari data admin yang cocok dengan username yang sedang login
        const adminData = allUsers.find(user => user.USER === loggedInUser && user.LEVEL === 'ADMIN');

        if (adminData) {
            updateProfileDisplay(adminData);
        } else {
            // Jika data admin tidak ditemukan, tampilkan info default/error
            console.error('Data admin tidak ditemukan di spreadsheet.');
            updateProfileDisplay({
                NAMA: 'Admin Tidak Ditemukan',
                USER: loggedInUser,
                FOTO: ''
            });
        }

    } catch (error) {
        console.error('Gagal memuat profil admin:', error);
        // Tampilkan info default jika terjadi error
        updateProfileDisplay({
            NAMA: 'Gagal Memuat',
            USER: loggedInUser,
            FOTO: ''
        });
    } finally {
        hideSkeletonLoading();
    }
}

function updateProfileDisplay(adminData) {
    const adminNameEl = document.getElementById('adminName');
    const adminEmailEl = document.getElementById('adminEmail');
    const profileAvatarEl = document.getElementById('profileAvatar');

    if (!adminData) return;

    // Update Nama
    if (adminNameEl) {
        adminNameEl.textContent = adminData.NAMA || 'Nama Admin';
    }

    // Update User (sebagai pengganti email)
    if (adminEmailEl) {
        adminEmailEl.textContent = adminData.USER || 'username';
    }

    // Update Foto Profil
    if (profileAvatarEl) {
        const photoUrl = adminData.FOTO;

        if (photoUrl && photoUrl.startsWith('http')) {
            // Jika ada URL foto yang valid, gunakan itu
            profileAvatarEl.style.backgroundImage = `url("${photoUrl}")`;
            profileAvatarEl.innerHTML = ''; // Hapus inisial jika ada
            profileAvatarEl.style.backgroundColor = 'transparent';
        } else {
            // Jika tidak ada foto, buat avatar dari inisial nama
            const initials = (adminData.NAMA || 'A')
                .split(' ')
                .map(name => name.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
            
            profileAvatarEl.style.backgroundImage = 'none';
            profileAvatarEl.style.backgroundColor = '#501ee6'; // Warna background avatar
            profileAvatarEl.style.display = 'flex';
            profileAvatarEl.style.alignItems = 'center';
            profileAvatarEl.style.justifyContent = 'center';
            profileAvatarEl.innerHTML = `<span style="color: white; font-size: 2.5rem; font-weight: bold;">${initials}</span>`;
        }
    }
}

// ===============================================
// Skeleton Loading Functions
// ===============================================
function showSkeletonLoading() {
    const adminNameEl = document.getElementById('adminName');
    const adminEmailEl = document.getElementById('adminEmail');
    const profileAvatarEl = document.getElementById('profileAvatar');

    // Show skeleton for avatar
    if (profileAvatarEl) {
        profileAvatarEl.style.backgroundImage = 'none';
        profileAvatarEl.style.backgroundColor = '#f0f0f0';
        profileAvatarEl.innerHTML = '';
        profileAvatarEl.classList.add('skeleton-avatar');
    }

    // Show skeleton for name
    if (adminNameEl) {
        adminNameEl.innerHTML = '<div class="skeleton-text skeleton-name"></div>';
    }

    // Show skeleton for email/username
    if (adminEmailEl) {
        adminEmailEl.innerHTML = '<div class="skeleton-text skeleton-email"></div>';
    }

    // Add skeleton styles if not exists
    if (!document.getElementById('skeleton-styles')) {
        const style = document.createElement('style');
        style.id = 'skeleton-styles';
        style.textContent = `
            @keyframes skeleton-loading {
                0% {
                    background-position: -200px 0;
                }
                100% {
                    background-position: calc(200px + 100%) 0;
                }
            }
            
            .skeleton-avatar {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%) !important;
                background-size: 200px 100% !important;
                animation: skeleton-loading 1.5s infinite !important;
            }
            
            .skeleton-text {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200px 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
                height: 20px;
                margin: 4px 0;
            }
            
            .skeleton-name {
                width: 150px;
                height: 28px;
                margin: 0 auto;
            }
            
            .skeleton-email {
                width: 120px;
                height: 18px;
                margin: 8px auto 0;
            }
        `;
        document.head.appendChild(style);
    }
}

function hideSkeletonLoading() {
    // Remove skeleton classes and styles
    const profileAvatarEl = document.getElementById('profileAvatar');
    if (profileAvatarEl) {
        profileAvatarEl.classList.remove('skeleton-avatar');
    }

    // Remove skeleton styles
    const skeletonStyles = document.getElementById('skeleton-styles');
    if (skeletonStyles) {
        skeletonStyles.remove();
    }
}