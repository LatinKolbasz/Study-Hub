/**
 * ============================================
 * Debug Panel - Fejlesztői Debug Eszközök
 * ============================================
 * Valódi debug funkciókkal:
 * - LocalStorage viewer & editor
 * - Auth állapot info
 * - Performance mérők (memória, betöltési idő)
 * - Console log interceptor
 * - Gyors műveletek (cache törlés, újratöltés, stb.)
 * - Storage méret kijelzés
 * - Hálózat / Firebase állapot
 * - Event listener figyelő
 */

class DebugPanel {
    constructor() {
        this.isOpen = false;
        this.isEnabled = false;
        this.logs = [];
        this.maxLogs = 200;
        this.activeTab = 'overview';
        this.panelEl = null;
        this.toggleBtnEl = null;
        this.originalConsole = {};
        this.pageLoadTime = performance.now();
        this.eventCounts = {};
        this.networkRequests = [];
        this.init();
    }

    init() {
        // Várunk az auth-ra, aztán ellenőrizzük a beállítást
        const check = () => {
            if (window.authManager && window.authManager.authStateReady) {
                this.checkEnabled();
            } else {
                setTimeout(check, 200);
            }
        };
        check();
    }

    checkEnabled() {
        const prefix = this.getUserPrefix();
        const settings = JSON.parse(localStorage.getItem(prefix + 'settings') || '{}');
        if (settings.devDebug) {
            this.enable();
        }
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
        return 'studyhub_';
    }

    enable() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        this.interceptConsole();
        this.interceptFetch();
        this.trackEvents();
        this.injectStyles();
        this.createPanel();
        this.createToggleButton();
        this.startPerformanceMonitor();
        console.log('🔧 Debug Panel aktív');
    }

    disable() {
        this.isEnabled = false;
        this.restoreConsole();
        if (this.panelEl) this.panelEl.remove();
        if (this.toggleBtnEl) this.toggleBtnEl.remove();
        if (this.perfInterval) clearInterval(this.perfInterval);
        this.panelEl = null;
        this.toggleBtnEl = null;
    }

    // ==================== CONSOLE INTERCEPTOR ====================
    interceptConsole() {
        const self = this;
        ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
            self.originalConsole[method] = console[method].bind(console);
            console[method] = function(...args) {
                self.addLog(method, args);
                self.originalConsole[method](...args);
            };
        });

        // Global error handler
        window.addEventListener('error', (e) => {
            self.addLog('error', [`❌ Uncaught: ${e.message} (${e.filename}:${e.lineno})`]);
        });

        window.addEventListener('unhandledrejection', (e) => {
            self.addLog('error', [`❌ Unhandled Promise: ${e.reason}`]);
        });
    }

    restoreConsole() {
        Object.keys(this.originalConsole).forEach(method => {
            console[method] = this.originalConsole[method];
        });
    }

    addLog(level, args) {
        const entry = {
            time: new Date().toLocaleTimeString('hu-HU'),
            level,
            message: args.map(a => {
                if (typeof a === 'object') {
                    try { return JSON.stringify(a, null, 0).substring(0, 300); }
                    catch { return String(a); }
                }
                return String(a);
            }).join(' ')
        };
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) this.logs.shift();

        // Ha a console tab aktív, frissítjük
        if (this.isOpen && this.activeTab === 'console') {
            this.renderConsoleTab();
        }
        // Frissítjük az error badge-et
        this.updateErrorBadge();
    }

    // ==================== FETCH INTERCEPTOR ====================
    interceptFetch() {
        const self = this;
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '?';
            const method = args[1]?.method || 'GET';
            const startTime = performance.now();
            const req = { url, method, status: '...', time: 0, timestamp: new Date().toLocaleTimeString('hu-HU') };
            self.networkRequests.push(req);
            if (self.networkRequests.length > 50) self.networkRequests.shift();

            return originalFetch.apply(this, args).then(response => {
                req.status = response.status;
                req.time = Math.round(performance.now() - startTime);
                if (self.isOpen && self.activeTab === 'network') self.renderNetworkTab();
                return response;
            }).catch(err => {
                req.status = 'ERR';
                req.time = Math.round(performance.now() - startTime);
                if (self.isOpen && self.activeTab === 'network') self.renderNetworkTab();
                throw err;
            });
        };
    }

    // ==================== EVENT TRACKING ====================
    trackEvents() {
        const self = this;
        const eventsToTrack = ['click', 'input', 'change', 'submit', 'keydown'];
        eventsToTrack.forEach(evt => {
            document.addEventListener(evt, () => {
                self.eventCounts[evt] = (self.eventCounts[evt] || 0) + 1;
            }, true);
        });
    }

    // ==================== PERFORMANCE MONITOR ====================
    startPerformanceMonitor() {
        this.perfInterval = setInterval(() => {
            if (this.isOpen && this.activeTab === 'overview') {
                this.renderOverviewTab();
            }
        }, 2000);
    }

    // ==================== UI ====================
    injectStyles() {
        if (document.getElementById('debug-panel-styles')) return;
        const style = document.createElement('style');
        style.id = 'debug-panel-styles';
        style.textContent = `
            #debug-toggle-btn {
                position: fixed;
                bottom: 16px;
                right: 16px;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #f59e0b, #ef4444);
                border: 2px solid rgba(255,255,255,0.3);
                color: white;
                font-size: 1.4rem;
                cursor: pointer;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            #debug-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(245, 158, 11, 0.6);
            }
            #debug-toggle-btn .error-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }

            #debug-panel {
                position: fixed;
                bottom: 72px;
                right: 16px;
                width: 520px;
                max-width: calc(100vw - 32px);
                height: 480px;
                max-height: calc(100vh - 100px);
                background: rgba(15, 15, 25, 0.97);
                border: 1px solid rgba(99, 102, 241, 0.4);
                border-radius: 16px;
                z-index: 99998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                font-family: 'Segoe UI', monospace;
                color: #e2e8f0;
                font-size: 0.85rem;
                resize: both;
            }
            #debug-panel.open { display: flex; }

            #debug-panel .dp-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                background: rgba(99, 102, 241, 0.15);
                border-bottom: 1px solid rgba(99, 102, 241, 0.3);
                min-height: 42px;
                cursor: move;
            }
            #debug-panel .dp-header-title {
                font-weight: 700;
                font-size: 0.95rem;
                color: #a5b4fc;
            }
            #debug-panel .dp-close {
                background: none;
                border: none;
                color: #94a3b8;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 4px;
            }
            #debug-panel .dp-close:hover { background: rgba(255,255,255,0.1); }

            #debug-panel .dp-tabs {
                display: flex;
                background: rgba(0,0,0,0.3);
                border-bottom: 1px solid rgba(255,255,255,0.08);
                overflow-x: auto;
            }
            #debug-panel .dp-tab {
                padding: 8px 14px;
                cursor: pointer;
                color: #94a3b8;
                font-size: 0.8rem;
                border: none;
                background: none;
                white-space: nowrap;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }
            #debug-panel .dp-tab:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
            #debug-panel .dp-tab.active {
                color: #a5b4fc;
                border-bottom-color: #6366f1;
                background: rgba(99,102,241,0.1);
            }

            #debug-panel .dp-content {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
            }
            #debug-panel .dp-content::-webkit-scrollbar { width: 6px; }
            #debug-panel .dp-content::-webkit-scrollbar-track { background: transparent; }
            #debug-panel .dp-content::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 3px; }

            /* Overview */
            .dp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
            .dp-stat {
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 10px 12px;
                border-left: 3px solid #6366f1;
            }
            .dp-stat-label { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
            .dp-stat-value { font-size: 1.1rem; font-weight: 700; color: #e2e8f0; margin-top: 2px; }
            .dp-stat.warn { border-left-color: #f59e0b; }
            .dp-stat.error { border-left-color: #ef4444; }
            .dp-stat.success { border-left-color: #10b981; }

            /* Console */
            .dp-log-entry {
                padding: 4px 8px;
                border-radius: 4px;
                margin-bottom: 2px;
                font-family: 'Cascadia Code', 'Fira Code', monospace;
                font-size: 0.78rem;
                word-break: break-all;
                display: flex;
                gap: 8px;
            }
            .dp-log-entry .log-time { color: #64748b; flex-shrink: 0; }
            .dp-log-entry .log-msg { flex: 1; }
            .dp-log-entry.log { color: #e2e8f0; }
            .dp-log-entry.warn { color: #fbbf24; background: rgba(251,191,36,0.08); }
            .dp-log-entry.error { color: #f87171; background: rgba(248,113,113,0.08); }
            .dp-log-entry.info { color: #60a5fa; }
            .dp-log-entry.debug { color: #a78bfa; }

            .dp-console-toolbar {
                display: flex;
                gap: 6px;
                margin-bottom: 8px;
            }
            .dp-console-toolbar button, .dp-console-toolbar select {
                padding: 4px 10px;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.15);
                background: rgba(255,255,255,0.05);
                color: #e2e8f0;
                cursor: pointer;
                font-size: 0.75rem;
            }
            .dp-console-toolbar button:hover { background: rgba(255,255,255,0.1); }

            /* Storage */
            .dp-storage-item {
                background: rgba(255,255,255,0.04);
                border-radius: 8px;
                margin-bottom: 6px;
                overflow: hidden;
            }
            .dp-storage-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .dp-storage-header:hover { background: rgba(255,255,255,0.06); }
            .dp-storage-key {
                font-family: monospace;
                color: #a5b4fc;
                font-size: 0.8rem;
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .dp-storage-size {
                color: #64748b;
                font-size: 0.7rem;
                margin-left: 8px;
                flex-shrink: 0;
            }
            .dp-storage-actions {
                display: flex;
                gap: 4px;
                margin-left: 8px;
            }
            .dp-storage-actions button {
                padding: 2px 6px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.7rem;
                background: rgba(255,255,255,0.1);
                color: #94a3b8;
            }
            .dp-storage-actions button:hover { background: rgba(255,255,255,0.2); }
            .dp-storage-actions button.delete { color: #f87171; }
            .dp-storage-value {
                display: none;
                padding: 8px 12px;
                background: rgba(0,0,0,0.3);
                font-family: monospace;
                font-size: 0.75rem;
                color: #94a3b8;
                max-height: 200px;
                overflow-y: auto;
                white-space: pre-wrap;
                word-break: break-all;
                border-top: 1px solid rgba(255,255,255,0.05);
            }
            .dp-storage-value.open { display: block; }

            /* Network */
            .dp-network-entry {
                display: grid;
                grid-template-columns: 50px 40px 1fr 60px;
                gap: 8px;
                padding: 6px 8px;
                border-radius: 4px;
                font-size: 0.78rem;
                align-items: center;
            }
            .dp-network-entry:nth-child(even) { background: rgba(255,255,255,0.03); }
            .dp-network-method { font-weight: 700; color: #a5b4fc; }
            .dp-network-status { font-weight: 600; }
            .dp-network-status.ok { color: #10b981; }
            .dp-network-status.err { color: #f87171; }
            .dp-network-url { color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .dp-network-time { color: #64748b; text-align: right; }

            /* Actions */
            .dp-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .dp-action-btn {
                padding: 12px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                background: rgba(255,255,255,0.05);
                color: #e2e8f0;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s;
            }
            .dp-action-btn:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); }
            .dp-action-btn .action-icon { font-size: 1.3rem; display: block; margin-bottom: 4px; }
            .dp-action-btn .action-label { font-size: 0.82rem; font-weight: 600; }
            .dp-action-btn .action-desc { font-size: 0.7rem; color: #94a3b8; margin-top: 2px; }
            .dp-action-btn.danger { border-color: rgba(239,68,68,0.3); }
            .dp-action-btn.danger:hover { background: rgba(239,68,68,0.15); }

            /* Search */
            .dp-search {
                width: 100%;
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.15);
                background: rgba(0,0,0,0.3);
                color: #e2e8f0;
                font-size: 0.8rem;
                margin-bottom: 10px;
            }
            .dp-search::placeholder { color: #64748b; }
            .dp-search:focus { outline: none; border-color: #6366f1; }

            @media (max-width: 600px) {
                #debug-panel { width: calc(100vw - 16px); right: 8px; bottom: 68px; height: 60vh; }
                .dp-grid { grid-template-columns: 1fr; }
                .dp-action-grid { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
    }

    createToggleButton() {
        if (this.toggleBtnEl) return;
        const btn = document.createElement('button');
        btn.id = 'debug-toggle-btn';
        btn.innerHTML = '🛠️';
        btn.title = 'Debug Panel';
        btn.onclick = () => this.toggle();
        document.body.appendChild(btn);
        this.toggleBtnEl = btn;
    }

    updateErrorBadge() {
        if (!this.toggleBtnEl) return;
        const errorCount = this.logs.filter(l => l.level === 'error').length;
        let badge = this.toggleBtnEl.querySelector('.error-badge');
        if (errorCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'error-badge';
                this.toggleBtnEl.appendChild(badge);
            }
            badge.textContent = errorCount > 99 ? '99+' : errorCount;
        } else if (badge) {
            badge.remove();
        }
    }

    createPanel() {
        if (this.panelEl) return;
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div class="dp-header">
                <span class="dp-header-title">🛠️ Debug Panel</span>
                <button class="dp-close" title="Bezárás">&times;</button>
            </div>
            <div class="dp-tabs">
                <button class="dp-tab active" data-tab="overview">📊 Áttekintés</button>
                <button class="dp-tab" data-tab="console">💬 Console</button>
                <button class="dp-tab" data-tab="storage">💾 Storage</button>
                <button class="dp-tab" data-tab="network">🌐 Hálózat</button>
                <button class="dp-tab" data-tab="actions">⚡ Műveletek</button>
            </div>
            <div class="dp-content" id="dp-content"></div>
        `;
        document.body.appendChild(panel);
        this.panelEl = panel;

        // Event handlers
        panel.querySelector('.dp-close').onclick = () => this.toggle();
        panel.querySelectorAll('.dp-tab').forEach(tab => {
            tab.onclick = () => {
                panel.querySelectorAll('.dp-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                this.renderTab();
            };
        });

        // Drag support
        this.makeDraggable(panel);
    }

    makeDraggable(panel) {
        const header = panel.querySelector('.dp-header');
        let isDragging = false, startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            panel.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            panel.style.position = 'fixed';
            panel.style.left = (startLeft + dx) + 'px';
            panel.style.top = (startTop + dy) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            panel.style.transition = '';
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.panelEl) {
            this.panelEl.classList.toggle('open', this.isOpen);
        }
        if (this.isOpen) {
            this.renderTab();
        }
    }

    renderTab() {
        switch (this.activeTab) {
            case 'overview': this.renderOverviewTab(); break;
            case 'console': this.renderConsoleTab(); break;
            case 'storage': this.renderStorageTab(); break;
            case 'network': this.renderNetworkTab(); break;
            case 'actions': this.renderActionsTab(); break;
        }
    }

    // ==================== TABS ====================

    renderOverviewTab() {
        const content = document.getElementById('dp-content');
        if (!content) return;

        const now = performance.now();
        const pageLoadMs = Math.round(this.pageLoadTime);
        const uptime = Math.round((now) / 1000);
        const memInfo = performance.memory ? {
            used: (performance.memory.usedJSHeapSize / 1048576).toFixed(1),
            total: (performance.memory.totalJSHeapSize / 1048576).toFixed(1),
            limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(1)
        } : null;

        // Storage size
        let storageSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            storageSize += (key.length + localStorage.getItem(key).length) * 2;
        }
        const storageMB = (storageSize / 1048576).toFixed(2);
        const storagePercent = ((storageSize / (5 * 1048576)) * 100).toFixed(1);

        // User & Auth info
        const user = window.authManager?.currentUser;
        const firebaseUser = typeof firebase !== 'undefined' ? firebase.auth().currentUser : null;

        // DOM stats
        const domElements = document.querySelectorAll('*').length;
        const scripts = document.querySelectorAll('script').length;
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style').length;

        // Error/Warn counts
        const errorCount = this.logs.filter(l => l.level === 'error').length;
        const warnCount = this.logs.filter(l => l.level === 'warn').length;

        // Events
        const totalEvents = Object.values(this.eventCounts).reduce((a, b) => a + b, 0);

        const page = window.location.pathname.split('/').pop() || 'index.html';

        content.innerHTML = `
            <div class="dp-grid">
                <div class="dp-stat success">
                    <div class="dp-stat-label">Oldal</div>
                    <div class="dp-stat-value">${page}</div>
                </div>
                <div class="dp-stat">
                    <div class="dp-stat-label">Uptime</div>
                    <div class="dp-stat-value">${uptime}s</div>
                </div>
                <div class="dp-stat ${errorCount > 0 ? 'error' : 'success'}">
                    <div class="dp-stat-label">Hibák / Figyelmez.</div>
                    <div class="dp-stat-value">${errorCount} / ${warnCount}</div>
                </div>
                <div class="dp-stat ${parseFloat(storagePercent) > 80 ? 'warn' : ''}">
                    <div class="dp-stat-label">Storage</div>
                    <div class="dp-stat-value">${storageMB} MB (${storagePercent}%)</div>
                </div>
                ${memInfo ? `
                <div class="dp-stat">
                    <div class="dp-stat-label">Memória (JS Heap)</div>
                    <div class="dp-stat-value">${memInfo.used} / ${memInfo.total} MB</div>
                </div>` : ''}
                <div class="dp-stat">
                    <div class="dp-stat-label">DOM elemek</div>
                    <div class="dp-stat-value">${domElements}</div>
                </div>
                <div class="dp-stat">
                    <div class="dp-stat-label">Scriptek / Stílusok</div>
                    <div class="dp-stat-value">${scripts} / ${stylesheets}</div>
                </div>
                <div class="dp-stat">
                    <div class="dp-stat-label">Események összesen</div>
                    <div class="dp-stat-value">${totalEvents}</div>
                </div>
            </div>

            <div class="dp-stat" style="margin-bottom: 8px;">
                <div class="dp-stat-label">Felhasználó</div>
                <div class="dp-stat-value" style="font-size: 0.9rem;">${user ? `${user.username} (${user.email})` : '❌ Nincs bejelentkezve'}</div>
            </div>
            <div class="dp-stat ${firebaseUser ? 'success' : 'error'}">
                <div class="dp-stat-label">Firebase Auth</div>
                <div class="dp-stat-value" style="font-size: 0.9rem;">${firebaseUser ? `✅ ${firebaseUser.email} (uid: ${firebaseUser.uid.substring(0,8)}...)` : '❌ Nincs Firebase user'}</div>
            </div>

            <div style="margin-top: 10px;">
                <div class="dp-stat-label" style="margin-bottom: 4px;">Események részletezés</div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${Object.entries(this.eventCounts).map(([evt, count]) =>
                        `<span style="background: rgba(99,102,241,0.15); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">${evt}: <strong>${count}</strong></span>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    renderConsoleTab() {
        const content = document.getElementById('dp-content');
        if (!content) return;

        const currentFilter = content.querySelector('#dp-log-filter')?.value || 'all';

        const filteredLogs = currentFilter === 'all' 
            ? this.logs 
            : this.logs.filter(l => l.level === currentFilter);

        content.innerHTML = `
            <div class="dp-console-toolbar">
                <select id="dp-log-filter" onchange="window.debugPanel.renderConsoleTab()">
                    <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>Mind</option>
                    <option value="log" ${currentFilter === 'log' ? 'selected' : ''}>Log</option>
                    <option value="warn" ${currentFilter === 'warn' ? 'selected' : ''}>Warn</option>
                    <option value="error" ${currentFilter === 'error' ? 'selected' : ''}>Error</option>
                    <option value="info" ${currentFilter === 'info' ? 'selected' : ''}>Info</option>
                </select>
                <button onclick="window.debugPanel.logs=[]; window.debugPanel.renderConsoleTab();">🗑️ Törlés</button>
                <span style="margin-left: auto; color: #64748b; font-size: 0.75rem;">${filteredLogs.length} bejegyzés</span>
            </div>
            <div id="dp-log-list">
                ${filteredLogs.length === 0 ? '<div style="color: #64748b; text-align: center; padding: 20px;">Nincs log bejegyzés</div>' :
                filteredLogs.slice(-100).map(log => `
                    <div class="dp-log-entry ${log.level}">
                        <span class="log-time">${log.time}</span>
                        <span class="log-msg">${this.escapeHtml(log.message)}</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Scroll to bottom
        const logList = content.querySelector('#dp-log-list');
        if (logList) logList.scrollTop = logList.scrollHeight;
    }

    renderStorageTab() {
        const content = document.getElementById('dp-content');
        if (!content) return;

        const prefix = this.getUserPrefix();
        const items = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = ((key.length + value.length) * 2);
            const isUser = key.startsWith(prefix);
            items.push({ key, value, size, isUser });
        }
        items.sort((a, b) => b.size - a.size);

        content.innerHTML = `
            <input class="dp-search" placeholder="🔍 Keresés kulcs alapján..." id="dp-storage-search" oninput="window.debugPanel.filterStorage(this.value)">
            <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                <button class="dp-tab active" data-filter="all" onclick="window.debugPanel.filterStorageType(this, 'all')">Mind (${items.length})</button>
                <button class="dp-tab" data-filter="user" onclick="window.debugPanel.filterStorageType(this, 'user')">Saját (${items.filter(i => i.isUser).length})</button>
                <button class="dp-tab" data-filter="other" onclick="window.debugPanel.filterStorageType(this, 'other')">Egyéb (${items.filter(i => !i.isUser).length})</button>
            </div>
            <div id="dp-storage-list">
                ${items.map((item, idx) => `
                    <div class="dp-storage-item" data-key="${this.escapeHtml(item.key)}" data-user="${item.isUser}">
                        <div class="dp-storage-header" onclick="this.nextElementSibling.classList.toggle('open')">
                            <span class="dp-storage-key" title="${this.escapeHtml(item.key)}">${item.isUser ? '👤 ' : ''}${this.escapeHtml(item.key)}</span>
                            <span class="dp-storage-size">${this.formatBytes(item.size)}</span>
                            <div class="dp-storage-actions">
                                <button onclick="event.stopPropagation(); window.debugPanel.copyStorageItem('${this.escapeHtml(item.key)}')" title="Másolás">📋</button>
                                <button onclick="event.stopPropagation(); window.debugPanel.editStorageItem('${this.escapeHtml(item.key)}')" title="Szerkesztés">✏️</button>
                                <button class="delete" onclick="event.stopPropagation(); window.debugPanel.deleteStorageItem('${this.escapeHtml(item.key)}')" title="Törlés">🗑️</button>
                            </div>
                        </div>
                        <div class="dp-storage-value">${this.formatStorageValue(item.value)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    filterStorage(query) {
        const list = document.getElementById('dp-storage-list');
        if (!list) return;
        const items = list.querySelectorAll('.dp-storage-item');
        items.forEach(item => {
            const key = item.dataset.key.toLowerCase();
            item.style.display = key.includes(query.toLowerCase()) ? '' : 'none';
        });
    }

    filterStorageType(btnEl, type) {
        // Update tabs
        btnEl.parentElement.querySelectorAll('.dp-tab').forEach(t => t.classList.remove('active'));
        btnEl.classList.add('active');

        const list = document.getElementById('dp-storage-list');
        if (!list) return;
        const items = list.querySelectorAll('.dp-storage-item');
        items.forEach(item => {
            if (type === 'all') {
                item.style.display = '';
            } else if (type === 'user') {
                item.style.display = item.dataset.user === 'true' ? '' : 'none';
            } else {
                item.style.display = item.dataset.user === 'false' ? '' : 'none';
            }
        });
    }

    copyStorageItem(key) {
        const value = localStorage.getItem(key);
        navigator.clipboard.writeText(value).then(() => {
            this.showToast('📋 Másolva a vágólapra!');
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = value;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            this.showToast('📋 Másolva!');
        });
    }

    editStorageItem(key) {
        const value = localStorage.getItem(key);
        let formatted = value;
        try { formatted = JSON.stringify(JSON.parse(value), null, 2); } catch {}
        
        const newValue = prompt(`✏️ Szerkesztés: ${key}\n\n(JSON formátumban)`, formatted);
        if (newValue === null) return;
        
        try {
            // Validate JSON if it looks like JSON
            if (newValue.trim().startsWith('{') || newValue.trim().startsWith('[')) {
                JSON.parse(newValue);
            }
            localStorage.setItem(key, newValue);
            this.showToast('✅ Mentve!');
            this.renderStorageTab();
        } catch (e) {
            if (confirm(`⚠️ Érvénytelen JSON: ${e.message}\n\nMentés mint plain text?`)) {
                localStorage.setItem(key, newValue);
                this.showToast('✅ Mentve (plain text)!');
                this.renderStorageTab();
            }
        }
    }

    deleteStorageItem(key) {
        if (!confirm(`🗑️ Törlöd: ${key}?`)) return;
        localStorage.removeItem(key);
        this.showToast('🗑️ Törölve!');
        this.renderStorageTab();
    }

    renderNetworkTab() {
        const content = document.getElementById('dp-content');
        if (!content) return;

        content.innerHTML = `
            <div style="margin-bottom: 8px; color: #64748b; font-size: 0.75rem;">
                ${this.networkRequests.length} kérés rögzítve (az oldal betöltése óta)
            </div>
            ${this.networkRequests.length === 0 ? 
                '<div style="color: #64748b; text-align: center; padding: 20px;">Nincs rögzített hálózati kérés</div>' :
                this.networkRequests.map(req => `
                    <div class="dp-network-entry">
                        <span class="dp-network-method">${req.method}</span>
                        <span class="dp-network-status ${req.status >= 200 && req.status < 400 ? 'ok' : 'err'}">${req.status}</span>
                        <span class="dp-network-url" title="${this.escapeHtml(req.url)}">${this.escapeHtml(req.url)}</span>
                        <span class="dp-network-time">${req.time}ms</span>
                    </div>
                `).join('')
            }
        `;
    }

    renderActionsTab() {
        const content = document.getElementById('dp-content');
        if (!content) return;

        content.innerHTML = `
            <div class="dp-action-grid">
                <button class="dp-action-btn" onclick="window.debugPanel.actionReload()">
                    <span class="action-icon">🔄</span>
                    <span class="action-label">Újratöltés</span>
                    <span class="action-desc">Oldal újratöltése cache nélkül</span>
                </button>
                <button class="dp-action-btn" onclick="window.debugPanel.actionClearCache()">
                    <span class="action-icon">🧹</span>
                    <span class="action-label">Cache törlés</span>
                    <span class="action-desc">SessionStorage & cache törlése</span>
                </button>
                <button class="dp-action-btn danger" onclick="window.debugPanel.actionClearUserStorage()">
                    <span class="action-icon">👤</span>
                    <span class="action-label">Saját adatok törlése</span>
                    <span class="action-desc">Felhasználói localStorage törlése</span>
                </button>
                <button class="dp-action-btn danger" onclick="window.debugPanel.actionClearAllStorage()">
                    <span class="action-icon">🗑️</span>
                    <span class="action-label">Összes adat törlése</span>
                    <span class="action-desc">Teljes localStorage kiürítése</span>
                </button>
                <button class="dp-action-btn" onclick="window.debugPanel.actionExportStorage()">
                    <span class="action-icon">📥</span>
                    <span class="action-label">Storage export</span>
                    <span class="action-desc">Összes localStorage mentése JSON-ba</span>
                </button>
                <button class="dp-action-btn" onclick="window.debugPanel.actionImportStorage()">
                    <span class="action-icon">📤</span>
                    <span class="action-label">Storage import</span>
                    <span class="action-desc">localStorage visszatöltése JSON-ból</span>
                </button>
                <button class="dp-action-btn" onclick="window.debugPanel.actionTestFirebase()">
                    <span class="action-icon">🔥</span>
                    <span class="action-label">Firebase teszt</span>
                    <span class="action-desc">Firebase kapcsolat ellenőrzése</span>
                </button>
                <button class="dp-action-btn" onclick="window.debugPanel.actionShowPerformance()">
                    <span class="action-icon">⚡</span>
                    <span class="action-label">Performance</span>
                    <span class="action-desc">Részletes teljesítmény adatok</span>
                </button>
                <button class="dp-action-btn" onclick="window.debugPanel.actionForceError()">
                    <span class="action-icon">💥</span>
                    <span class="action-label">Teszt hiba</span>
                    <span class="action-desc">Teszt error dobása a console-ba</span>
                </button>
                <button class="dp-action-btn" onclick="window.debugPanel.actionToggleWireframe()">
                    <span class="action-icon">📐</span>
                    <span class="action-label">Wireframe</span>
                    <span class="action-desc">Elemek körvonalainak mutatása</span>
                </button>
            </div>
        `;
    }

    // ==================== ACTIONS ====================

    actionReload() {
        location.reload(true);
    }

    actionClearCache() {
        sessionStorage.clear();
        if ('caches' in window) {
            caches.keys().then(names => names.forEach(n => caches.delete(n)));
        }
        this.showToast('🧹 Cache törölve!');
    }

    actionClearUserStorage() {
        const prefix = this.getUserPrefix();
        if (!confirm(`👤 Törlöd az összes "${prefix}*" kulcsot?`)) return;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        this.showToast(`🗑️ ${keysToRemove.length} kulcs törölve!`);
        this.renderStorageTab();
    }

    actionClearAllStorage() {
        if (!confirm('⚠️ Biztosan törlöd az ÖSSZES localStorage adatot?')) return;
        if (!confirm('🚨 Utoljára kérdezem: ez MINDENT töröl!')) return;
        localStorage.clear();
        this.showToast('🗑️ Összes adat törölve!');
        this.renderStorageTab();
    }

    actionExportStorage() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            try { data[key] = JSON.parse(localStorage.getItem(key)); }
            catch { data[key] = localStorage.getItem(key); }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `debug_storage_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.showToast('📥 Storage exportálva!');
    }

    actionImportStorage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    let count = 0;
                    for (const [key, value] of Object.entries(data)) {
                        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                        count++;
                    }
                    this.showToast(`📤 ${count} kulcs importálva!`);
                    this.renderStorageTab();
                } catch (err) {
                    this.showToast(`❌ Import hiba: ${err.message}`);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    actionTestFirebase() {
        if (typeof firebase === 'undefined') {
            this.showToast('❌ Firebase nem elérhető!');
            return;
        }
        
        const auth = firebase.auth();
        const user = auth.currentUser;
        
        let msg = '🔥 Firebase állapot:\n';
        msg += `  App: ${firebase.apps.length > 0 ? '✅' : '❌'}\n`;
        msg += `  Auth: ${user ? '✅ ' + user.email : '❌ nincs user'}\n`;
        
        // Firestore ping check
        if (firebase.firestore) {
            const start = performance.now();
            firebase.firestore().collection('_debug_ping').doc('test').get()
                .then(() => {
                    const ms = Math.round(performance.now() - start);
                    this.showToast(`🔥 Firebase OK! Firestore válaszidő: ${ms}ms`);
                })
                .catch((err) => {
                    const ms = Math.round(performance.now() - start);
                    this.showToast(`🔥 Firebase Auth OK, Firestore: ${err.code || err.message} (${ms}ms)`);
                });
        } else {
            this.showToast(msg);
        }
    }

    actionShowPerformance() {
        const entries = performance.getEntriesByType('navigation');
        const nav = entries[0];
        if (!nav) {
            this.showToast('⚡ Navigation Timing nem elérhető');
            return;
        }

        const details = [
            `DNS: ${Math.round(nav.domainLookupEnd - nav.domainLookupStart)}ms`,
            `TCP: ${Math.round(nav.connectEnd - nav.connectStart)}ms`,
            `Request: ${Math.round(nav.responseStart - nav.requestStart)}ms`,
            `Response: ${Math.round(nav.responseEnd - nav.responseStart)}ms`,
            `DOM Parse: ${Math.round(nav.domInteractive - nav.responseEnd)}ms`,
            `DOM Complete: ${Math.round(nav.domComplete - nav.domInteractive)}ms`,
            `Total Load: ${Math.round(nav.loadEventEnd - nav.startTime)}ms`
        ].join('\n');

        alert(`⚡ Performance Timing\n\n${details}`);
    }

    actionForceError() {
        console.error('💥 Teszt hiba a Debug Panel-ből!', { timestamp: Date.now(), page: location.pathname });
        console.warn('⚠️ Teszt figyelmeztetés a Debug Panel-ből!');
        this.showToast('💥 Teszt hiba/warning dobva!');
    }

    actionToggleWireframe() {
        let style = document.getElementById('debug-wireframe');
        if (style) {
            style.remove();
            this.showToast('📐 Wireframe kikapcsolva');
        } else {
            style = document.createElement('style');
            style.id = 'debug-wireframe';
            style.textContent = `* { outline: 1px solid rgba(99, 102, 241, 0.3) !important; }`;
            document.head.appendChild(style);
            this.showToast('📐 Wireframe bekapcsolva');
        }
    }

    // ==================== HELPERS ====================

    showToast(message) {
        // Eltávolítjuk a régi toast-ot ha van
        const oldToast = document.getElementById('dp-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'dp-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 72px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15,15,25,0.95);
            color: #e2e8f0;
            padding: 10px 20px;
            border-radius: 10px;
            border: 1px solid rgba(99,102,241,0.4);
            z-index: 100000;
            font-size: 0.85rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            animation: dpToastIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    formatStorageValue(value) {
        try {
            const parsed = JSON.parse(value);
            return this.escapeHtml(JSON.stringify(parsed, null, 2));
        } catch {
            return this.escapeHtml(value);
        }
    }
}

// Auto-init
window.debugPanel = new DebugPanel();
console.log('🛠️ Debug modul betöltve');
