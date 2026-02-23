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
            return;
        }

        // Felhasználó prefix beállítása
        this.setUserPrefix();
        
        await this.loadAssignments();
        console.log(`✅ ${this.assignments.length} beadandó betöltve`);
        this.setupEventListeners();
        this.renderAssignments();

        // Telemetria
        if (window.authManager && window.authManager.logPageView) {
            window.authManager.logPageView('assignments');
        }
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
     * Beadandók betöltése
     */
    async loadAssignments() {
        // Konzisztens kulcsnév: userPrefix már tartalmazza az 'assignments'-t
        const saved = localStorage.getItem(this.userPrefix);
        this.assignments = saved ? JSON.parse(saved) : [];
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

        // Szerver mentés (ha elérhető)
        try {
            const response = await fetch('/api/save-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    assignments: this.assignments,
                    username: window.authManager?.currentUser?.username
                })
            });

            if (response.ok) {
                console.log('✅ Szerver mentve');
            }
        } catch (error) {
            console.warn('⚠️ Szerver nem érhető el, csak localStorage');
        }
    }
}

// Inicializáció
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM ready - AssignmentManager indítása...');
    const assignmentManager = new AssignmentManager();
    assignmentManager.init();
});

