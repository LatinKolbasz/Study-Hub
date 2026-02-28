/**
 * ============================================
 * Schedule - Órarend Kezelő
 * ============================================
 * Interaktív órarend kezelés hétfő-péntek
 * Minden órához tárgy és hozzászólások
 */

class ScheduleManager {
    constructor() {
        this.days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
        this.hours = [1, 2, 3, 4, 5, 6, 7];
        this.hourLabels = [
            '1. óra\n(7:30-8:15)',
            '2. óra\n(8:20-9:05)',
            '3. óra\n(9:10-9:55)',
            '4. óra\n(10:10-10:55)',
            '5. óra\n(11:00-11:45)',
            '6. óra\n(11:50-12:35)',
            '7. óra\n(12:40-13:25)'
        ];
        
        this.data = {
            schedule: {}
        };
        
        this.userPrefix = 'schedule';
        this.currentEditCell = null;
        
        // Alapértelmezett színek tantárgyakhoz
        this.subjectColors = {};
        
        this.init();
    }

    init() {
        console.log('📅 Schedule Manager inicializálása...');
        
        const self = this;
        this._initialized = false;

        // Ha már be van jelentkezve (ritka, de lehetséges)
        if (window.authManager && window.authManager.isLoggedIn()) {
            this._doFullInit();
            return;
        }

        // Firebase auth state listener - megvárjuk, amíg az auth kész
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user && !self._initialized) {
                    self._doFullInit(user);
                }
            });
        }
    }

    _doFullInit(firebaseUser) {
        if (this._initialized) return;
        this._initialized = true;

        // User prefix beállítása
        if (window.authManager && window.authManager.currentUser) {
            this.setUserPrefix();
        } else if (firebaseUser) {
            // Ha authManager még nem processzálta a user-t, közvetlenül a Firebase user-ből állítjuk
            const username = firebaseUser.displayName || firebaseUser.email.split('@')[0];
            const hash = this.simpleHash(username);
            this.userPrefix = `studyhub_${hash}_schedule`;
            console.log('📁 Felhasználói prefix (Firebase-ből):', this.userPrefix);
        }

        this.loadData();
        this.renderSchedule();

        // Firestore betöltés - auth már biztosan kész
        this.loadFromFirestore();

        // Telemetria
        if (window.authManager && window.authManager.logPageView) {
            window.authManager.logPageView('schedule');
        }
    }

    setUserPrefix() {
        if (window.authManager && window.authManager.currentUser) {
            const username = window.authManager.currentUser.username;
            const hash = this.simpleHash(username);
            this.userPrefix = `studyhub_${hash}_schedule`;
            console.log('📁 Felhasználói prefix:', this.userPrefix);
        }
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    loadData() {
        const saved = localStorage.getItem(this.userPrefix);
        if (saved) {
            this.data = JSON.parse(saved);
            console.log('✅ Órarend betöltve');
        } else {
            console.log('📭 Nincs mentett órarend');
        }
    }

    saveData() {
        localStorage.setItem(this.userPrefix, JSON.stringify(this.data));
        this.syncToFirestore(); // Automatikus felhő mentés
    }

    getCellKey(day, hour) {
        return `${day}_${hour}`;
    }

    getCellData(day, hour) {
        const key = this.getCellKey(day, hour);
        return this.data.schedule[key] || { subject: '', comments: [] };
    }

    setCellData(day, hour, data) {
        const key = this.getCellKey(day, hour);
        this.data.schedule[key] = data;
        this.saveData();
    }

    getSubjectColor(subject) {
        if (!subject) return '';
        
        if (!this.subjectColors[subject]) {
            const colorIndex = Object.keys(this.subjectColors).length % 10 + 1;
            this.subjectColors[subject] = colorIndex;
        }
        
        return `subject-color-${this.subjectColors[subject]}`;
    }

    renderSchedule() {
        const grid = document.getElementById('scheduleGrid');
        if (!grid) return;

        // Header sort rendel
        let html = '<div class="schedule-header time-header">Idő</div>';
        this.days.forEach(day => {
            html += `<div class="schedule-header">${day}</div>`;
        });

        // Órák sorai
        this.hours.forEach(hour => {
            // Időpont cella
            html += `<div class="schedule-cell time-cell">
                <span class="time-label">${hour}. óra</span>
            </div>`;
            
            // Nap cellák
            this.days.forEach(day => {
                const cellData = this.getCellData(day, hour);
                const hasSubject = cellData.subject && cellData.subject.trim() !== '';
                const commentCount = cellData.comments ? cellData.comments.length : 0;
                const colorClass = hasSubject ? this.getSubjectColor(cellData.subject) : '';
                
                html += `
                    <div class="schedule-cell ${hasSubject ? 'has-subject ' + colorClass : 'empty-cell'}" 
                        onclick="scheduleManager.openCellModal('${day}', ${hour})">
                        ${hasSubject ? `
                            <span class="subject-name">${this.escapeHtml(cellData.subject)}</span>
                            ${commentCount > 0 ? `<span class="comment-badge">💬 ${commentCount}</span>` : ''}
                        ` : ''}
                    </div>
                `;
            });
        });

        grid.innerHTML = html;
    }

    openCellModal(day, hour) {
        this.currentEditCell = { day, hour };
        const cellData = this.getCellData(day, hour);
        
        // Modal címe
        document.getElementById('scheduleModalTitle').textContent = 
            `${day} - ${hour}. óra`;
        
        // Űrlap mezők
        document.getElementById('subjectInput').value = cellData.subject || '';
        
        // Meglévő tantárgyak listája
        this.populateSubjectDatalist();
        
        // Hozzászólások
        this.renderComments(cellData.comments || []);
        
        // Modal megjelenítése
        document.getElementById('scheduleModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('scheduleModal').classList.remove('active');
        this.currentEditCell = null;
    }

    populateSubjectDatalist() {
        // Összes tantárgy összegyűjtése
        const subjects = new Set();
        Object.values(this.data.schedule).forEach(cell => {
            if (cell.subject && cell.subject.trim()) {
                subjects.add(cell.subject);
            }
        });
        
        const datalist = document.getElementById('subjectsList');
        datalist.innerHTML = Array.from(subjects).map(s => 
            `<option value="${this.escapeHtml(s)}">`
        ).join('');
    }

    saveCell() {
        if (!this.currentEditCell) return;
        
        const subject = document.getElementById('subjectInput').value.trim();
        const cellData = this.getCellData(this.currentEditCell.day, this.currentEditCell.hour);
        
        // Megtartjuk a meglévő hozzászólásokat
        this.setCellData(
            this.currentEditCell.day, 
            this.currentEditCell.hour,
            {
                subject: subject,
                comments: cellData.comments || []
            }
        );
        
        this.renderSchedule();
        this.closeModal();
        
        this.showNotification(subject ? `✅ ${subject} mentve` : '🗑️ Óra törölve');
    }

    deleteCell() {
        if (!this.currentEditCell) return;
        
        if (confirm('Biztosan törlöd ezt az órát?')) {
            const key = this.getCellKey(this.currentEditCell.day, this.currentEditCell.hour);
            delete this.data.schedule[key];
            this.saveData();
            this.renderSchedule();
            this.closeModal();
            this.showNotification('🗑️ Óra törölve');
        }
    }

    // ==================== COMMENT SYSTEM ====================

    renderComments(comments) {
        const container = document.getElementById('commentsList');
        
        if (!comments || comments.length === 0) {
            container.innerHTML = '<p class="no-comments">Még nincs hozzászólás</p>';
            return;
        }

        container.innerHTML = comments.map((comment, index) => `
            <div class="comment-item">
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                <div class="comment-date">${this.formatDate(comment.date)}</div>
                <button class="comment-delete" onclick="scheduleManager.deleteComment(${index})" title="Törlés">🗑️</button>
            </div>
        `).join('');
    }

    addComment() {
        if (!this.currentEditCell) return;
        
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        
        if (!text) {
            this.showNotification('❌ Írj valamit a hozzászólásba!');
            return;
        }

        const cellData = this.getCellData(this.currentEditCell.day, this.currentEditCell.hour);
        const comments = cellData.comments || [];
        
        comments.push({
            text: text,
            date: new Date().toISOString()
        });

        this.setCellData(
            this.currentEditCell.day,
            this.currentEditCell.hour,
            {
                subject: cellData.subject,
                comments: comments
            }
        );

        input.value = '';
        this.renderComments(comments);
        this.renderSchedule(); // Frissítjük a comment badge-et
        
        this.showNotification('💬 Hozzászólás hozzáadva');
    }

    deleteComment(index) {
        if (!this.currentEditCell) return;
        
        const cellData = this.getCellData(this.currentEditCell.day, this.currentEditCell.hour);
        const comments = cellData.comments || [];
        
        comments.splice(index, 1);
        
        this.setCellData(
            this.currentEditCell.day,
            this.currentEditCell.hour,
            {
                subject: cellData.subject,
                comments: comments
            }
        );

        this.renderComments(comments);
        this.renderSchedule();
        
        this.showNotification('🗑️ Hozzászólás törölve');
    }

    // ==================== IMPORT/EXPORT ====================

    openImportExportModal() {
        document.getElementById('importExportModal').classList.add('active');
        
        // Export adatok megjelenítése
        const exportArea = document.getElementById('exportData');
        exportArea.value = JSON.stringify(this.data.schedule, null, 2);
    }

    closeImportExportModal() {
        document.getElementById('importExportModal').classList.remove('active');
    }

    importData() {
        const importArea = document.getElementById('importData');
        const jsonStr = importArea.value.trim();
        
        if (!jsonStr) {
            this.showNotification('❌ Nincs mit importálni!');
            return;
        }
        
        try {
            const importedData = JSON.parse(jsonStr);
            
            if (confirm(`Biztosan importálod az adatokat? Ez felülírja a meglévő órarendet.`)) {
                this.data.schedule = importedData;
                this.saveData();
                this.renderSchedule();
                this.closeImportExportModal();
                this.showNotification('✅ Órarend importálva!');
            }
        } catch (e) {
            this.showNotification('❌ Érvénytelen JSON formátum!');
        }
    }

    exportData() {
        const exportArea = document.getElementById('exportData');
        exportArea.select();
        document.execCommand('copy');
        this.showNotification('📋 Másolva a vágólapra!');
    }

    // ==================== RESET ====================

    resetAll() {
        if (confirm('Biztosan törlöd az egész órarendet? Ez nem vonható vissza!')) {
            this.data.schedule = {};
            this.saveData();
            this.renderSchedule();
            this.showNotification('🔄 Órarend törölve');
        }
    }

    // ==================== FILE UPLOAD ====================

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data && typeof data === 'object') {
                    if (confirm('Biztosan betöltöd ezt a fájlt? Ez felülírja a meglévő órarendet.')) {
                        this.data.schedule = data;
                        this.saveData();
                        this.renderSchedule();
                        this.showNotification('✅ Órarend betöltve!');
                    }
                } else {
                    this.showNotification('❌ Érvénytelen fájl formátum!');
                }
            } catch (err) {
                console.error('JSON parse error:', err);
                this.showNotification('❌ Érvénytelen JSON formátum!');
            }
        };
        reader.onerror = () => {
            this.showNotification('❌ Hiba a fájl olvasásakor!');
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }

    // ==================== TEMPLATES ====================

    loadTemplate(templateType) {
        const templates = {
            'empty': {},
            
            'gimnazium': {
                'Hétfő_1': { subject: 'Matematika', comments: [] },
                'Hétfő_2': { subject: 'Matematika', comments: [] },
                'Hétfő_3': { subject: 'Irodalom', comments: [] },
                'Hétfő_4': { subject: 'Irodalom', comments: [] },
                'Hétfő_5': { subject: 'Történelem', comments: [] },
                'Hétfő_6': { subject: 'Idegen nyelv', comments: [] },
                'Hétfő_7': { subject: 'Testnevelés', comments: [] },
                'Kedd_1': { subject: 'Fizika', comments: [] },
                'Kedd_2': { subject: 'Fizika', comments: [] },
                'Kedd_3': { subject: 'Matematika', comments: [] },
                'Kedd_4': { subject: 'Matematika', comments: [] },
                'Kedd_5': { subject: 'Irodalom', comments: [] },
                'Kedd_6': { subject: 'Biosz', comments: [] },
                'Kedd_7': { subject: 'Művészet', comments: [] },
                'Szerda_1': { subject: 'Kémia', comments: [] },
                'Szerda_2': { subject: 'Kémia', comments: [] },
                'Szerda_3': { subject: 'Matematika', comments: [] },
                'Szerda_4': { subject: 'Történelem', comments: [] },
                'Szerda_5': { subject: 'Idegen nyelv', comments: [] },
                'Szerda_6': { subject: 'Informatika', comments: [] },
                'Szerda_7': { subject: 'Testnevelés', comments: [] },
                'Csütörtök_1': { subject: 'Matematika', comments: [] },
                'Csütörtök_2': { subject: 'Fizika', comments: [] },
                'Csütörtök_3': { subject: 'Irodalom', comments: [] },
                'Csütörtök_4': { subject: 'Biosz', comments: [] },
                'Csütörtök_5': { subject: 'Földrajz', comments: [] },
                'Csütörtök_6': { subject: 'Idegen nyelv', comments: [] },
                'Csütörtök_7': { subject: 'Osztályfőnöki', comments: [] },
                'Péntek_1': { subject: 'Irodalom', comments: [] },
                'Péntek_2': { subject: 'Matematika', comments: [] },
                'Péntek_3': { subject: 'Történelem', comments: [] },
                'Péntek_4': { subject: 'Fizika', comments: [] },
                'Péntek_5': { subject: 'Testnevelés', comments: [] },
                'Péntek_6': { subject: '', comments: [] },
                'Péntek_7': { subject: '', comments: [] }
            },
            
            'szakgimnazium': {
                'Hétfő_1': { subject: 'Szakmai tárgy', comments: [] },
                'Hétfő_2': { subject: 'Szakmai tárgy', comments: [] },
                'Hétfő_3': { subject: 'Matematika', comments: [] },
                'Hétfő_4': { subject: 'Irodalom', comments: [] },
                'Hétfő_5': { subject: 'Történelem', comments: [] },
                'Hétfő_6': { subject: 'Idegen nyelv', comments: [] },
                'Hétfő_7': { subject: 'Testnevelés', comments: [] },
                'Kedd_1': { subject: 'Szakmai gyakorlat', comments: [] },
                'Kedd_2': { subject: 'Szakmai gyakorlat', comments: [] },
                'Kedd_3': { subject: 'Szakmai gyakorlat', comments: [] },
                'Kedd_4': { subject: 'Matematika', comments: [] },
                'Kedd_5': { subject: 'Irodalom', comments: [] },
                'Kedd_6': { subject: 'Fizika', comments: [] },
                'Kedd_7': { subject: '', comments: [] },
                'Szerda_1': { subject: 'Szakmai tárgy', comments: [] },
                'Szerda_2': { subject: 'Szakmai tárgy', comments: [] },
                'Szerda_3': { subject: 'Matematika', comments: [] },
                'Szerda_4': { subject: 'Történelem', comments: [] },
                'Szerda_5': { subject: 'Idegen nyelv', comments: [] },
                'Szerda_6': { subject: 'Informatika', comments: [] },
                'Szerda_7': { subject: '', comments: [] },
                'Csütörtök_1': { subject: 'Szakmai gyakorlat', comments: [] },
                'Csütörtök_2': { subject: 'Szakmai gyakorlat', comments: [] },
                'Csütörtök_3': { subject: 'Szakmai gyakorlat', comments: [] },
                'Csütörtök_4': { subject: 'Matematika', comments: [] },
                'Csütörtök_5': { subject: 'Irodalom', comments: [] },
                'Csütörtök_6': { subject: '', comments: [] },
                'Csütörtök_7': { subject: '', comments: [] },
                'Péntek_1': { subject: 'Szakmai tárgy', comments: [] },
                'Péntek_2': { subject: 'Szakmai tárgy', comments: [] },
                'Péntek_3': { subject: 'Matematika', comments: [] },
                'Péntek_4': { subject: 'Történelem', comments: [] },
                'Péntek_5': { subject: 'Testnevelés', comments: [] },
                'Péntek_6': { subject: '', comments: [] },
                'Péntek_7': { subject: '', comments: [] }
            }
        };

        const template = templates[templateType];
        if (!template) {
            this.showNotification('❌ Ismeretlen sablon!');
            return;
        }

        const templateNames = {
            'empty': 'Üres órarend',
            'gimnazium': 'Gimnázium',
            'szakgimnazium': 'Szakgimnázium'
        };

        if (confirm(`Biztosan betöltöd a "${templateNames[templateType]}" sablont? Ez felülírja a meglévő órarendet.`)) {
            this.data.schedule = template;
            this.saveData();
            this.renderSchedule();
            // Sablon modal bezárása
            document.getElementById('templateModal').classList.remove('active');
            this.showNotification(`✅ ${templateNames[templateType]} sablon betöltve!`);
        }
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
        if (!db || !uid) {
            // Ha még nincs auth, próbáljuk újra 1 mp múlva
            console.log('⏳ Firestore sync várakozás auth-ra...');
            const self = this;
            setTimeout(() => {
                const retryUid = self.getFirebaseUserId();
                if (retryUid) {
                    self._doFirestoreSync();
                } else {
                    console.warn('⚠️ Firestore sync kihagyva - nincs auth');
                }
            }, 2000);
            return;
        }

        this._doFirestoreSync();
    }

    _doFirestoreSync() {
        const db = this.getFirestoreDb();
        const uid = this.getFirebaseUserId();
        if (!db || !uid) return;

        db.collection('schedules').doc(uid).set({
            schedule: this.data.schedule,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            userEmail: firebase.auth().currentUser.email || ''
        }).then(() => {
            console.log('☁️ Órarend szinkronizálva a felhőbe');
        }).catch(error => {
            console.warn('⚠️ Firestore sync hiba:', error.message);
        });
    }

    async loadFromFirestore() {
        const db = this.getFirestoreDb();
        const uid = this.getFirebaseUserId();
        if (!db || !uid) return;

        try {
            const doc = await db.collection('schedules').doc(uid).get();
            if (!doc.exists) {
                console.log('📭 Nincs mentett órarend a felhőben');
                return;
            }

            const cloudData = doc.data();
            if (!cloudData.schedule || typeof cloudData.schedule !== 'object') return;

            // Felhő adat felülírja a helyit
            this.data.schedule = cloudData.schedule;
            localStorage.setItem(this.userPrefix, JSON.stringify(this.data));
            this.renderSchedule();
            console.log('☁️ Órarend betöltve a felhőből');
        } catch (error) {
            console.warn('⚠️ Firestore betöltés hiba:', error.message);
        }
    }

    // ==================== HELPERS ====================

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

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('hu-HU', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showNotification(message) {
        const existing = document.querySelector('.schedule-notification');
        if (existing) existing.remove();
        
        const notif = document.createElement('div');
        notif.className = 'schedule-notification';
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.remove(), 3000);
    }
}

// Inicializáció
document.addEventListener('DOMContentLoaded', () => {
    console.log('📅 Schedule Manager betöltése...');
    window.scheduleManager = new ScheduleManager();
});

