class AssignmentManager {
    constructor() {
        this.assignments = [];
        this.userPrefix = 'assignments'; // Alapértelmezett, felülírásra kerül
        console.log('✅ AssignmentManager inicializálva');
    }

    /**
     * Inicializáció
     */
    async init() {
        console.log('📥 Beadandók betöltése...');
        
        // Bejelentkezés ellenőrzése
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            return;
        }

        // Felhasználó prefix beállítása
        this.setUserPrefix();
        
        await this.loadAssignments();
        console.log(`✅ ${this.assignments.length} beadandó betöltve`);
        this.setupEventListeners();
        this.renderAssignments();

        // Firestore betöltés csak ha az auth teljesen kész
        this.waitForAuthAndLoadCloud();

        // Telemetria
        if (window.authManager && window.authManager.logPageView) {
            window.authManager.logPageView('assignments');
        }
    }

    waitForAuthAndLoadCloud() {
        const self = this;
        const checkAuth = setInterval(() => {
            try {
                const user = firebase.auth().currentUser;
                if (user) {
                    clearInterval(checkAuth);
                    console.log('🔑 Firebase user kész, felhő betöltés...');
                    self.loadFromFirestore().then(() => {
                        self.renderAssignments();
                    });
                }
            } catch(e) {}
        }, 500);
        setTimeout(() => clearInterval(checkAuth), 10000);
    }

    /**
     * Felhasználó prefix beállítása
     */
    setUserPrefix() {
        if (window.authManager && window.authManager.currentUser) {
            const username = window.authManager.currentUser.username;
            const hash = this.simpleHash(username);
            this.userPrefix = `studyhub_${hash}_assignments`;
            console.log('📁 Felhasználói prefix:', this.userPrefix);
        } else {
            this.userPrefix = 'assignments';
        }
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
     * Beadandók betöltése (localStorage)
     */
    async loadAssignments() {
        const saved = localStorage.getItem(this.userPrefix);
        this.assignments = saved ? JSON.parse(saved) : [];
    }

    // ==================== FIRESTORE AUTO-SYNC ====================

    getFirestoreDb() {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            return firebase.firestore();
        }
        return null;
    }

    getFirebaseUserId() {
        try {
            const user = firebase.auth().currentUser;
            return user ? user.uid : null;
        } catch (e) {
            return null;
        }
    }

    syncToFirestore() {
        const db = this.getFirestoreDb();
        const uid = this.getFirebaseUserId();
        if (!db || !uid) return;

        db.collection('assignments').doc(uid).set({
            assignments: this.assignments,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            userEmail: firebase.auth().currentUser.email || ''
        }).then(() => {
            console.log('☁️ Beadandók szinkronizálva a felhőbe');
        }).catch(error => {
            console.warn('⚠️ Firestore sync hiba:', error.message);
        });
    }

    async loadFromFirestore() {
        const db = this.getFirestoreDb();
        const uid = this.getFirebaseUserId();
        if (!db || !uid) return;

        try {
            const doc = await db.collection('assignments').doc(uid).get();
            if (!doc.exists) {
                console.log('📭 Nincs mentett beadandó a felhőben');
                return;
            }

            const cloudData = doc.data();
            if (!cloudData.assignments || !Array.isArray(cloudData.assignments)) return;

            this.assignments = cloudData.assignments;
            localStorage.setItem(this.userPrefix, JSON.stringify(this.assignments));
            console.log('☁️ Beadandók betöltve a felhőből');
        } catch (error) {
            console.warn('⚠️ Firestore betöltés hiba:', error.message);
        }
    }

    setupEventListeners() {
        const form = document.getElementById('assignment-form');
        const filterBtns = document.querySelectorAll('.filter-btn');

        if (!form) {
            console.error('❌ Form nem található!');
            return;
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('📝 Új beadandó hozzáadása...');
            this.addAssignment();
        });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderAssignments();
            });
        });

        console.log('✅ Event listenersek beállítva');
    }

    addAssignment() {
        const name = document.getElementById('task-name')?.value.trim();
        const description = document.getElementById('task-description')?.value.trim();
        const dueDate = document.getElementById('due-date')?.value;
        const priority = document.getElementById('priority')?.value;

        if (!name || !dueDate) {
            alert('❌ Töltsd ki a kötelező mezőket!');
            return;
        }

        const assignment = {
            id: Date.now(),
            name,
            description,
            dueDate,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        console.log('➕ Beadandó hozzáadva:', assignment);

        this.assignments.push(assignment);
        this.saveAssignments();
        this.renderAssignments();
        this.clearForm();
        this.showNotification('✅ Beadandó hozzáadva!');
    }

    toggleAssignment(id) {
        const assignment = this.assignments.find(a => a.id === id);
        if (assignment) {
            assignment.completed = !assignment.completed;
            console.log('✓ Beadandó status:', assignment.completed ? 'kész' : 'aktív');
            this.saveAssignments();
            this.renderAssignments();
        }
    }

    deleteAssignment(id) {
        if (confirm('Biztosan törölni szeretnéd?')) {
            this.assignments = this.assignments.filter(a => a.id !== id);
            this.saveAssignments();
            this.renderAssignments();
            this.showNotification('🗑️ Beadandó törölve!');
        }
    }

    getFilteredAssignments() {
        const activeBtn = document.querySelector('.filter-btn.active');
        const filter = activeBtn?.dataset.filter || 'all';

        if (filter === 'completed') {
            return this.assignments.filter(a => a.completed);
        } else if (filter === 'pending') {
            return this.assignments.filter(a => !a.completed);
        }
        return this.assignments;
    }

    renderAssignments() {
        const list = document.getElementById('assignment-list');
        if (!list) {
            console.error('❌ assignment-list nem található!');
            return;
        }

        const filtered = this.getFilteredAssignments();
        list.innerHTML = '';

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-message"><p>📭 Nincs beadandó</p></div>';
            return;
        }

        filtered.forEach(assignment => {
            const item = document.createElement('div');
            item.className = `assignment-item priority-${assignment.priority}`;
            if (assignment.completed) {
                item.classList.add('completed');
            }

            const dueDate = new Date(assignment.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isOverdue = dueDate < today && !assignment.completed;

            const dateStr = dueDate.toLocaleDateString('hu-HU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            item.innerHTML = `
                <div class="assignment-header">
                    <div class="checkbox-container">
                        <input type="checkbox" class="checkbox-custom" ${assignment.completed ? 'checked' : ''}>
                    </div>
                    <div class="task-info">
                        <h3 class="task-name">${this.escapeHtml(assignment.name)}</h3>
                        ${assignment.description ? `<p class="task-description">${this.escapeHtml(assignment.description)}</p>` : ''}
                    </div>
                </div>

                <div class="task-meta">
                    <span class="priority-badge ${assignment.priority}">
                        ${this.getPriorityLabel(assignment.priority)}
                    </span>
                    <span class="due-date ${isOverdue ? 'overdue' : ''}">
                        📅 ${dateStr}
                    </span>
                </div>

                <div class="task-actions">
                    <button class="btn-delete" title="Törlés">🗑️</button>
                </div>
            `;

            // Checkbox event
            item.querySelector('.checkbox-custom').addEventListener('change', () => {
                this.toggleAssignment(assignment.id);
            });

            // Delete button
            item.querySelector('.btn-delete').addEventListener('click', () => {
                this.deleteAssignment(assignment.id);
            });

            list.appendChild(item);
        });
    }

    getPriorityLabel(priority) {
        const labels = {
            'high': '🔴 Magas',
            'medium': '🟡 Közepes',
            'low': '🟢 Alacsony'
        };
        return labels[priority] || priority;
    }

    clearForm() {
        const form = document.getElementById('assignment-form');
        if (form) form.reset();
    }

    showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.remove(), 3000);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Beadandók mentése (localStorage + opcionális szerver)
     */
    async saveAssignments() {
        console.log('💾 Beadandók mentése...');

        // LocalStorage felhasználó-specifikusan
        localStorage.setItem(this.userPrefix, JSON.stringify(this.assignments));
        console.log('✅ LocalStorage mentve:', this.userPrefix);

        // Automatikus Firestore sync
        this.syncToFirestore();
    }
}

// Inicializáció
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM ready - AssignmentManager indítása...');
    const assignmentManager = new AssignmentManager();
    assignmentManager.init();
});

