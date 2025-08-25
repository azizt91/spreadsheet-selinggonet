// PWA Installer - Handle installation and updates
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.init();
    }

    init() {
        // Register Service Worker
        this.registerServiceWorker();
        
        // Handle beforeinstallprompt event
        this.handleInstallPrompt();
        
        // Check if app is already installed
        this.checkInstallStatus();
        
        // Handle app state changes
        this.handleAppStateChanges();
        
        // Add install button if not installed
        this.addInstallButton();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('PWA: Service Worker registered successfully', registration);
                
                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content available, show update notification
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('PWA: Service Worker registration failed', error);
            }
        }
    }

    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log('PWA: Install prompt available');
            event.preventDefault();
            this.deferredPrompt = event;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA: App installed successfully');
            this.isInstalled = true;
            this.hideInstallButton();
            this.showSuccessMessage('Selinggonet berhasil diinstall!');
        });
    }

    checkInstallStatus() {
        // Check if running in standalone mode (installed)
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            this.isInstalled = true;
        }
    }

    handleAppStateChanges() {
        // Handle online/offline status
        window.addEventListener('online', () => {
            this.showOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.showOfflineStatus();
        });
    }

    addInstallButton() {
        // Create install button container
        const installContainer = document.createElement('div');
        installContainer.id = 'pwa-install-container';
        installContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: none;
        `;

        // Create install button
        const installButton = document.createElement('button');
        installButton.id = 'pwa-install-btn';
        installButton.innerHTML = '<i class="fas fa-download"></i> Install App';
        installButton.style.cssText = `
            background-color: #6a5acd;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(106, 90, 205, 0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        installButton.addEventListener('mouseover', () => {
            installButton.style.transform = 'translateY(-2px)';
            installButton.style.boxShadow = '0 6px 20px rgba(106, 90, 205, 0.4)';
        });

        installButton.addEventListener('mouseout', () => {
            installButton.style.transform = 'translateY(0)';
            installButton.style.boxShadow = '0 4px 15px rgba(106, 90, 205, 0.3)';
        });

        installButton.addEventListener('click', () => {
            this.installApp();
        });

        installContainer.appendChild(installButton);
        document.body.appendChild(installContainer);
    }

    showInstallButton() {
        const container = document.getElementById('pwa-install-container');
        if (container && !this.isInstalled) {
            container.style.display = 'block';
        }
    }

    hideInstallButton() {
        const container = document.getElementById('pwa-install-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('PWA: User accepted install prompt');
            } else {
                console.log('PWA: User dismissed install prompt');
            }
            
            this.deferredPrompt = null;
            this.hideInstallButton();
        }
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-sync-alt"></i>
                <span>Update tersedia! Refresh untuk mendapatkan versi terbaru.</span>
                <button onclick="window.location.reload()" style="
                    background: white;
                    color: #28a745;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                ">Refresh</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }

    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    showOnlineStatus() {
        this.showStatusMessage('Koneksi internet tersambung kembali', '#28a745', 'wifi');
    }

    showOfflineStatus() {
        this.showStatusMessage('Mode offline - beberapa fitur mungkin terbatas', '#ffc107', 'wifi-slash');
    }

    showStatusMessage(message, color, icon) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: ${color};
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            z-index: 1001;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PWAInstaller();
});