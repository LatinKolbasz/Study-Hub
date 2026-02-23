/**
 * Theme Manager - Közös téma kezelő rendszer
 * Automatikusan betölti és alkalmazza a beállításokat minden oldalon
 */

class ThemeManager {
    constructor() {
        this.themes = {
            'default': {
                name: 'Alapértelmezett',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                primary: '#6366f1',
                secondary: '#ec4899',
                accent: '#f59e0b'
            },
            'ocean': {
                name: 'Óceán',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                primary: '#0ea5e9',
                secondary: '#06b6d4',
                accent: '#14b8a6'
            },
            'sunset': {
                name: 'Naplemente',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
                primary: '#f59e0b',
                secondary: '#ef4444',
                accent: '#ec4899'
            },
            'forest': {
                name: 'Erdő',
                background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
                primary: '#22c55e',
                secondary: '#14b8a6',
                accent: '#84cc16'
            },
            'candy': {
                name: 'Cukorka',
                background: 'linear-gradient(135deg, #831843 0%, #be185d 100%)',
                primary: '#ec4899',
                secondary: '#f43f5e',
                accent: '#fb7185'
            },
            'cyberpunk': {
                name: 'Cyberpunk',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
                primary: '#8b5cf6',
                secondary: '#06b6d4',
                accent: '#f472b6'
            },
            'pastel': {
                name: 'Pasztell',
                background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                primary: '#f9a8d4',
                secondary: '#c4b5fd',
                accent: '#67e8f9'
            },
            'dark': {
                name: 'Sötét',
                background: '#000000',
                primary: '#374151',
                secondary: '#4b5563',
                accent: '#6b7280'
            }
        };
        
        this.currentTheme = 'default';
        this.currentPrimaryColor = '#6366f1';
        this.init();
    }

    init() {
        // Várunk az authManager inicializálására
        this.waitForAuth().then(() => {
            this.loadSettings();
            this.applyCurrentTheme();
            this.setupQuickThemeToggle();
            this.addPageTransition();
            console.log('🎨 ThemeManager initialized');
        });
    }

    waitForAuth() {
        return new Promise((resolve) => {
            if (window.authManager && window.authManager.currentUser) {
                resolve();
            } else {
                const checkAuth = setInterval(() => {
                    if (window.authManager && window.authManager.currentUser) {
                        clearInterval(checkAuth);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    getUserPrefix() {
        if (window.authManager && window.authManager.currentUser) {
            const username = window.authManager.currentUser.username;
            let hash = 0;
            for (let i = 0; i < username.length; i++) {
                const char = username.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return 'studyhub_' + Math.abs(hash).toString(36) + '_';
        }
        return '';
    }

    loadSettings() {
        const prefix = this.getUserPrefix();
        const settings = JSON.parse(localStorage.getItem(prefix + 'settings') || '{}');
        
        this.currentTheme = settings.theme || 'default';
        this.currentPrimaryColor = settings.primaryColor || '#6366f1';
        
        // Animációk és effektek
        this.animationsEnabled = settings.enableAnimations !== false;
        this.bgEffectsEnabled = settings.enableBgEffects !== false;
        this.soundEnabled = settings.enableSound || false;
        
        // Avatar szín betöltése
        this.currentAvatarColor = settings.avatarColor || 'gradient1';
        
        console.log('⚙️ Theme settings loaded:', this.currentTheme, this.currentPrimaryColor, 'avatar:', this.currentAvatarColor);
        
        // Avatar szín alkalmazása
        this.applyAvatarColor(this.currentAvatarColor);
    }

applyCurrentTheme() {
        const theme = this.themes[this.currentTheme] || this.themes['default'];
        const root = document.documentElement;
        
        // AdatTheme attribútum beállítása a CSS változókhoz
        document.body.setAttribute('data-theme', this.currentTheme);
        
        // Háttér beállítása
        document.body.style.background = theme.background;
        
// Cyberpunk csillag effekt kezelése
        this.handleCyberpunkStars();
        
        // CSS változók beállítása
        root.style.setProperty('--primary-color', this.currentPrimaryColor);
        root.style.setProperty('--theme-primary', theme.primary);
        root.style.setProperty('--theme-secondary', theme.secondary);
        root.style.setProperty('--theme-accent', theme.accent);
        
        // Szöveg szín beállítása témától függően
        const isDarkTheme = ['default', 'ocean', 'sunset', 'forest', 'candy', 'cyberpunk', 'dark'].includes(this.currentTheme);
        const isPastelTheme = this.currentTheme === 'pastel';
        
        const textColor = isDarkTheme ? '#ffffff' : (isPastelTheme ? '#1e293b' : '#1e293b');
        const mutedColor = isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 41, 59, 0.7)';
        
        // Szövegszínek alkalmazása
        document.body.style.color = textColor;
        
        // Navbar szöveg színe - mindig világos marad (gradient háttér van)
        document.querySelectorAll('.navbar, .nav-container, .logo, .logo-text, .nav-user, .user-info, .user-name, .user-role, .logout-btn, .back-btn, .theme-toggle-btn').forEach(el => {
            el.style.color = '#ffffff';
        });
        
        // Navbar háttér - NEM változik a témával, marad az eredeti szín
        // document.querySelectorAll('.navbar').forEach(nav => {
        //     nav.style.background = `linear-gradient(135deg, ${this.currentPrimaryColor}, ${this.adjustColor(this.currentPrimaryColor, 40)})`;
        // });
        
        // Elemek színeinek frissítése - kivesszük az emoji elemeket (span-okat nem módosítunk)
        document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, label').forEach(el => {
            if (!el.closest('.navbar') && !el.closest('footer') && !el.closest('.btn') && !el.closest('.settings-sidebar') && !el.closest('.settings-nav')) {
                const computedStyle = window.getComputedStyle(el);
                if (computedStyle.color === 'rgb(30, 41, 59)' || computedStyle.color === '#1e293b' || computedStyle.color === 'rgb(255, 255, 255)') {
                    el.style.color = textColor;
                }
            }
        });
        
        // Az emoji elemeket (span-okat emoji tartalommal) explicit módon NEM módosítjuk
        // Ezek az elemek tartalmazzák az emojikat és a színüknek eredetinek kell maradnia
        // A span elemeket kihagyjuk a színváltásból, mivel azok gyakran tartalmaznak emojikat
        
        // Settings sidebar és nav színe
        document.querySelectorAll('.settings-sidebar, .settings-content, .settings-card').forEach(el => {
            if (isDarkTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.1)';
            } else if (isPastelTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.8)';
            }
        });
        
        // Settings nav button színe
        document.querySelectorAll('.settings-nav button').forEach(el => {
            el.style.color = isDarkTheme ? '#ffffff' : '#1e293b';
        });
        
        // Settings section címek
        document.querySelectorAll('.settings-section h2, .settings-card h4').forEach(el => {
            el.style.color = isDarkTheme ? '#ffffff' : this.currentPrimaryColor;
        });
        
        // Card-ok és más elemek színe
        document.querySelectorAll('.option-card, .sector-card, .info-card, .settings-card, .chart-card, .subject-modal-content, .form-section, .tasks-section, .assignment-form, .add-grade-section, .subjects-section, .analytics-section, .recent-section, .achievements-section, .settings-card, .timer-settings, .timer-stats, .timer-container, .quiz-section, .grade-form').forEach(el => {
            if (isPastelTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.9)';
                el.style.color = '#1e293b';
            } else if (isDarkTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.1)';
                el.style.color = '#ffffff';
            }
        });
        
        
        // Assignment list items, filter buttons, form groups
        document.querySelectorAll('.assignment-item, .filter-buttons, .filter-btn, .form-group, .form-row, .tasks-header, .form-header, .grade-form .form-group, .stat-card, .achievement-card').forEach(el => {
            if (isPastelTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.95)';
                el.style.color = '#1e293b';
            } else if (isDarkTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.08)';
                el.style.color = '#ffffff';
            }
        });
        
        // Label-ek színe
        document.querySelectorAll('.form-group label, .tasks-header h2, .form-header h2, .add-grade-section h2, .subjects-section h2, .analytics-section h2, .recent-section h2, .achievements-section h2, .timer-settings h2, .timer-stats h2').forEach(el => {
            if (isPastelTheme) {
                el.style.color = '#1e293b';
            } else if (isDarkTheme) {
                el.style.color = '#ffffff';
            }
        });
        
        // Filter button-ok színe
        document.querySelectorAll('.filter-btn').forEach(el => {
            if (isPastelTheme) {
                el.style.background = 'rgba(99, 102, 241, 0.15)';
                el.style.color = '#4f46e5';
            } else if (isDarkTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.1)';
                el.style.color = '#ffffff';
            }
        });
        
        // Input-ok színe
        document.querySelectorAll('input, textarea, select').forEach(el => {
            if (isDarkTheme) {
                el.style.background = 'rgba(0, 0, 0, 0.3)';
                el.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                el.style.color = '#ffffff';
            } else if (isPastelTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.8)';
                el.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                el.style.color = '#1e293b';
            }
        });
        
        // Placeholder text színe
        document.querySelectorAll('input::placeholder, textarea::placeholder').forEach(el => {
            if (isDarkTheme) {
                el.style.color = 'rgba(255, 255, 255, 0.5)';
            } else if (isPastelTheme) {
                el.style.color = 'rgba(30, 41, 59, 0.5)';
            }
        });
        
        // Feature-ek színe
        document.querySelectorAll('.feature').forEach(el => {
            if (isPastelTheme) {
                el.style.background = 'rgba(99, 102, 241, 0.15)';
                el.style.color = '#4f46e5';
            } else if (isDarkTheme) {
                el.style.background = 'rgba(255, 255, 255, 0.1)';
                el.style.color = '#000000'; // Emoji szín mindig fekete
            }
        });
        
        // KRITIKUS: Az emoji elemek színét explicit módon kell beállítani A FEATURE UTÁN IS
        // Ez felülírja az örökölt fehér színt a dark témákban
        const emojiElements = document.querySelectorAll('.card-icon, .logo-icon, .summary-icon, .stat-icon, .achievement-icon, .feature');
        emojiElements.forEach(el => {
            // Minden témában fekete szín az emojiknak
            el.style.color = '#000000';
        });
        
        // A grades-card külön kezelése
        document.querySelectorAll('.grades-card .card-icon').forEach(el => {
            el.style.color = '#000000';
        });
        
        // Footer stílus - minden témához illő szín
        const footerBg = isPastelTheme 
            ? 'rgba(255, 255, 255, 0.95)' 
            : (this.currentTheme === 'dark' ? '#111111' : 'rgba(15, 23, 42, 0.95)');
        const footerText = isPastelTheme ? '#1e293b' : '#ffffff';
        
        document.querySelectorAll('footer').forEach(footer => {
            footer.style.background = footerBg;
            footer.style.color = footerText;
        });
        
        // Hero title és subtitle színe
        const heroTitle = document.querySelector('.hero-title, .page-title');
        if (heroTitle) {
            heroTitle.style.background = isDarkTheme 
                ? 'linear-gradient(135deg, #ffffff, #e0e7ff)' 
                : 'linear-gradient(135deg, #6366f1, #ec4899)';
            heroTitle.style.webkitBackgroundClip = 'text';
            heroTitle.style.backgroundClip = 'text';
        }
        
        const heroSubtitle = document.querySelector('.hero-subtitle, .page-subtitle');
        if (heroSubtitle) {
            heroSubtitle.style.color = isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 41, 59, 0.7)';
        }
        
        // Gombok színének frissítése
        this.updateButtonColors();
        
        // Animációk
        if (!this.animationsEnabled) {
            document.body.classList.add('no-animations');
        }
        
        // Háttér effektek
        if (!this.bgEffectsEnabled) {
            document.querySelectorAll('.floating-shape, .animated-background').forEach(el => {
                el.style.display = 'none';
            });
        }
        
        // Oldal betöltési animáció
        this.animatePageLoad();
        
        console.log('✅ Theme applied:', this.currentTheme);
    }

    updateButtonColors() {
        // Várunk egy kicsit, hogy a DOM betöltődjön
        setTimeout(() => {
            document.querySelectorAll('.btn-primary').forEach(btn => {
                btn.style.background = `linear-gradient(135deg, ${this.currentPrimaryColor}, ${this.adjustColor(this.currentPrimaryColor, -20)})`;
            });
            
            // Navbar szín - NEM változik, marad az eredeti lila
            // document.querySelectorAll('.navbar').forEach(nav => {
            //     nav.style.background = `linear-gradient(135deg, ${this.currentPrimaryColor}, ${this.secondary || this.adjustColor(this.currentPrimaryColor, 40)})`;
            // });
        }, 100);
    }

    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

setTheme(themeName, primaryColor = null) {
        this.currentTheme = themeName;
        if (primaryColor) {
            this.currentPrimaryColor = primaryColor;
        }
        
        // Beállítások mentése
        const prefix = this.getUserPrefix();
        const settings = JSON.parse(localStorage.getItem(prefix + 'settings') || '{}');
        settings.theme = themeName;
        if (primaryColor) {
            settings.primaryColor = primaryColor;
        }
        localStorage.setItem(prefix + 'settings', JSON.stringify(settings));
        
        // Téma alkalmazása
        this.applyCurrentTheme();
        
        // Cyberpunk csillagok frissítése témaváltáskor
        if (themeName === 'cyberpunk') {
            setTimeout(() => {
                this.activateCyberpunkStars();
            }, 200);
        }
        
        // Toast notification
        this.showToast(`🎨 Téma: ${this.themes[themeName]?.name || themeName}`);
    }

    setPrimaryColor(color) {
        this.currentPrimaryColor = color;
        
        // Beállítások mentése
        const prefix = this.getUserPrefix();
        const settings = JSON.parse(localStorage.getItem(prefix + 'settings') || '{}');
        settings.primaryColor = color;
        localStorage.setItem(prefix + 'settings', JSON.stringify(settings));
        
        // Téma újraalkalmazása
        this.applyCurrentTheme();
        
        this.showToast(`🎨 Szín: ${color}`);
    }

    // Avatar szín beállítása (a beállításokban használatos)
    setAvatarColor(color) {
        // Beállítások mentése
        const prefix = this.getUserPrefix();
        const settings = JSON.parse(localStorage.getItem(prefix + 'settings') || '{}');
        settings.avatarColor = color;
        localStorage.setItem(prefix + 'settings', JSON.stringify(settings));
        
        // Avatar szín alkalmazása
        this.applyAvatarColor(color);
        
        this.showToast(`👤 Avatar szín: ${color}`);
    }

    // Avatar szín alkalmazása az oldalon
    applyAvatarColor(color) {
        const avatarColors = {
            'gradient1': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            'gradient2': 'linear-gradient(135deg, #ec4899, #f43f5e)',
            'gradient3': 'linear-gradient(135deg, #10b981, #14b8a6)',
            'gradient4': 'linear-gradient(135deg, #f59e0b, #ef4444)',
            'gradient5': 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            'gradient6': 'linear-gradient(135deg, #8b5cf6, #d946ef)'
        };
        
        // User avatar frissítése
        document.querySelectorAll('.user-avatar').forEach(avatar => {
            if (color && avatarColors[color]) {
                avatar.style.background = avatarColors[color];
            } else if (color && color.startsWith('#')) {
                avatar.style.background = color;
            }
        });
        
        // Profile avatar frissítése (settings oldalon)
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar && color && avatarColors[color]) {
            profileAvatar.style.background = avatarColors[color];
        } else if (profileAvatar && color && color.startsWith('#')) {
            profileAvatar.style.background = color;
        }
        
        // Player avatar frissítése (grade-tracker oldalon)
        document.querySelectorAll('.player-avatar').forEach(avatar => {
            if (color && avatarColors[color]) {
                avatar.style.background = avatarColors[color];
            } else if (color && color.startsWith('#')) {
                avatar.style.background = color;
            }
        });
    }

    setupQuickThemeToggle() {
        // Ellenőrizzük, van-e már theme toggle a navbarban
        if (document.getElementById('themeToggle')) return;
        
        // Keressük meg a nav-user elemet
        const navUser = document.getElementById('navUser');
        if (!navUser) return;
        
        // Adjunk hozzá egy theme toggle gombot
        const themeBtn = document.createElement('button');
        themeBtn.id = 'themeToggle';
        themeBtn.className = 'theme-toggle-btn';
        themeBtn.innerHTML = '🎨';
        themeBtn.title = 'Téma váltás';
        themeBtn.onclick = () => this.showThemeSelector();
        
        // Beszúrás a navbarba
        navUser.insertBefore(themeBtn, navUser.firstChild);
    }

    showThemeSelector() {
        // Ha már van modal, ne hozzunk létre újabbat
        if (document.getElementById('themeSelectorModal')) {
            document.getElementById('themeSelectorModal').remove();
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'themeSelectorModal';
        modal.className = 'theme-modal';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        let themeButtons = '';
        for (const [key, theme] of Object.entries(this.themes)) {
            const isSelected = key === this.currentTheme;
            themeButtons += `
                <button class="theme-option-btn ${isSelected ? 'selected' : ''}" 
                        onclick="window.themeManager.setTheme('${key}')"
                        data-theme="${key}">
                    <div class="theme-preview" style="background: ${theme.background}"></div>
                    <span>${theme.name}</span>
                </button>
            `;
        }

        modal.innerHTML = `
            <div class="theme-modal-content">
                <div class="theme-modal-header">
                    <h3>🎨 Téma választás</h3>
                    <button class="theme-modal-close" onclick="this.closest('.theme-modal').remove()">×</button>
                </div>
                <div class="theme-options-grid">
                    ${themeButtons}
                </div>
                <div class="theme-color-picker">
                    <label>🎨 Egyedi szín:</label>
                    <input type="color" id="customColorPicker" value="${this.currentPrimaryColor}">
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Színválasztó esemény
        const colorPicker = document.getElementById('customColorPicker');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                this.setPrimaryColor(e.target.value);
            });
        }

        // Animáció
        setTimeout(() => modal.classList.add('show'), 10);
    }

    addPageTransition() {
        // Oldal betöltési animáció CSS hozzáadása, ha még nincs
        if (document.getElementById('pageAnimations')) return;

        const style = document.createElement('style');
        style.id = 'pageAnimations';
        style.textContent = `
            /* Full page layout - footer always at bottom */
            html, body {
                width: 100%;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                margin: 0;
                padding: 0;
            }
            
            main, .main-content, .page-content, .timer-main, .assignments-main, .grade-main, .sector-main, .analytics-main, .quiz-main {
                flex: 1;
                width: 100%;
            }
            
            /* Footer always at bottom */
            footer {
                margin-top: auto !important;
                width: 100%;
            }
            
            /* Mobile Hamburger Menu */
            .mobile-menu-btn {
                display: none;
                flex-direction: column;
                justify-content: space-around;
                width: 28px;
                height: 22px;
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 0;
                z-index: 1001;
            }
            
            .mobile-menu-btn span {
                width: 100%;
                height: 2.5px;
                background-color: white;
                border-radius: 2px;
                transition: all 0.3s ease;
                transform-origin: left;
            }
            
            .mobile-menu-btn.active span:nth-child(1) {
                transform: rotate(45deg);
            }
            
            .mobile-menu-btn.active span:nth-child(2) {
                opacity: 0;
                transform: translateX(8px);
            }
            
            .mobile-menu-btn.active span:nth-child(3) {
                transform: rotate(-45deg);
            }
            
            /* Mobile Nav Overlay */
            .nav-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 999;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .nav-overlay.active {
                display: block;
                opacity: 1;
            }
            
            /* Mobile Navigation */
            @media (max-width: 768px) {
                .mobile-menu-btn {
                    display: flex;
                }
                
                .nav-user {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .user-info {
                    padding: 0.4rem 0.75rem;
                }
                
                .user-name {
                    display: none;
                }
                
                .user-role {
                    display: none;
                }
                
                .logout-btn span {
                    display: none;
                }
                
                .logout-btn {
                    padding: 0.4rem 0.75rem;
                }
                
                .theme-toggle-btn {
                    width: 32px;
                    height: 32px;
                    font-size: 1rem;
                }
            }
            
            /* Touch optimization */
            button, a, input, select, textarea {
                touch-action: manipulation;
            }
            
            /* Prevent horizontal scroll on mobile */
            body {
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
            }
            
            /* Larger touch targets for mobile */
            @media (max-width: 768px) {
                .btn {
                    min-height: 44px;
                    padding: 0.75rem 1.25rem;
                }
                
                input, select, textarea {
                    min-height: 44px;
                    font-size: 16px; /* Prevents iOS zoom on focus */
                }
                
                .checkbox-custom,
                input[type="checkbox"],
                input[type="radio"] {
                    min-width: 24px;
                    min-height: 24px;
                }
            }
            
            /* Emoji elements visibility in dark themes - ensure emojis are always visible */
            [data-theme="default"] .logo-icon,
            [data-theme="ocean"] .logo-icon,
            [data-theme="sunset"] .logo-icon,
            [data-theme="forest"] .logo-icon,
            [data-theme="candy"] .logo-icon,
            [data-theme="cyberpunk"] .logo-icon,
            [data-theme="dark"] .logo-icon,
            [data-theme="default"] .card-icon,
            [data-theme="ocean"] .card-icon,
            [data-theme="sunset"] .card-icon,
            [data-theme="forest"] .card-icon,
            [data-theme="candy"] .card-icon,
            [data-theme="cyberpunk"] .card-icon,
            [data-theme="dark"] .card-icon,
            [data-theme="default"] .summary-icon,
            [data-theme="ocean"] .summary-icon,
            [data-theme="sunset"] .summary-icon,
            [data-theme="forest"] .summary-icon,
            [data-theme="candy"] .summary-icon,
            [data-theme="cyberpunk"] .summary-icon,
            [data-theme="dark"] .summary-icon,
            [data-theme="default"] .stat-icon,
            [data-theme="ocean"] .stat-icon,
            [data-theme="sunset"] .stat-icon,
            [data-theme="forest"] .stat-icon,
            [data-theme="candy"] .stat-icon,
            [data-theme="cyberpunk"] .stat-icon,
            [data-theme="dark"] .stat-icon,
            [data-theme="default"] .achievement-icon,
            [data-theme="ocean"] .achievement-icon,
            [data-theme="sunset"] .achievement-icon,
            [data-theme="forest"] .achievement-icon,
            [data-theme="candy"] .achievement-icon,
            [data-theme="cyberpunk"] .achievement-icon,
            [data-theme="dark"] .achievement-icon {
                color: #000000 !important;
                text-shadow: 0 0 1px rgba(0,0,0,0.1);
            }
            
            /* Feature tags in dark themes */
            [data-theme="default"] .feature,
            [data-theme="ocean"] .feature,
            [data-theme="sunset"] .feature,
            [data-theme="forest"] .feature,
            [data-theme="candy"] .feature,
            [data-theme="cyberpunk"] .feature,
            [data-theme="dark"] .feature {
                background: rgba(255, 255, 255, 0.2) !important;
                color: #000000 !important;
            }
            
            /* Priority badges in dark themes */
            [data-theme="default"] .priority-badge,
            [data-theme="ocean"] .priority-badge,
            [data-theme="sunset"] .priority-badge,
            [data-theme="forest"] .priority-badge,
            [data-theme="candy"] .priority-badge,
            [data-theme="cyberpunk"] .priority-badge,
            [data-theme="dark"] .priority-badge {
                background: rgba(255, 255, 255, 0.2) !important;
            }
            
            /* Page load animations */
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes slideInLeft {
                from {
                    opacity: 0;
                    transform: translateX(-30px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(30px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .animate-fade-in-up {
                animation: fadeInUp 0.6s ease-out forwards;
            }
            
            .animate-fade-in {
                animation: fadeIn 0.4s ease-out forwards;
            }
            
            .animate-scale-in {
                animation: scaleIn 0.5s ease-out forwards;
            }
            
            .animate-slide-left {
                animation: slideInLeft 0.5s ease-out forwards;
            }
            
            .animate-slide-right {
                animation: slideInRight 0.5s ease-out forwards;
            }
            
            /* Stagger delays */
            .delay-1 { animation-delay: 0.1s; }
            .delay-2 { animation-delay: 0.2s; }
            .delay-3 { animation-delay: 0.3s; }
            .delay-4 { animation-delay: 0.4s; }
            .delay-5 { animation-delay: 0.5s; }
            .delay-6 { animation-delay: 0.6s; }
            
            /* No animations class */
            .no-animations * {
                animation: none !important;
                transition: none !important;
            }
            
            /* Theme Modal Styles */
            .theme-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(5px);
            }
            
            .theme-modal.show {
                opacity: 1;
            }
            
            .theme-modal-content {
                background: #1e293b;
                border-radius: 16px;
                padding: 1.5rem;
                max-width: 400px;
                width: 90%;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .theme-modal.show .theme-modal-content {
                transform: scale(1);
            }
            
            .theme-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .theme-modal-header h3 {
                margin: 0;
                color: white;
            }
            
            .theme-modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0 0.5rem;
            }
            
            .theme-options-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.75rem;
            }
            
            .theme-option-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid transparent;
                border-radius: 8px;
                padding: 0.5rem;
                cursor: pointer;
                transition: all 0.3s ease;
                color: white;
            }
            
            .theme-option-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            
            .theme-option-btn.selected {
                border-color: var(--primary-color, #6366f1);
                background: rgba(99, 102, 241, 0.2);
            }
            
            .theme-option-btn .theme-preview {
                height: 40px;
                border-radius: 4px;
                margin-bottom: 0.5rem;
            }
            
            .theme-option-btn span {
                display: block;
                font-size: 0.85rem;
            }
            
            .theme-color-picker {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .theme-color-picker label {
                color: white;
            }
            
            .theme-color-picker input[type="color"] {
                width: 50px;
                height: 35px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }
            
            /* Theme Toggle Button */
            .theme-toggle-btn {
                background: rgba(255, 255, 255, 0.15);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.1rem;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .theme-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: scale(1.1);
            }
            
            /* Toast notification */
            .toast-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, var(--primary-color, #6366f1), #5558e3);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
            }
            
            .toast-notification.show {
                transform: translateY(0);
                opacity: 1;
            }
            
            /* Page transition overlay */
            .page-transition-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--primary-color, #6366f1);
                z-index: 9999;
                transform: scaleY(0);
                transform-origin: bottom;
            }
            
            .page-transition-overlay.active {
                animation: pageTransitionIn 0.4s ease forwards;
            }
        `;

        document.head.appendChild(style);
    }

    animatePageLoad() {
        if (!this.animationsEnabled) return;

        // Animálható elemek keresése
        const hero = document.querySelector('.hero-content, .page-title');
        const cards = document.querySelectorAll('.option-card, .sector-card, .info-card, .subjects-grid > *, .achievements-grid > *');
        
        // Hero animáció
        if (hero) {
            hero.classList.add('animate-fade-in-up');
        }
        
        // Kártyák staggered animációja
        cards.forEach((card, index) => {
            if (!card.classList.contains('option-card') && !card.classList.contains('sector-card') && 
                !card.classList.contains('info-card') && !card.classList.contains('achievement-card')) {
                card.style.opacity = '0';
                card.classList.add('animate-fade-in-up');
                card.style.animationDelay = `${index * 0.1}s`;
            }
        });

        // Navbar animáció
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.add('animate-slide-left');
        }
    }

showToast(message) {
        // Ha már van toast, távolítsuk el
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animáció
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto hide
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

// Cyberpunk csillag effekt kezelése
    handleCyberpunkStars() {
        // Várunk egy kicsit, hogy a DOM betöltődjön
        setTimeout(() => {
            this.activateCyberpunkStars();
        }, 100);
    }
    
    activateCyberpunkStars() {
        // Meglévő container eltávolítása
        const existingContainer = document.querySelector('.cyberpunk-stars-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        console.log('Current theme:', this.currentTheme);
        
        // Csak cyberpunk témánál jelenik meg
        if (this.currentTheme !== 'cyberpunk') {
            console.log('Not cyberpunk theme, skipping stars');
            return;
        }
        
        console.log('Activating cyberpunk stars!');
        
        // Container létrehozása
        const container = document.createElement('div');
        container.className = 'cyberpunk-stars-container';
        container.id = 'cyberpunkStars';
        
        // Star layers (többrétegű csillagok)
        const starLayer1 = document.createElement('div');
        starLayer1.className = 'star-layer-1';
        
        const starLayer2 = document.createElement('div');
        starLayer2.className = 'star-layer-2';
        
        const starLayer3 = document.createElement('div');
        starLayer3.className = 'star-layer-3';
        
        // Cyber grid (retrowave stílusú rács)
        const cyberGrid = document.createElement('div');
        cyberGrid.className = 'cyber-grid';
        
        // Horizon glow (horizontális fénylés)
        const horizonGlow = document.createElement('div');
        horizonGlow.className = 'horizon-glow';
        
        // Shooting stars (hullócsillagok)
        const shootingStars = document.createElement('div');
        shootingStars.className = 'shooting-stars';
        
        for (let i = 0; i < 3; i++) {
            const shootingStar = document.createElement('div');
            shootingStar.className = 'shooting-star';
            shootingStar.style.top = `${15 + Math.random() * 25}%`;
            shootingStar.style.left = `${20 + Math.random() * 50}%`;
            shootingStar.style.animationDelay = `${i * 1.5 + Math.random() * 0.5}s`;
            shootingStars.appendChild(shootingStar);
        }
        
        // Nebula clouds (ködös galaxisok)
        const nebula1 = document.createElement('div');
        nebula1.className = 'nebula nebula-1';
        
        const nebula2 = document.createElement('div');
        nebula2.className = 'nebula nebula-2';
        
        const nebula3 = document.createElement('div');
        nebula3.className = 'nebula nebula-3';
        
        // Brightyes csillag stars (fénok)
        const brightStars = document.createElement('div');
        brightStars.className = 'bright-stars';
        
        const positions = [
            { top: '15%', left: '25%' },
            { top: '25%', left: '70%' },
            { top: '40%', left: '15%' },
            { top: '55%', left: '80%' },
            { top: '70%', left: '35%' },
            { top: '80%', left: '60%' },
            { top: '30%', left: '50%' },
            { top: '65%', left: '20%' }
        ];
        
        positions.forEach((pos, i) => {
            const brightStar = document.createElement('div');
            brightStar.className = 'bright-star';
            brightStar.style.top = pos.top;
            brightStar.style.left = pos.left;
            brightStar.style.animationDelay = `${i * 0.3}s`;
            brightStars.appendChild(brightStar);
        });
        
        // Összeállítás
        container.appendChild(starLayer1);
        container.appendChild(starLayer2);
        container.appendChild(starLayer3);
        container.appendChild(cyberGrid);
        container.appendChild(horizonGlow);
        container.appendChild(shootingStars);
        container.appendChild(nebula1);
        container.appendChild(nebula2);
        container.appendChild(nebula3);
        container.appendChild(brightStars);
        
        // Beszúrás a body elejére
        document.body.insertBefore(container, document.body.firstChild);
        
        console.log('✨ Cyberpunk stars effect activated!');
    }
}

// Initialize theme manager
window.themeManager = new ThemeManager();

// Global theme functions for inline handlers
window.applyTheme = function(theme, primaryColor) {
    if (window.themeManager) {
        window.themeManager.setTheme(theme, primaryColor);
    }
};

console.log('🎨 Theme module loaded');

