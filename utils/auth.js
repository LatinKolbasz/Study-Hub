/**
 * AuthManager - Eltávolítva a bejelentkezési rendszer
 * Minden oldal nyitott, bejelentkezés nélkül elérhető
 */

class AuthManager {
    constructor() {
        this.currentUser = { id: 1, username: 'guest', role: 'user' };
        this.init();
    }

    init() {
        console.log('🔓 Bejelentkezési rendszer eltávolítva - minden oldal elérhető');
    }

    register(username, password, email = '') {
        return { success: true, message: 'Regisztráció nem szükséges' };
    }

    login(username, password) {
        return { success: true, message: 'Bejelentkezés nem szükséges' };
    }

    logout() {
        // Nem csinál semmit
    }

    isLoggedIn() {
        return true;
    }

    getUser() {
        return { id: 1, username: 'guest', role: 'user' };
    }

    getUsersList() {
        return [];
    }

    getUserDataKey(key) {
        return key;
    }

    logPageView(page) {
        // Nincs telemetria
    }

    logError(error, context) {
        // Nincs hibanaplózás
    }
}

class UserStorage {
    constructor(authManager) {
        this.auth = authManager;
    }

    setItem(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    getItem(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    removeItem(key) {
        localStorage.removeItem(key);
    }

    hasItem(key) {
        return localStorage.getItem(key) !== null;
    }
}

window.authManager = new AuthManager();
window.userStorage = new UserStorage(window.authManager);

console.log('🔓 AuthManager betoltve - login nelkul');

