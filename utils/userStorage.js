/**
 * ============================================
 * UserStorage - Felhasználó Elkülönített Tárolás
 * ============================================
 * Minden felhasználónak külön adatai vannak
 * Integrálva az AuthManager-rel
 */

class UserDataManager {
    constructor() {
        this.auth = window.authManager;
        this.dataPrefix = 'studyhub_';
        this.isReady = false;
    }

    /**
     * Inicializálás
     */
    init() {
        if (!this.auth || !this.auth.isLoggedIn()) {
            console.warn('⚠️ Nincs bejelentkezve, az adatok nem lesznek elkülönítve!');
            return;
        }

        this.setupUserStorage();
        this.isReady = true;
        console.log('✅ UserDataManager inicializálva');
    }

    /**
     * Felhasználó storage beállítása
     */
    setupUserStorage() {
        if (this.auth && this.auth.currentUser) {
            const username = this.auth.currentUser.username;
            const hash = this.simpleHash(username);
            const prefix = `studyhub_${hash}_`;
            
            localStorage.setItem('studyhub_userdata_prefix', prefix);
            this.prefix = prefix;
            
            console.log('📁 Felhasználói prefix:', prefix);
        }
    }

    /**
     * Teljes kulcs összeállítása
     */
    getFullKey(key) {
        if (this.prefix) {
            return this.prefix + key;
        }
        return key;
    }

    /**
     * Adat mentése
     */
    save(key, data) {
        const fullKey = this.getFullKey(key);
        
        try {
            localStorage.setItem(fullKey, JSON.stringify(data));
            console.log('💾 Mentve:', fullKey);
            return true;
        } catch (e) {
            console.error('❌ Mentési hiba:', e);
            // Próbáljuk törölni a régi adatokat, ha tele van
            this.cleanupOldData();
            try {
                localStorage.setItem(fullKey, JSON.stringify(data));
                return true;
            } catch (e2) {
                console.error('❌ Újra mentési hiba:', e2);
                return false;
            }
        }
    }

    /**
     * Adat betöltése
     */
    load(key, defaultValue = null) {
        const fullKey = this.getFullKey(key);
        
        try {
            const data = localStorage.getItem(fullKey);
            // Handle empty string or null
            if (!data || data.trim() === '') {
                return defaultValue;
            }
            return JSON.parse(data);
        } catch (e) {
            console.error('❌ Betöltési hiba:', e);
            return defaultValue;
        }
    }

    /**
     * Adat törlése
     */
    remove(key) {
        const fullKey = this.getFullKey(key);
        localStorage.removeItem(fullKey);
    }

    /**
     * Ellenőrzés, hogy létezik-e
     */
    has(key) {
        const fullKey = this.getFullKey(key);
        return localStorage.getItem(fullKey) !== null;
    }

    /**
     * Egyszerű hash
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Régi adatok tisztítása (ha tele van a storage)
     */
    cleanupOldData() {
        // Töröljük a teszt és ideiglenes adatokat
        const keysToRemove = ['test', 'temp', 'cache'];
        
        keysToRemove.forEach(key => {
            const fullKey = this.getFullKey(key);
            localStorage.removeItem(fullKey);
        });
        
        console.log('🧹 Tisztítás kész');
    }

    /**
     * Összes felhasználói adat törlése
     */
    clearAll() {
        if (!this.prefix) return;
        
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('🗑️ Összes felhasználói adat törölve');
    }

    /**
     * Exportálás (JSON)
     */
    exportAll() {
        const data = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                const cleanKey = key.replace(this.prefix, '');
                try {
                    data[cleanKey] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    data[cleanKey] = localStorage.getItem(key);
                }
            }
        }
        
        return data;
    }

    /**
     * Importálás (JSON)
     */
    importAll(data) {
        if (!data || typeof data !== 'object') {
            console.error('❌ Érvénytelen adat formátum');
            return false;
        }
        
        for (const [key, value] of Object.entries(data)) {
            this.save(key, value);
        }
        
        console.log('✅ Adatok importálva');
        return true;
    }
}

// ==================== DATA MANAGER PÉLDÁNYOK ====================

// Minden oldalnak saját data manager kell
// Használat:
// const dataManager = new UserDataManager();
// dataManager.init();
// dataManager.save('grades', [...]);
// const grades = dataManager.load('grades', []);

console.log('📦 UserDataManager betöltve');

