// auth.js (Supabase version)
import { supabase } from './supabase-client.js';

// --- Session Check ---
// Checks for an active session. If none, redirects to login.
// Returns the user object if a session exists.
export async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error getting session:', error.message);
        window.location.href = 'index.html';
        return null;
    }

    if (!session) {
        alert('Anda harus login untuk mengakses halaman ini.');
        window.location.href = 'index.html';
        return null;
    }

    return session.user;
}

// --- Role-specific Access Control ---
// Checks if the logged-in user has the required role.
export async function requireRole(requiredRole) {
    const user = await checkAuth();
    if (!user) return null; // Stop if not authenticated

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            throw new Error('Gagal memverifikasi peran pengguna.');
        }

        if (profile.role !== requiredRole) {
            alert(`Akses ditolak. Halaman ini hanya untuk ${requiredRole}.`);
            // Redirect to a relevant page based on their actual role if needed
            window.location.href = profile.role === 'ADMIN' ? 'dashboard.html' : 'pelanggan_dashboard.html';
            return null;
        }

        return user; // Return user object if authorized
    } catch (error) {
        console.error('Authorization Error:', error.message);
        await supabase.auth.signOut();
        window.location.href = 'index.html';
        return null;
    }
}


// --- Logout Function ---
// Initializes logout functionality for a given button ID.
export function initLogout(buttonId) {
    const logoutBtn = document.getElementById(buttonId);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Yakin ingin logout?')) {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Error logging out:', error.message);
                    alert('Gagal untuk logout. Silakan coba lagi.');
                } else {
                    sessionStorage.clear(); // Clear any remaining session data
                    window.location.href = 'index.html';
                }
            }
        });
    }
}