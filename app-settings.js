import { supabase } from './supabase-client.js';

// Extended App Settings Module with Logo, WhatsApp, PWA settings
export default class AppSettings {
    constructor() {
        this.uploadedFiles = {
            logo: null,
            favicon: null,
            icon192: null,
            icon512: null,
            qris: null
        };
        this.init();
    }

    init() {
        this.initializeEventListeners();
        this.loadCurrentSettings();
    }

    initializeEventListeners() {
        // Navigate to settings view
        const appSettingsCard = document.getElementById('app-settings-card');
        if (appSettingsCard) {
            console.log('[AppSettings] Event listener attached to app-settings-card');
            appSettingsCard.addEventListener('click', () => {
                console.log('[AppSettings] Card clicked! Showing settings view...');
                this.showSettingsView();
            });
        }

        // Back button
        document.getElementById('settings-back-btn')?.addEventListener('click', () => {
            this.hideSettingsView();
        });

        // Cancel button
        document.getElementById('settings-cancel-btn')?.addEventListener('click', () => {
            this.hideSettingsView();
        });

        // Save button
        document.getElementById('settings-save-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Logo upload
        document.getElementById('logo-upload')?.addEventListener('change', (e) => {
            this.handleImageUpload(e, 'logo', 'logo-preview');
        });

        // Favicon upload
        document.getElementById('favicon-upload')?.addEventListener('change', (e) => {
            this.handleImageUpload(e, 'favicon', 'favicon-preview');
        });

        // Icon 192 upload
        document.getElementById('icon-192-upload')?.addEventListener('change', (e) => {
            this.handleImageUpload(e, 'icon192', 'icon-192-preview');
        });

        // Icon 512 upload
        document.getElementById('icon-512-upload')?.addEventListener('change', (e) => {
            this.handleImageUpload(e, 'icon512', 'icon-512-preview');
        });

        // QRIS upload
        document.getElementById('qris-upload')?.addEventListener('change', (e) => {
            this.handleImageUpload(e, 'qris', 'qris-preview');
        });

        // Color pickers sync with text inputs
        document.getElementById('theme-color-input')?.addEventListener('input', (e) => {
            document.getElementById('theme-color-text').value = e.target.value;
        });

        document.getElementById('theme-color-text')?.addEventListener('input', (e) => {
            document.getElementById('theme-color-input').value = e.target.value;
        });

        document.getElementById('bg-color-input')?.addEventListener('input', (e) => {
            document.getElementById('bg-color-text').value = e.target.value;
        });

        document.getElementById('bg-color-text')?.addEventListener('input', (e) => {
            document.getElementById('bg-color-input').value = e.target.value;
        });
    }

    showSettingsView() {
        console.log('[AppSettings] showSettingsView() called');
        const profileView = document.getElementById('profile-view');
        const editView = document.getElementById('edit-view');
        const settingsView = document.getElementById('app-settings-view');
        
        console.log('[AppSettings] Elements found:', { profileView, editView, settingsView });
        
        profileView?.classList.add('hidden');
        editView?.classList.add('hidden');
        settingsView?.classList.remove('hidden');
        
        console.log('[AppSettings] View switched to app-settings-view');
    }

    hideSettingsView() {
        console.log('[AppSettings] hideSettingsView() called');
        document.getElementById('app-settings-view')?.classList.add('hidden');
        document.getElementById('profile-view')?.classList.remove('hidden');
        console.log('[AppSettings] View switched back to profile-view');
    }

    async loadCurrentSettings() {
        try {
            // Try to get from Supabase
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .single();

            if (data) {
                this.populateForm(data);
                // Also save to localStorage
                this.saveLocalSettings(data);
            } else {
                // Try localStorage fallback
                const localSettings = this.getLocalSettings();
                if (localSettings) {
                    this.populateForm(localSettings);
                } else {
                    // Load defaults
                    this.populateForm(this.getDefaultSettings());
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            // Use localStorage fallback
            const localSettings = this.getLocalSettings();
            if (localSettings) {
                this.populateForm(localSettings);
            } else {
                this.populateForm(this.getDefaultSettings());
            }
        }
    }

    getDefaultSettings() {
        return {
            app_name: 'Selinggonet',
            app_short_name: 'Selinggonet',
            app_description: 'Sistem manajemen pelanggan ISP',
            app_tagline: 'Kelola pelanggan dengan mudah',
            logo_url: 'assets/sn-blue.png',
            favicon_url: 'assets/logo_192x192.png',
            icon_192_url: 'assets/logo_192x192.png',
            icon_512_url: 'assets/logo_512x512.png',
            whatsapp_number: '6281914170701',
            support_email: 'support@selinggonet.com',
            office_address: '',
            offline_payment_name: 'Bapak Karsadi dan Ibu Sopiyah',
            offline_payment_address: 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih',
            qris_image_url: 'assets/qris.jpeg',
            show_qris: true,
            theme_color: '#6a5acd',
            background_color: '#f8f9fe'
        };
    }

    populateForm(settings) {
        // App Info
        document.getElementById('app-name-input').value = settings.app_name || '';
        document.getElementById('app-short-name-input').value = settings.app_short_name || '';
        document.getElementById('app-description-input').value = settings.app_description || '';
        document.getElementById('app-tagline-input').value = settings.app_tagline || '';

        // Images
        document.getElementById('logo-preview').src = settings.logo_url || 'assets/logo_192x192.png';
        document.getElementById('favicon-preview').src = settings.favicon_url || 'assets/logo_192x192.png';
        document.getElementById('icon-192-preview').src = settings.icon_192_url || 'assets/logo_192x192.png';
        document.getElementById('icon-512-preview').src = settings.icon_512_url || 'assets/logo_512x512.png';

        // Contact
        document.getElementById('whatsapp-input').value = settings.whatsapp_number || '';
        document.getElementById('email-input').value = settings.support_email || '';
        document.getElementById('address-input').value = settings.office_address || '';

        // Offline Payment
        document.getElementById('offline-name-input').value = settings.offline_payment_name || '';
        document.getElementById('offline-address-input').value = settings.offline_payment_address || '';

        // QRIS
        document.getElementById('qris-preview').src = settings.qris_image_url || 'assets/qris.jpeg';
        document.getElementById('show-qris-input').checked = settings.show_qris !== false;

        // Theme
        document.getElementById('theme-color-input').value = settings.theme_color || '#6a5acd';
        document.getElementById('theme-color-text').value = settings.theme_color || '#6a5acd';
        document.getElementById('bg-color-input').value = settings.background_color || '#f8f9fe';
        document.getElementById('bg-color-text').value = settings.background_color || '#f8f9fe';
    }

    handleImageUpload(event, type, previewId) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        const validTypes = ['image/png', 'image/jpeg', 'image/x-icon'];
        if (!validTypes.includes(file.type)) {
            alert('Format file tidak valid. Gunakan PNG, JPG, atau ICO');
            return;
        }

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran file terlalu besar. Maksimal 2MB');
            return;
        }

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById(previewId).src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Store file for upload
        this.uploadedFiles[type] = file;
    }

    async saveSettings() {
        const appName = document.getElementById('app-name-input').value.trim();
        const whatsapp = document.getElementById('whatsapp-input').value.trim();
        
        if (!appName) {
            alert('Nama aplikasi tidak boleh kosong');
            return;
        }

        // Show loading
        const saveBtn = document.getElementById('settings-save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'MENYIMPAN...';
        saveBtn.disabled = true;

        try {
            // Upload all images if changed
            const logoUrl = this.uploadedFiles.logo 
                ? await this.uploadImage(this.uploadedFiles.logo, 'logos')
                : document.getElementById('logo-preview').src;

            const faviconUrl = this.uploadedFiles.favicon 
                ? await this.uploadImage(this.uploadedFiles.favicon, 'favicons')
                : document.getElementById('favicon-preview').src;

            const icon192Url = this.uploadedFiles.icon192 
                ? await this.uploadImage(this.uploadedFiles.icon192, 'icons')
                : document.getElementById('icon-192-preview').src;

            const icon512Url = this.uploadedFiles.icon512 
                ? await this.uploadImage(this.uploadedFiles.icon512, 'icons')
                : document.getElementById('icon-512-preview').src;

            const qrisUrl = this.uploadedFiles.qris 
                ? await this.uploadImage(this.uploadedFiles.qris, 'qris')
                : document.getElementById('qris-preview').src;

            // Fetch existing row to get ID (to prevent creating new rows)
            const { data: existingData } = await supabase
                .from('app_settings')
                .select('id')
                .limit(1)
                .maybeSingle();

            // Collect all settings
            const settings = {
                app_name: appName,
                app_short_name: document.getElementById('app-short-name-input').value.trim(),
                app_description: document.getElementById('app-description-input').value.trim(),
                app_tagline: document.getElementById('app-tagline-input').value.trim(),
                logo_url: logoUrl,
                favicon_url: faviconUrl,
                icon_192_url: icon192Url,
                icon_512_url: icon512Url,
                whatsapp_number: whatsapp,
                support_email: document.getElementById('email-input').value.trim(),
                office_address: document.getElementById('address-input').value.trim(),
                offline_payment_name: document.getElementById('offline-name-input').value.trim(),
                offline_payment_address: document.getElementById('offline-address-input').value.trim(),
                qris_image_url: qrisUrl,
                show_qris: document.getElementById('show-qris-input').checked,
                theme_color: document.getElementById('theme-color-text').value.trim(),
                background_color: document.getElementById('bg-color-text').value.trim(),
                updated_at: new Date().toISOString()
            };

            // Include existing ID to force UPDATE instead of INSERT
            if (existingData?.id) {
                settings.id = existingData.id;
            }

            // Save to Supabase
            const { error } = await supabase
                .from('app_settings')
                .upsert(settings, { onConflict: 'id' });

            if (error) throw error;

            // Save to localStorage as fallback
            this.saveLocalSettings(settings);

            // Apply settings immediately
            this.applySettings(settings);

            // Update manifest.json
            await this.updateManifest(settings);

            alert('✅ Pengaturan berhasil disimpan!\n\nRefresh browser (F5) untuk melihat semua perubahan.');
            this.hideSettingsView();

            // Reset uploaded files
            this.uploadedFiles = { logo: null, favicon: null, icon192: null, icon512: null, qris: null };

        } catch (error) {
            console.error('Error saving settings:', error);
            alert('❌ Gagal menyimpan pengaturan: ' + error.message);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    async uploadImage(file, folder) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}-${Date.now()}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            // Upload to Supabase Storage (using 'avatars' bucket)
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Gagal upload gambar: ' + error.message);
        }
    }

    async updateManifest(settings) {
        try {
            // Update manifest dinamis via localStorage
            // Service worker akan membaca ini
            const manifestData = {
                name: settings.app_name,
                short_name: settings.app_short_name,
                description: settings.app_description,
                theme_color: settings.theme_color,
                background_color: settings.background_color,
                icons: [
                    {
                        src: settings.icon_192_url,
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any"
                    },
                    {
                        src: settings.icon_512_url,
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            };

            localStorage.setItem('pwa_manifest', JSON.stringify(manifestData));
        } catch (error) {
            console.error('Error updating manifest:', error);
        }
    }

    applySettings(settings) {
        // Update title
        document.title = settings.app_name || 'Selinggonet';

        // Update favicon
        this.updateFavicon(settings.favicon_url);

        // Update theme color
        this.updateThemeColor(settings.theme_color);
    }

    updateFavicon(url) {
        // Update all favicon links
        const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
        faviconLinks.forEach(link => {
            link.href = url;
        });

        // If no favicon link exists, create one
        if (faviconLinks.length === 0) {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            link.href = url;
            document.head.appendChild(link);
        }
    }

    updateThemeColor(color) {
        // Update theme-color meta tag
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', color);
        } else {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.setAttribute('name', 'theme-color');
            themeColorMeta.setAttribute('content', color);
            document.head.appendChild(themeColorMeta);
        }
    }

    saveLocalSettings(settings) {
        localStorage.setItem('app_settings', JSON.stringify(settings));
    }

    getLocalSettings() {
        const settings = localStorage.getItem('app_settings');
        return settings ? JSON.parse(settings) : null;
    }
}

// Initialize App Settings
// Wrap in DOMContentLoaded to ensure DOM is ready (especially important for Netlify)
document.addEventListener('DOMContentLoaded', () => {
    const appSettingsCard = document.getElementById('app-settings-card');
    console.log('[AppSettings] Initializing...', { appSettingsCard });
    
    if (appSettingsCard) {
        console.log('[AppSettings] Creating new AppSettings instance');
        new AppSettings();
    } else {
        console.log('[AppSettings] app-settings-card not found, skipping initialization');
    }
});
