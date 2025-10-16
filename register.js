// register.js - Admin Registration (No Email Confirmation)
import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    // Check if a user is already logged in and redirect them
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = 'dashboard.html';
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
        successMessage.textContent = '';
        successMessage.classList.add('hidden');

        const fullName = document.getElementById('full-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validation
        if (!fullName || !email || !password) {
            errorMessage.textContent = 'Semua field harus diisi!';
            errorMessage.classList.remove('hidden');
            return;
        }

        if (password.length < 6) {
            errorMessage.textContent = 'Password minimal 6 karakter!';
            errorMessage.classList.remove('hidden');
            return;
        }

        setButtonLoading(submitButton, true);

        try {
            // Step 1: Sign up user with Supabase Auth
            // Note: emailRedirectTo is not needed if email confirmation is disabled in Supabase settings
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    // This will only work if email confirmation is disabled in Supabase dashboard
                    // Settings > Authentication > Email Auth > Confirm email = OFF
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (authError) {
                throw new Error(authError.message);
            }

            if (!authData.user) {
                throw new Error('Gagal membuat user. Silakan coba lagi.');
            }

            console.log('User created:', authData.user.id);

            // Step 2: Create profile with role ADMIN
            // Note: If using RLS (Row Level Security), you might need to sign in first
            // But since we're creating ADMIN, we can use service role or disable RLS for insert
            
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id, // UUID from Auth
                    full_name: fullName,
                    role: 'ADMIN',
                    // Set default values for other fields
                    idpl: null, // ADMIN doesn't need IDPL
                    address: null,
                    gender: null,
                    whatsapp_number: null,
                    status: 'AKTIF',
                    photo_url: 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-2.png',
                    installation_date: null,
                    device_type: null,
                    ip_static_pppoe: null,
                    package_id: null,
                    latitude: null,
                    longitude: null
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Try to clean up: delete the auth user if profile creation fails
                // Note: This might not work due to permissions, but worth a try
                throw new Error(`Gagal membuat profile: ${profileError.message}`);
            }

            console.log('Profile created successfully');

            // Step 3: Show success message and redirect
            successMessage.textContent = 'Akun admin berhasil dibuat! Mengalihkan ke dashboard...';
            successMessage.classList.remove('hidden');

            // Wait 2 seconds then redirect to login or dashboard
            setTimeout(() => {
                // If email confirmation is disabled, user is already logged in
                // Check session and redirect accordingly
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                        window.location.href = 'dashboard.html';
                    } else {
                        // If not logged in automatically, redirect to login
                        window.location.href = 'index.html';
                    }
                });
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMsg = 'Gagal mendaftar. Silakan coba lagi.';
            
            // Handle specific errors
            if (error.message.includes('already registered') || error.message.includes('already exists')) {
                errorMsg = 'Email sudah terdaftar. Gunakan email lain atau login.';
            } else if (error.message.includes('Password')) {
                errorMsg = error.message;
            } else if (error.message.includes('email')) {
                errorMsg = 'Format email tidak valid.';
            } else if (error.message.includes('profile')) {
                errorMsg = 'User berhasil dibuat tapi gagal membuat profile. Hubungi administrator.';
            }
            
            errorMessage.textContent = errorMsg;
            errorMessage.classList.remove('hidden');
        } finally {
            setButtonLoading(submitButton, false);
        }
    });

    function setButtonLoading(button, loading) {
        const span = button.querySelector('span');
        if (!span) return;

        if (loading) {
            button.disabled = true;
            span.innerHTML = 'Memproses...';
            button.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            button.disabled = false;
            span.innerHTML = `
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
                Daftar
            `;
            button.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
});
