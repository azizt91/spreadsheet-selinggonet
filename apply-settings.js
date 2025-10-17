// Apply App Settings Module - Extended Version
// Auto-apply settings to ALL pages including login, customer pages, PWA

import { supabase } from './supabase-client.js';

class ApplySettings {
    constructor() {
        this.settings = null;
        this.applySettingsOnLoad();
    }

    async applySettingsOnLoad() {
        try {
            // Get settings
            this.settings = await this.getSettings();
            
            if (this.settings) {
                // Apply to all pages
                this.applyTitle(this.settings.app_name);
                this.applyFavicon(this.settings.favicon_url);
                this.applyThemeColor(this.settings.theme_color);
                this.applyManifest(this.settings);
                
                // Apply to specific pages
                this.applyToLoginPage(this.settings);
                this.applyToCustomerPages(this.settings);
                
                // Export to window for other scripts to access
                window.APP_SETTINGS = this.settings;
            }
        } catch (error) {
            console.error('Error applying settings:', error);
            // Try localStorage fallback
            this.applyLocalSettings();
        }
    }

    async getSettings() {
        // Try localStorage first (faster)
        const localSettings = this.getLocalSettings();
        
        // Always try to get fresh data from Supabase in background
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) {
                console.warn('Supabase fetch warning:', error.message);
            }

            if (data) {
                // Update localStorage cache
                this.saveLocalSettings(data);
                return data;
            }
        } catch (error) {
            console.error('Error fetching from Supabase:', error);
        }

        // Return localStorage if Supabase fails
        return localSettings;
    }

    applyTitle(appName) {
        if (!appName) return;

        const currentPage = this.getCurrentPageName();
        document.title = currentPage ? `${currentPage} - ${appName}` : appName;
    }

    applyFavicon(faviconUrl) {
        if (!faviconUrl) return;

        // Update all favicon links
        const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
        faviconLinks.forEach(link => {
            link.href = faviconUrl;
        });

        // Create if doesn't exist
        if (faviconLinks.length === 0) {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            link.href = faviconUrl;
            document.head.appendChild(link);
        }
    }

    applyThemeColor(themeColor) {
        if (!themeColor) return;

        // Update or create theme-color meta tag
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', themeColor);
        } else {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.setAttribute('name', 'theme-color');
            themeColorMeta.setAttribute('content', themeColor);
            document.head.appendChild(themeColorMeta);
        }
    }

    applyManifest(settings) {
        if (!settings) return;

        // Update manifest link dynamically
        const manifestData = {
            name: settings.app_name,
            short_name: settings.app_short_name,
            description: settings.app_description,
            start_url: "/",
            display: "standalone",
            background_color: settings.background_color,
            theme_color: settings.theme_color,
            orientation: "portrait-primary",
            categories: ["business", "productivity"],
            lang: "id",
            dir: "ltr",
            scope: "/",
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

        // Create blob URL for manifest
        const manifestBlob = new Blob([JSON.stringify(manifestData)], {
            type: 'application/json'
        });
        const manifestURL = URL.createObjectURL(manifestBlob);

        // Update manifest link
        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            manifestLink.href = manifestURL;
        }

        // Store in localStorage for SW
        localStorage.setItem('pwa_manifest', JSON.stringify(manifestData));
    }

    applyToLoginPage(settings) {
        // Check if we're on login page
        if (!window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('index.html')) {
            return;
        }

        // Apply logo to login page
        const logoImg = document.querySelector('img[alt*="logo" i], .logo-img, #app-logo');
        if (logoImg && settings.logo_url) {
            logoImg.src = settings.logo_url;
        }

        // Apply app name
        const appNameEl = document.querySelector('.app-name, #app-name, h1');
        if (appNameEl && settings.app_name) {
            appNameEl.textContent = settings.app_name;
        }

        // Apply tagline
        const taglineEl = document.querySelector('.tagline, .app-tagline, .subtitle');
        if (taglineEl && settings.app_tagline) {
            taglineEl.textContent = settings.app_tagline;
        }
    }

    applyToCustomerPages(settings) {
        // Export WhatsApp number for customer pages
        if (settings.whatsapp_number) {
            window.WHATSAPP_NUMBER = settings.whatsapp_number;
            
            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('settings-loaded', {
                detail: { whatsapp: settings.whatsapp_number }
            }));
        }

        // Update any WhatsApp links on page
        const waLinks = document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]');
        waLinks.forEach(link => {
            if (settings.whatsapp_number) {
                const url = new URL(link.href);
                url.pathname = `/${settings.whatsapp_number}`;
                link.href = url.toString();
            }
        });
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().split('.')[0];
        
        const pageNames = {
            'index': 'Login',
            'login': 'Login',
            'dashboard': 'Dashboard',
            'pelanggan': 'Pelanggan',
            'tagihan': 'Tagihan',
            'lunas': 'Riwayat Lunas',
            'pengeluaran': 'Pengeluaran',
            'profile': 'Profil',
            'paket': 'Paket',
            'pelanggan_dashboard': 'Dashboard',
            'pelanggan_profile': 'Profil',
            'pelanggan_riwayat_lunas': 'Riwayat Pembayaran',
            'pelanggan_info': 'Info Tagihan'
        };

        return pageNames[filename] || '';
    }

    applyLocalSettings() {
        const settings = this.getLocalSettings();
        if (settings) {
            this.settings = settings;
            this.applyTitle(settings.app_name);
            this.applyFavicon(settings.favicon_url);
            this.applyThemeColor(settings.theme_color);
            this.applyToLoginPage(settings);
            this.applyToCustomerPages(settings);
            window.APP_SETTINGS = settings;
        }
    }

    getLocalSettings() {
        const settings = localStorage.getItem('app_settings');
        return settings ? JSON.parse(settings) : null;
    }

    saveLocalSettings(settings) {
        localStorage.setItem('app_settings', JSON.stringify(settings));
    }
}

// Auto-initialize on page load
new ApplySettings();

// Export function to get settings
export function getAppSettings() {
    return window.APP_SETTINGS || JSON.parse(localStorage.getItem('app_settings'));
}

// Export function to get WhatsApp number
export function getWhatsAppNumber() {
    const settings = getAppSettings();
    return settings?.whatsapp_number || '6281914170701'; // fallback
}

// Export function to get offline payment info
export function getOfflinePaymentInfo() {
    const settings = getAppSettings();
    return {
        name: settings?.offline_payment_name || 'Bapak Karsadi dan Ibu Sopiyah',
        address: settings?.offline_payment_address || 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih'
    };
}

// Export function to get QRIS info
export function getQRISInfo() {
    const settings = getAppSettings();
    return {
        imageUrl: settings?.qris_image_url || 'assets/qris.jpeg',
        showQRIS: settings?.show_qris !== false  // Default true if not set
    };
}

// Apply settings on login and register pages
document.addEventListener('DOMContentLoaded', async () => {
    const settings = getAppSettings();
    
    // Check if we're on login page (index.html)
    const loginLogo = document.getElementById('login-logo');
    const loginAppName = document.getElementById('login-app-name');
    
    if (loginLogo && loginAppName) {
        loginLogo.src = settings?.logo_url || 'assets/sn-blue.png';
        loginAppName.textContent = settings?.app_name || 'Selinggonet';
    }
    
    // Check if we're on register page
    const registerLogo = document.getElementById('register-logo');
    const registerAppName = document.getElementById('register-app-name');
    
    if (registerLogo && registerAppName) {
        registerLogo.src = settings?.logo_url || 'assets/sn-blue.png';
        registerAppName.textContent = settings?.app_name || 'Selinggonet';
    }
});
