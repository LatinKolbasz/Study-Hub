/**
 * AuthManager - Bejelentkezes es Regisztracio Firebase-el
 */

// Wait for Firebase to be available before creating AuthManager
function waitForFirebase(callback) {
    let retries = 0;
    const maxRetries = 50; // 50 * 100ms = 5 seconds max wait
    
    const check = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            clearInterval(check);
            callback();
        } else if (retries >= maxRetries) {
            clearInterval(check);
            console.error('❌ Firebase not available after waiting');
            callback(); // Call anyway to at least try
        }
        retries++;
    }, 100);
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.tokenKey = 'studyhub_token';
        this.userKey = 'studyhub_user';
        this.usersKey = 'studyhub_users';
        this.authInitialized = false;
        this.authStateReady = false;
        this.pendingCheck = null;
        
        // Wait for Firebase to be ready before initializing
        waitForFirebase(() => {
            this.initFirebaseAuth();
        });
    }

    initFirebaseAuth() {
        if (this.authInitialized) return;
        
        const self = this;
        
        // Firebase Auth state listener
        firebase.auth().onAuthStateChanged(function(user) {
            console.log('🔄 Auth state changed:', user ? user.email : 'none');
            
            if (user) {
                // Felhasználó bejelentkezve
                self.currentUser = {
                    id: user.uid,
                    username: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified
                };
                
                // Mentés localStorage-ba is
                localStorage.setItem(self.tokenKey, user.uid);
                localStorage.setItem(self.userKey, JSON.stringify(self.currentUser));
                
                console.log('✅ Firebase felhasznalo bejelentkezve:', user.email);
                
            } else {
                // Nincs bejelentkezve
                self.currentUser = null;
                localStorage.removeItem(self.tokenKey);
                localStorage.removeItem(self.userKey);
                
                console.log('❌ Nincs bejelentkezve');
            }
            
            self.authStateReady = true;
            self.authInitialized = true;
            
            // Ha van függőben lévő check, hívjuk meg
            if (self.pendingCheck) {
                self.pendingCheck();
                self.pendingCheck = null;
            }
        });
    }

    // Várakozás az auth állapotra
    whenAuthReady(callback) {
        if (this.authStateReady) {
            callback();
        } else {
            this.pendingCheck = callback;
            // Timeout - 3 másodperc múlva meghívjuk ha nem jött state change
            setTimeout(() => {
                if (this.pendingCheck) {
                    this.pendingCheck();
                    this.pendingCheck = null;
                }
            }, 3000);
        }
    }

    async register(email, password, displayName = '') {
        try {
            if (!email || !password) {
                return { success: false, message: '❌ Email és jelszó szükséges!' };
            }
            
            if (password.length < 6) {
                return { success: false, message: '❌ A jelszónak legalább 6 karakter kell!' };
            }

            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            
            if (displayName) {
                await userCredential.user.updateProfile({
                    displayName: displayName
                });
            }
            
            await userCredential.user.sendEmailVerification();
            
            console.log('✅ Regisztráció sikeres:', userCredential.user.email);
            
            return { 
                success: true, 
                message: '✅ Fiók létrehozva! Email megerősítés elküldve.',
                user: {
                    id: userCredential.user.uid,
                    email: userCredential.user.email,
                    displayName: displayName || email.split('@')[0]
                }
            };
            
        } catch (error) {
            console.error('❌ Regisztráció hiba:', error);
            return { 
                success: false, 
                message: this.getErrorMessage(error.code)
            };
        }
    }

    async login(email, password) {
        try {
            if (!email || !password) {
                return { success: false, message: '❌ Email és jelszó szükséges!' };
            }

            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            
            console.log('✅ Bejelentkezés sikeres:', userCredential.user.email);
            
            return { 
                success: true, 
                message: '✅ Sikeres bejelentkezés!',
                user: {
                    id: userCredential.user.uid,
                    email: userCredential.user.email,
                    displayName: userCredential.user.displayName || email.split('@')[0]
                }
            };
            
        } catch (error) {
            console.error('❌ Bejelentkezés hiba:', error);
            return { 
                success: false, 
                message: this.getErrorMessage(error.code)
            };
        }
    }

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            
            console.log('✅ Google bejelentkezés sikeres:', result.user.email);
            
            return { 
                success: true, 
                message: '✅ Sikeres bejelentkezés!',
                user: {
                    id: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName
                }
            };
            
        } catch (error) {
            console.error('❌ Google bejelentkezés hiba:', error);
            return { 
                success: false, 
                message: this.getErrorMessage(error.code)
            };
        }
    }

    async logout() {
        try {
            await firebase.auth().signOut();
            
            // Tisztítás
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
            localStorage.removeItem('studyhub_userdata_prefix');
            
            console.log('✅ Kijelentkezés sikeres');
            
            return { success: true, message: '✅ Kijelentkezés sikeres!' };
        } catch (error) {
            console.error('❌ Kijelentkezés hiba:', error);
            return { success: false, message: '❌ Hiba történt kijelentkezéskor!' };
        }
    }

    isLoggedIn() {
        // Ellenőrizzük a Firebase auth állapotot
        if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
            return true;
        }
        
        // Nincs bejelentkezve
        return false;
    }

    getUser() {
        // Próbáljuk meg a Firebase user-t
        if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
            const user = firebase.auth().currentUser;
            return {
                id: user.uid,
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified
            };
        }
        
        // Backup a localStorage-ból
        if (this.currentUser) {
            return this.currentUser;
        }
        
        const userData = localStorage.getItem(this.userKey);
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                return null;
            }
        }
        
        return null;
    }

    // Error message fordítás
    getErrorMessage(errorCode) {
        const messages = {
            'auth/email-already-in-use': '❌ Ez az email már regisztrálva van!',
            'auth/invalid-email': '❌ Érvénytelen email cím!',
            'auth/operation-not-allowed': '❌ Ez a művelet nincs engedélyezve!',
            'auth/weak-password': '❌ Túl gyenge jelszó!',
            'auth/user-disabled': '❌ Ez a fiók le van tiltva!',
            'auth/user-not-found': '❌ Nincs ilyen felhasználó!',
            'auth/wrong-password': '❌ Hibás jelszó!',
            'auth/invalid-credential': '❌ Hibás email vagy jelszó!',
            'auth/invalid-api-key': '❌ Érvénytelen API kulcs!',
            'auth/network-request-failed': '❌ Hálózati hiba!',
            'auth/too-many-requests': '❌ Túl sok próbálkozás!',
            'auth/popup-closed-by-user': '❌ A popup bezárult!',
            'auth/cancelled-popup-request': '❌ A popup megszakadt!'
        };
        
        return messages[errorCode] || '❌ Hiba történt: ' + errorCode;
    }

    // Legacy methods - backward compatibility
    generateSalt() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let salt = '';
        for (let i = 0; i < 16; i++) {
            salt += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return salt;
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

    setupUserData(username) {
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

// AuthManager és UserStorage létrehozása
window.authManager = new AuthManager();
window.userStorage = new UserStorage(window.authManager);

// Error handling
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

console.log('🔐 AuthManager (Firebase) betoltve');
