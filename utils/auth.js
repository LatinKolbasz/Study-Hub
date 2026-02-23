
/**
 * AuthManager - Bejelentkezes es Regisztracio
 * Egyszeru hasheles (mukodik HTTP-n is)
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.tokenKey = 'studyhub_token';
        this.userKey = 'studyhub_user';
        this.usersKey = 'studyhub_users';
        this.init();
    }

    init() {
        const token = localStorage.getItem(this.tokenKey);
        const userData = localStorage.getItem(this.userKey);
        
        if (token && userData) {
            try {
                // Handle empty string case
                if (!userData || userData.trim() === '') {
                    this.logout();
                    return;
                }
                const user = JSON.parse(userData);
                if (this.validateToken(token, user.username)) {
                    this.currentUser = user;
                    this.setupUserData(user.username);
                    console.log('✅ Felhasznalo bejelentkezve:', user.username);
                } else {
                    this.logout();
                }
            } catch (e) {
                console.error('❌ Auth init hiba:', e);
                this.logout();
            }
        }
    }

    async register(username, password, email = '') {
        if (!username || username.length < 3) {
            return { success: false, message: '❌ A felhasznalonevnek legalabb 3 karakter kell!' };
        }
        
        if (!password || password.length < 4) {
            return { success: false, message: '❌ A jelszonak legalabb 4 karakter kell!' };
        }

        const users = this.getUsers();
        
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, message: '❌ Ez a felhasznalonev mar foglalt!' };
        }
        
        const salt = this.generateSalt();
        const hash = this.hashPassword(password, salt);
        
        const newUser = {
            id: Date.now(),
            username: username.trim(),
            email: email.trim(),
            passwordHash: hash,
            salt: salt,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            role: 'user',
            settings: { theme: 'default', notifications: true }
        };
        
        users.push(newUser);
        this.saveUsers(users);
        this.createUserDataFolder(username);
        
        return this.login(username, password);
    }

    async login(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        
        if (!user) {
            this.logAuthAttempt(username, false, 'user_not_found');
            return { success: false, message: '❌ Hibas felhasznalonev vagy jelszo!' };
        }
        
        const hash = this.hashPassword(password, user.salt);
        
        if (hash !== user.passwordHash) {
            this.logAuthAttempt(username, false, 'wrong_password');
            return { success: false, message: '❌ Hibas felhasznalonev vagy jelszo!' };
        }
        
        user.lastLogin = new Date().toISOString();
        this.saveUsers(users);
        
        const token = this.generateToken(username);
        
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString()
        }));
        
        this.currentUser = user;
        this.setupUserData(username);
        
        this.logAuthAttempt(username, true, 'success');
        console.log('✅ Bejelentkezes sikeres:', username);
        
        return { 
            success: true, 
            message: '✅ Sikeres bejelentkezes!',
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        };
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem('studyhub_userdata_prefix');
        this.currentUser = null;
        // Login eltávolítva - ne irányítson át
        // window.location.href = 'login.html';
    }

    isLoggedIn() {
        // Mindig bejelentkezve (login rendszer kikapcsolva)
        return true;
    }

    getUser() {
        return this.currentUser;
    }

    getUsersList() {
        const users = this.getUsers();
        return users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin
        }));
    }

    // Hash metodusok
    generateSalt() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let salt = '';
        for (let i = 0; i < 16; i++) {
            salt += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return salt;
    }

    hashPassword(password, salt) {
        let hash = salt + password;
        for (let i = 0; i < 1000; i++) {
            hash = this.simpleHash(hash + salt);
        }
        return hash;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        let hex = Math.abs(hash).toString(16);
        while (hex.length < 8) {
            hex = '0' + hex;
        }
        return hex;
    }

    generateToken(username) {
        const data = {
            username: username,
            timestamp: Date.now(),
            random: Math.random().toString(36).substring(2)
        };
        return btoa(JSON.stringify(data));
    }

    validateToken(token, username) {
        try {
            const data = JSON.parse(atob(token));
            const maxAge = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - data.timestamp > maxAge) {
                return false;
            }
            return data.username === username;
        } catch (e) {
            return false;
        }
    }

    // Storage metodusok
    getUsers() {
        const users = localStorage.getItem(this.usersKey);
        return users ? JSON.parse(users) : [];
    }

    saveUsers(users) {
        localStorage.setItem(this.usersKey, JSON.stringify(users));
    }

    setupUserData(username) {
        // Ugyanazt a hash-t használjuk mint a grade-tracker.js (toString(36))
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            const char = username.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const hashStr = Math.abs(hash).toString(36);
        const prefix = 'studyhub_' + hashStr + '_';
        localStorage.setItem('studyhub_userdata_prefix', prefix);
        console.log('📁 User prefix beállítva:', prefix);
    }

    getUserDataKey(key) {
        const prefix = localStorage.getItem('studyhub_userdata_prefix');
        return prefix ? prefix + key : key;
    }

    createUserDataFolder(username) {
        console.log('📁 Felhasznaloi mappa:', username);
    }

    clearUserData(username) {
        const prefix = 'studyhub_' + this.simpleHash(username) + '_';
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Telemetria
    logAuthAttempt(username, success, reason) {
        const logs = JSON.parse(localStorage.getItem('studyhub_auth_logs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            username: username,
            success: success,
            reason: reason,
            userAgent: navigator.userAgent
        });
        if (logs.length > 100) logs.splice(0, logs.length - 100);
        localStorage.setItem('studyhub_auth_logs', JSON.stringify(logs));
        this.sendTelemetry({ type: 'auth_attempt', data: { username, success, reason } });
    }

    async sendTelemetry(data) {
        try {
            await fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userAgent: navigator.userAgent
                })
            });
        } catch (e) {}
    }

    logError(error, context) {
        const logs = JSON.parse(localStorage.getItem('studyhub_error_logs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            error: error.toString(),
            context: context,
            url: window.location.href
        });
        if (logs.length > 50) logs.splice(0, logs.length - 50);
        localStorage.setItem('studyhub_error_logs', JSON.stringify(logs));
        this.sendTelemetry({ type: 'error', data: { error: error.toString(), context } });
    }

    logPageView(page) {
        this.sendTelemetry({ type: 'page_view', data: { page } });
    }
}

class UserStorage {
    constructor(authManager) {
        this.auth = authManager;
    }

    setItem(key, value) {
        const fullKey = this.auth.getUserDataKey(key);
        localStorage.setItem(fullKey, JSON.stringify(value));
    }

    getItem(key) {
        const fullKey = this.auth.getUserDataKey(key);
        const data = localStorage.getItem(fullKey);
        return data ? JSON.parse(data) : null;
    }

    removeItem(key) {
        const fullKey = this.auth.getUserDataKey(key);
        localStorage.removeItem(fullKey);
    }

    hasItem(key) {
        const fullKey = this.auth.getUserDataKey(key);
        return localStorage.getItem(fullKey) !== null;
    }
}

window.authManager = new AuthManager();
window.userStorage = new UserStorage(window.authManager);

window.addEventListener('error', function(event) {
    if (window.authManager && window.authManager.isLoggedIn()) {
        window.authManager.logError(event.error || event.message, event.filename);
    }
});

window.addEventListener('unhandledrejection', function(event) {
    if (window.authManager && window.authManager.isLoggedIn()) {
        window.authManager.logError(event.reason, 'unhandled_promise');
    }
});

console.log('🔐 AuthManager betoltve');

