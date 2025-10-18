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
        // Back button - navigate to profile.html
        document.getElementById('settings-back-btn')?.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });

        // Cancel button - navigate to profile.html
        document.getElementById('settings-cancel-btn')?.addEventListener('click', () => {
            window.location.href = 'profile.html';
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

        // WhatsApp Settings - Reset to Default
        document.getElementById('reset-whatsapp-templates-btn')?.addEventListener('click', () => {
            this.resetWhatsAppTemplates();
        });

        // Toggle Fonnte Token visibility
        document.getElementById('toggle-fonnte-token')?.addEventListener('click', () => {
            const input = document.getElementById('fonnte-token-input');
            input.type = input.type === 'password' ? 'text' : 'password';
        });
    }

    // View management methods removed - now using separate page

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

        // Load WhatsApp settings separately
        await this.loadWhatsAppSettings();
    }

    async loadWhatsAppSettings() {
        try {
            const { data, error } = await supabase
                .from('whatsapp_settings')
                .select('*');

            if (error) throw error;

            if (data && data.length > 0) {
                data.forEach(setting => {
                    if (setting.setting_key === 'auto_notification_enabled') {
                        const isEnabled = setting.setting_value === 'true';
                        document.getElementById('auto-notification-toggle').checked = isEnabled;
                    } else if (setting.setting_key === 'fonnte_token') {
                        document.getElementById('fonnte-token-input').value = setting.setting_value || '';
                    } else if (setting.setting_key === 'app_url') {
                        document.getElementById('app-url-input').value = setting.setting_value || '';
                    } else if (setting.setting_key === 'template_payment_full') {
                        document.getElementById('template-payment-full').value = setting.setting_value || '';
                    } else if (setting.setting_key === 'template_payment_installment') {
                        document.getElementById('template-payment-installment').value = setting.setting_value || '';
                    } else if (setting.setting_key === 'template_custom_message') {
                        document.getElementById('template-custom-message').value = setting.setting_value || '';
                    }
                });
            }
        } catch (error) {
            console.error('Error loading WhatsApp settings:', error);
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

            // Save WhatsApp settings
            await this.saveWhatsAppSettings();

            alert('✅ Pengaturan berhasil disimpan!\n\nRefresh browser (F5) untuk melihat semua perubahan.');
            window.location.href = 'profile.html';

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

    async saveWhatsAppSettings() {
        try {
            const whatsappSettings = [
                {
                    setting_key: 'auto_notification_enabled',
                    setting_value: document.getElementById('auto-notification-toggle').checked ? 'true' : 'false'
                },
                {
                    setting_key: 'fonnte_token',
                    setting_value: document.getElementById('fonnte-token-input').value.trim()
                },
                {
                    setting_key: 'app_url',
                    setting_value: document.getElementById('app-url-input').value.trim()
                },
                {
                    setting_key: 'template_payment_full',
                    setting_value: document.getElementById('template-payment-full').value
                },
                {
                    setting_key: 'template_payment_installment',
                    setting_value: document.getElementById('template-payment-installment').value
                },
                {
                    setting_key: 'template_custom_message',
                    setting_value: document.getElementById('template-custom-message').value
                }
            ];

            // Update each setting
            for (const setting of whatsappSettings) {
                const { error } = await supabase
                    .from('whatsapp_settings')
                    .update({ 
                        setting_value: setting.setting_value,
                        updated_at: new Date().toISOString()
                    })
                    .eq('setting_key', setting.setting_key);

                if (error) {
                    console.error(`Error updating ${setting.setting_key}:`, error);
                }
            }

            console.log('✅ WhatsApp settings saved successfully');
        } catch (error) {
            console.error('Error saving WhatsApp settings:', error);
            throw error;
        }
    }

    async resetWhatsAppTemplates() {
        if (!confirm('Reset semua template WhatsApp ke default?\n\nPerubahan tidak dapat dibatalkan.')) {
            return;
        }

        try {
            const defaultTemplates = {
                template_payment_full: `Konfirmasi Pembayaran LUNAS

Hai Bapak/Ibu {nama_pelanggan},
ID Pelanggan: {idpl}

✅ *TAGIHAN TELAH LUNAS!*

*Detail Pembayaran:*
• Periode: *{periode}*
• Total Tagihan: *{total_tagihan}*
• Metode: {metode_pembayaran}
• Status: *LUNAS*

Terima kasih atas pembayaran Anda.

Anda dapat melihat riwayat pembayaran dan status tagihan terbaru melalui dasbor pelanggan Anda.

Login di:
*{app_url}*
*- Email:* {email_pelanggan}
*- Password:* password

_____________________________
*Pesan otomatis dari Selinggonet*`,
                template_payment_installment: `Konfirmasi Pembayaran Cicilan

Hai Bapak/Ibu {nama_pelanggan},
ID Pelanggan: {idpl}

✅ *Pembayaran cicilan diterima!*

*Detail Pembayaran:*
• Periode: *{periode}*
• Jumlah Dibayar: *{jumlah_dibayar}*
• Metode: {metode_pembayaran}
• Sisa Tagihan: *{sisa_tagihan}*

Sisa tagihan dapat Anda lunasi sebelum jatuh tempo. Terima kasih.

Anda dapat melihat riwayat pembayaran dan status tagihan terbaru melalui dasbor pelanggan Anda.

Login di:
*{app_url}*
*- Email:* {email_pelanggan}
*- Password:* password

_____________________________
*Pesan otomatis dari Selinggonet*`,
                template_custom_message: `Pesan dari Admin

Hai Bapak/Ibu {nama_pelanggan},
ID Pelanggan: {idpl}

{pesan_custom}

_____________________________
*Pesan dari Selinggonet*`
            };

            // Update templates in form
            document.getElementById('template-payment-full').value = defaultTemplates.template_payment_full;
            document.getElementById('template-payment-installment').value = defaultTemplates.template_payment_installment;
            document.getElementById('template-custom-message').value = defaultTemplates.template_custom_message;

            alert('✅ Template berhasil direset ke default!\n\nJangan lupa klik SIMPAN untuk menyimpan perubahan.');
        } catch (error) {
            console.error('Error resetting templates:', error);
            alert('❌ Gagal reset template: ' + error.message);
        }
    }
}

// Initialize App Settings on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[AppSettings] Initializing on app-settings.html');
    new AppSettings();
});
