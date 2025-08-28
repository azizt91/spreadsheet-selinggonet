// theme-manager.js - Dark Mode Theme Management

class ThemeManager {
    constructor() {
        this.storageKey = 'selinggonet-theme';
        this.themes = {
            light: 'light',
            dark: 'dark'
        };
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.createToggleButton();
        this.setupEventListeners();
    }

    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.themes.dark;
        }
        return this.themes.light;
    }

    getStoredTheme() {
        return localStorage.getItem(this.storageKey);
    }

    setStoredTheme(theme) {
        localStorage.setItem(this.storageKey, theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        this.updateToggleButton();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === this.themes.light ? this.themes.dark : this.themes.light;
        this.applyTheme(newTheme);
        
        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: newTheme } 
        }));
    }

    createToggleButton() {
        // Check if toggle already exists
        if (document.getElementById('theme-toggle')) {
            return;
        }

        const toggle = document.createElement('button');
        toggle.id = 'theme-toggle';
        toggle.className = 'theme-toggle';
        toggle.innerHTML = this.getToggleContent();
        toggle.setAttribute('aria-label', 'Toggle dark mode');
        toggle.setAttribute('title', 'Switch theme');

        return toggle;
    }

    getToggleContent() {
        const isDark = this.currentTheme === this.themes.dark;
        const icon = isDark ? 'fas fa-sun' : 'fas fa-moon';
        const text = isDark ? 'Light' : 'Dark';
        
        return `
            <i class="${icon} theme-icon"></i>
            <span class="theme-toggle-text">${text}</span>
        `;
    }

    updateToggleButton() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.innerHTML = this.getToggleContent();
        }
    }

    insertToggleIntoHeader() {
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            const toggle = this.createToggleButton();
            if (toggle) {
                headerActions.appendChild(toggle);
            }
        } else {
            // Fallback: add to main header
            const header = document.querySelector('.main-content header');
            if (header) {
                const toggle = this.createToggleButton();
                if (toggle) {
                    // Create header actions container if it doesn't exist
                    let actionsContainer = header.querySelector('.header-actions');
                    if (!actionsContainer) {
                        actionsContainer = document.createElement('div');
                        actionsContainer.className = 'header-actions';
                        header.appendChild(actionsContainer);
                    }
                    actionsContainer.appendChild(toggle);
                }
            }
        }
    }

    setupEventListeners() {
        // Listen for theme toggle clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('#theme-toggle')) {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!this.getStoredTheme()) {
                    this.applyTheme(e.matches ? this.themes.dark : this.themes.light);
                }
            });
        }

        // Initialize toggle when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.insertToggleIntoHeader();
            });
        } else {
            this.insertToggleIntoHeader();
        }
    }

    // Method to be called by pages to ensure toggle is present
    ensureToggleExists() {
        if (!document.getElementById('theme-toggle')) {
            this.insertToggleIntoHeader();
        }
    }
}

// Create global theme manager instance
window.themeManager = new ThemeManager();

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}