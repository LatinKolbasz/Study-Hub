/**
 * ============================================
 * ClassroomManager - Osztály Kezelő
 * ============================================
 * Firebase Firestore alapú osztály rendszer:
 * - Osztály létrehozás / belépés kóddal
 * - Közös órarend
 * - Osztályátlag számítás
 * - Közös kvízek
 * - Házi feladat megosztás + megoldás
 * - Tagok profiljai
 */

class ClassroomManager {
    constructor() {
        this.currentClass = null;
        this.classId = null;
        this.members = {};
        this.quizzes = [];
        this.homework = [];
        this.activities = [];
        this.currentSolvingQuiz = null;
        this.currentHomeworkId = null;
        this.quizQuestionCount = 0;

        this.days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
        this.hours = [1, 2, 3, 4, 5, 6, 7];

        this._initialized = false;
        this.init();
    }

    init() {
        console.log('🏫 ClassroomManager inicializálása...');

        const self = this;

        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function (user) {
                if (user && !self._initialized) {
                    self._initialized = true;
                    self._doInit(user);
                }
            });
        }
    }

    _doInit(firebaseUser) {
        this.firebaseUser = firebaseUser;
        this.uid = firebaseUser.uid;
        this.userName = firebaseUser.displayName || firebaseUser.email.split('@')[0];
        this.userEmail = firebaseUser.email;

        // Check if user is already in a class
        this.checkUserClass();
    }

    // ==================== FIRESTORE HELPERS ====================

    getDb() {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            return firebase.firestore();
        }
        return null;
    }

    // ==================== CLASS MANAGEMENT ====================

    async checkUserClass() {
        const db = this.getDb();
        if (!db) return;

        try {
            // Check user's class membership
            const userDoc = await db.collection('users').doc(this.uid).get();
            if (userDoc.exists && userDoc.data().classId) {
                const classId = userDoc.data().classId;
                await this.loadClass(classId);
            } else {
                this.showNoClassView();
            }
        } catch (error) {
            console.warn('⚠️ Osztály ellenőrzés hiba:', error.message);
            this.showNoClassView();
        }
    }

    async createClass() {
        const name = document.getElementById('newClassName').value.trim();
        if (!name) {
            this.showNotification('❌ Add meg az osztály nevét!', 'error');
            return;
        }

        const db = this.getDb();
        if (!db) {
            this.showNotification('❌ Firebase nem elérhető!', 'error');
            return;
        }

        try {
            // Generate unique code
            const code = this.generateClassCode();

            // Create class document
            const classRef = await db.collection('classes').add({
                name: name,
                code: code,
                createdBy: this.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                schedule: {},
                members: {
                    [this.uid]: {
                        name: this.userName,
                        email: this.userEmail,
                        role: 'admin',
                        joinedAt: new Date().toISOString(),
                        grades: {}
                    }
                }
            });

            // Save class ID to user doc
            await db.collection('users').doc(this.uid).set({
                classId: classRef.id,
                className: name,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Add activity
            await this.addActivity('create', `${this.userName} létrehozta az osztályt`);

            this.showNotification(`✅ Osztály létrehozva! Kód: ${code}`, 'success');
            await this.loadClass(classRef.id);
        } catch (error) {
            console.error('❌ Osztály létrehozás hiba:', error);
            this.showNotification('❌ Hiba az osztály létrehozásakor!', 'error');
        }
    }

    async joinClass() {
        const code = document.getElementById('joinClassCode').value.trim().toUpperCase();
        if (!code) {
            this.showNotification('❌ Add meg az osztálykódot!', 'error');
            return;
        }

        const db = this.getDb();
        if (!db) {
            this.showNotification('❌ Firebase nem elérhető!', 'error');
            return;
        }

        try {
            // Find class by code
            const snapshot = await db.collection('classes').where('code', '==', code).get();
            if (snapshot.empty) {
                this.showNotification('❌ Nincs ilyen osztálykód!', 'error');
                return;
            }

            const classDoc = snapshot.docs[0];
            const classData = classDoc.data();

            // Check if already a member
            if (classData.members && classData.members[this.uid]) {
                this.showNotification('ℹ️ Már tag vagy ebben az osztályban!', 'info');
                await this.loadClass(classDoc.id);
                return;
            }

            // Add member
            const updateData = {};
            updateData[`members.${this.uid}`] = {
                name: this.userName,
                email: this.userEmail,
                role: 'member',
                joinedAt: new Date().toISOString(),
                grades: {}
            };

            await db.collection('classes').doc(classDoc.id).update(updateData);

            // Save to user doc
            await db.collection('users').doc(this.uid).set({
                classId: classDoc.id,
                className: classData.name,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Add activity
            this.classId = classDoc.id;
            await this.addActivity('join', `${this.userName} csatlakozott az osztályhoz`);

            this.showNotification(`✅ Csatlakoztál: ${classData.name}`, 'success');
            await this.loadClass(classDoc.id);
        } catch (error) {
            console.error('❌ Belépés hiba:', error);
            this.showNotification('❌ Hiba a belépéskor!', 'error');
        }
    }

    async leaveClass() {
        if (!confirm('Biztosan ki akarsz lépni az osztályból?')) return;

        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            // Remove member
            const updateData = {};
            updateData[`members.${this.uid}`] = firebase.firestore.FieldValue.delete();
            await db.collection('classes').doc(this.classId).update(updateData);

            // Add activity before leaving
            await this.addActivity('leave', `${this.userName} kilépett az osztályból`);

            // Remove from user doc
            await db.collection('users').doc(this.uid).update({
                classId: firebase.firestore.FieldValue.delete(),
                className: firebase.firestore.FieldValue.delete()
            });

            this.currentClass = null;
            this.classId = null;
            this.showNotification('✅ Kilépés sikeres!', 'success');
            this.showNoClassView();
        } catch (error) {
            console.error('❌ Kilépés hiba:', error);
            this.showNotification('❌ Hiba a kilépéskor!', 'error');
        }
    }

    async loadClass(classId) {
        const db = this.getDb();
        if (!db) return;

        try {
            const doc = await db.collection('classes').doc(classId).get();
            if (!doc.exists) {
                this.showNotification('❌ Az osztály nem található!', 'error');
                this.showNoClassView();
                return;
            }

            this.classId = classId;
            this.currentClass = doc.data();
            this.members = this.currentClass.members || {};

            // Load sub-collections
            await Promise.all([
                this.loadQuizzes(),
                this.loadHomework(),
                this.loadActivities()
            ]);

            this.showActiveClassView();
            this.renderAll();

            // Set up real-time listener
            this.setupRealtimeListener();

            console.log('✅ Osztály betöltve:', this.currentClass.name);
        } catch (error) {
            console.error('❌ Osztály betöltés hiba:', error);
            this.showNotification('❌ Hiba az osztály betöltésekor!', 'error');
        }
    }

    setupRealtimeListener() {
        const db = this.getDb();
        if (!db || !this.classId) return;

        // Listen for class changes in real-time
        this._unsubscribe = db.collection('classes').doc(this.classId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    this.currentClass = doc.data();
                    this.members = this.currentClass.members || {};
                    this.renderOverview();
                    this.renderMembers();
                    this.renderClassSchedule();
                }
            }, (error) => {
                console.warn('⚠️ Realtime listener hiba:', error.message);
            });
    }

    // ==================== VIEWS ====================

    showNoClassView() {
        document.getElementById('noClassView').style.display = '';
        document.getElementById('activeClassView').style.display = 'none';
    }

    showActiveClassView() {
        document.getElementById('noClassView').style.display = 'none';
        document.getElementById('activeClassView').style.display = '';
    }

    // ==================== RENDER ====================

    renderAll() {
        this.renderHeader();
        this.renderOverview();
        this.renderClassSchedule();
        this.renderQuizList();
        this.renderHomeworkList();
        this.renderMembers();
        this.renderActivityList();
    }

    renderHeader() {
        if (!this.currentClass) return;
        document.getElementById('classNameTitle').textContent = `🏫 ${this.currentClass.name}`;
        document.getElementById('classCodeDisplay').textContent = this.currentClass.code;
    }

    renderOverview() {
        if (!this.currentClass) return;

        // Member count
        const memberCount = Object.keys(this.members).length;
        document.getElementById('memberCount').textContent = memberCount;

        // Class average
        this.calculateClassAverage();

        // Counts
        document.getElementById('quizCount').textContent = this.quizzes.length;
        document.getElementById('homeworkCount').textContent = this.homework.length;
    }

    calculateClassAverage() {
        let totalGrades = 0;
        let gradeCount = 0;

        Object.values(this.members).forEach(member => {
            if (member.grades) {
                Object.values(member.grades).forEach(subjectGrades => {
                    if (Array.isArray(subjectGrades)) {
                        subjectGrades.forEach(g => {
                            totalGrades += g;
                            gradeCount++;
                        });
                    }
                });
            }
        });

        const avg = gradeCount > 0 ? (totalGrades / gradeCount).toFixed(2) : '-';
        document.getElementById('classAverage').textContent = avg;
    }

    renderClassSchedule() {
        const grid = document.getElementById('classScheduleGrid');
        if (!grid || !this.currentClass) return;

        const schedule = this.currentClass.schedule || {};

        let html = '<div class="schedule-header time-header">Idő</div>';
        this.days.forEach(day => {
            html += `<div class="schedule-header">${day}</div>`;
        });

        this.hours.forEach(hour => {
            html += `<div class="schedule-cell time-cell"><span class="time-label">${hour}. óra</span></div>`;
            this.days.forEach(day => {
                const key = `${day}_${hour}`;
                const subject = schedule[key] || '';
                html += `<div class="schedule-cell ${subject ? 'has-subject' : ''}">
                    ${subject ? `<span class="subject-name">${this.escapeHtml(subject)}</span>` : ''}
                </div>`;
            });
        });

        grid.innerHTML = html;
    }

    renderQuizList() {
        const container = document.getElementById('classQuizList');
        if (!container) return;

        if (this.quizzes.length === 0) {
            container.innerHTML = '<div class="quiz-empty">Még nincs közös kvíz. Hozz létre egyet!</div>';
            return;
        }

        container.innerHTML = this.quizzes.map(quiz => `
            <div class="quiz-card">
                <div class="quiz-card-header">
                    <h3>📝 ${this.escapeHtml(quiz.title)}</h3>
                    <span class="quiz-card-badge">${quiz.questions ? quiz.questions.length : 0} kérdés</span>
                </div>
                <div class="quiz-card-info">
                    <span>📚 ${this.escapeHtml(quiz.subject || 'Általános')}</span>
                    <span>👤 ${this.escapeHtml(quiz.authorName || 'Ismeretlen')}</span>
                    <span>📅 ${this.formatDate(quiz.createdAt)}</span>
                </div>
                <div class="quiz-card-actions">
                    <button class="classroom-btn classroom-btn-primary" onclick="classroomManager.startQuiz('${quiz.id}')">
                        ▶️ Megoldás
                    </button>
                    ${quiz.createdBy === this.uid ? `
                        <button class="classroom-btn classroom-btn-danger" onclick="classroomManager.deleteQuiz('${quiz.id}')">
                            🗑️ Törlés
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderHomeworkList() {
        const container = document.getElementById('homeworkList');
        if (!container) return;

        if (this.homework.length === 0) {
            container.innerHTML = '<div class="homework-empty">Nincs házi feladat. Adj hozzá egyet!</div>';
            return;
        }

        const now = new Date();
        container.innerHTML = this.homework.map(hw => {
            const deadline = hw.deadline ? new Date(hw.deadline) : null;
            const isOverdue = deadline && deadline < now;
            const solutions = hw.solutions || [];

            return `
                <div class="homework-card">
                    <div class="homework-card-header">
                        <h3>📚 ${this.escapeHtml(hw.subject)}</h3>
                        ${deadline ? `<span class="homework-deadline ${isOverdue ? 'overdue' : ''}">
                            ${isOverdue ? '⏰ Lejárt: ' : '📅 '}${this.formatDate(hw.deadline)}
                        </span>` : ''}
                    </div>
                    <div class="homework-description">${this.escapeHtml(hw.description)}</div>
                    <div class="homework-meta">
                        <span>👤 ${this.escapeHtml(hw.authorName || 'Ismeretlen')}</span>
                        <span>📅 Feladva: ${this.formatDate(hw.createdAt)}</span>
                        <span>💡 ${solutions.length} megoldás</span>
                    </div>
                    <div class="homework-actions">
                        <button class="classroom-btn classroom-btn-success" onclick="classroomManager.openSolutionForm('${hw.id}')">
                            💡 Megoldás beküldése
                        </button>
                        ${hw.createdBy === this.uid ? `
                            <button class="classroom-btn classroom-btn-danger" onclick="classroomManager.deleteHomework('${hw.id}')">
                                🗑️ Törlés
                            </button>
                        ` : ''}
                    </div>
                    ${solutions.length > 0 ? `
                        <div class="solutions-section">
                            <h4>💡 Megoldások (${solutions.length})</h4>
                            ${solutions.map(sol => `
                                <div class="solution-item">
                                    <div class="solution-author">👤 ${this.escapeHtml(sol.authorName)}</div>
                                    <div class="solution-text">${this.escapeHtml(sol.text)}</div>
                                    <div class="solution-time">${this.formatDate(sol.createdAt)}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    renderMembers() {
        const grid = document.getElementById('membersGrid');
        if (!grid) return;

        const memberCount = Object.keys(this.members).length;
        document.getElementById('memberCountBadge').textContent = `${memberCount} tag`;

        grid.innerHTML = Object.entries(this.members).map(([uid, member]) => {
            const initial = (member.name || 'U').charAt(0).toUpperCase();
            const isAdmin = member.role === 'admin';

            return `
                <div class="member-card" onclick="classroomManager.showMemberProfile('${uid}')">
                    <div class="member-avatar">${initial}</div>
                    <div class="member-info">
                        <div class="member-name">${this.escapeHtml(member.name)}</div>
                        <div class="member-role ${isAdmin ? 'admin' : ''}">${isAdmin ? '⭐ Admin' : '👤 Tag'}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderActivityList() {
        const container = document.getElementById('activityList');
        if (!container) return;

        if (this.activities.length === 0) {
            container.innerHTML = '<div class="activity-empty">Még nincs tevékenység az osztályban.</div>';
            return;
        }

        container.innerHTML = this.activities.slice(0, 20).map(act => {
            const icons = {
                'create': '✨',
                'join': '🚪',
                'leave': '👋',
                'quiz': '📝',
                'homework': '📚',
                'solution': '💡',
                'schedule': '📅',
                'grade': '🏆'
            };

            return `
                <div class="activity-item">
                    <div class="activity-icon">${icons[act.type] || '🔔'}</div>
                    <div class="activity-text">${this.escapeHtml(act.text)}</div>
                    <div class="activity-time">${this.formatDate(act.createdAt)}</div>
                </div>
            `;
        }).join('');
    }

    // ==================== SCHEDULE EDITOR ====================

    openScheduleEditor() {
        const grid = document.getElementById('scheduleEditorGrid');
        if (!grid) return;

        const schedule = (this.currentClass && this.currentClass.schedule) || {};

        let html = '<div class="schedule-header time-header">Idő</div>';
        this.days.forEach(day => {
            html += `<div class="schedule-header">${day}</div>`;
        });

        this.hours.forEach(hour => {
            html += `<div class="time-cell">${hour}. óra</div>`;
            this.days.forEach(day => {
                const key = `${day}_${hour}`;
                const subject = schedule[key] || '';
                html += `<div class="editor-cell">
                    <input type="text" data-key="${key}" value="${this.escapeHtml(subject)}" placeholder="Tantárgy">
                </div>`;
            });
        });

        grid.innerHTML = html;
        document.getElementById('scheduleEditorModal').classList.add('active');
    }

    async saveClassSchedule() {
        const db = this.getDb();
        if (!db || !this.classId) return;

        const schedule = {};
        document.querySelectorAll('#scheduleEditorGrid input[data-key]').forEach(input => {
            const key = input.dataset.key;
            const value = input.value.trim();
            if (value) {
                schedule[key] = value;
            }
        });

        try {
            await db.collection('classes').doc(this.classId).update({
                schedule: schedule,
                scheduleUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.currentClass.schedule = schedule;
            this.renderClassSchedule();
            this.closeModal('scheduleEditorModal');
            await this.addActivity('schedule', `${this.userName} frissítette az órarendet`);
            this.showNotification('✅ Órarend mentve!', 'success');
        } catch (error) {
            console.error('❌ Órarend mentés hiba:', error);
            this.showNotification('❌ Hiba az órarend mentésekor!', 'error');
        }
    }

    // ==================== QUIZZES ====================

    async loadQuizzes() {
        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            const snapshot = await db.collection('classes').doc(this.classId)
                .collection('quizzes').orderBy('createdAt', 'desc').get();

            this.quizzes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.warn('⚠️ Kvízek betöltés hiba:', error.message);
        }
    }

    openQuizCreator() {
        this.quizQuestionCount = 0;
        document.getElementById('quizTitle').value = '';
        document.getElementById('quizSubject').value = '';
        document.getElementById('quizQuestionsContainer').innerHTML = '';
        this.addQuizQuestion(); // Add first question
        document.getElementById('quizCreatorModal').classList.add('active');
    }

    addQuizQuestion() {
        this.quizQuestionCount++;
        const n = this.quizQuestionCount;
        const container = document.getElementById('quizQuestionsContainer');

        const html = `
            <div class="quiz-question-card" id="quizQuestion${n}">
                <div class="question-header">
                    <h4>${n}. kérdés</h4>
                    <button class="remove-question-btn" onclick="classroomManager.removeQuizQuestion(${n})">✕</button>
                </div>
                <div class="form-group">
                    <input type="text" class="classroom-input" id="questionText${n}" placeholder="Kérdés szövege...">
                </div>
                <div class="options-grid">
                    <div class="option-input-group">
                        <input type="radio" name="correct${n}" value="0" checked>
                        <input type="text" id="option${n}_0" class="classroom-input" placeholder="A) Válasz">
                    </div>
                    <div class="option-input-group">
                        <input type="radio" name="correct${n}" value="1">
                        <input type="text" id="option${n}_1" class="classroom-input" placeholder="B) Válasz">
                    </div>
                    <div class="option-input-group">
                        <input type="radio" name="correct${n}" value="2">
                        <input type="text" id="option${n}_2" class="classroom-input" placeholder="C) Válasz">
                    </div>
                    <div class="option-input-group">
                        <input type="radio" name="correct${n}" value="3">
                        <input type="text" id="option${n}_3" class="classroom-input" placeholder="D) Válasz">
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    }

    removeQuizQuestion(n) {
        const el = document.getElementById(`quizQuestion${n}`);
        if (el) el.remove();
    }

    async saveQuiz() {
        const title = document.getElementById('quizTitle').value.trim();
        const subject = document.getElementById('quizSubject').value.trim();

        if (!title) {
            this.showNotification('❌ Add meg a kvíz nevét!', 'error');
            return;
        }

        // Collect questions
        const questions = [];
        const questionCards = document.querySelectorAll('.quiz-question-card');

        questionCards.forEach((card, index) => {
            const n = card.id.replace('quizQuestion', '');
            const questionText = document.getElementById(`questionText${n}`)?.value.trim();
            if (!questionText) return;

            const options = [];
            for (let i = 0; i < 4; i++) {
                const opt = document.getElementById(`option${n}_${i}`)?.value.trim();
                options.push(opt || `Válasz ${i + 1}`);
            }

            const correctRadio = document.querySelector(`input[name="correct${n}"]:checked`);
            const correctIndex = correctRadio ? parseInt(correctRadio.value) : 0;

            questions.push({
                question: questionText,
                options: options,
                correct: correctIndex
            });
        });

        if (questions.length === 0) {
            this.showNotification('❌ Adj hozzá legalább egy kérdést!', 'error');
            return;
        }

        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            await db.collection('classes').doc(this.classId)
                .collection('quizzes').add({
                    title: title,
                    subject: subject,
                    questions: questions,
                    createdBy: this.uid,
                    authorName: this.userName,
                    createdAt: new Date().toISOString()
                });

            await this.loadQuizzes();
            this.renderQuizList();
            this.renderOverview();
            this.closeModal('quizCreatorModal');
            await this.addActivity('quiz', `${this.userName} új kvízt hozott létre: ${title}`);
            this.showNotification('✅ Kvíz létrehozva!', 'success');
        } catch (error) {
            console.error('❌ Kvíz mentés hiba:', error);
            this.showNotification('❌ Hiba a kvíz mentésekor!', 'error');
        }
    }

    startQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) return;

        this.currentSolvingQuiz = quiz;

        document.getElementById('solverQuizTitle').textContent = `📝 ${quiz.title}`;

        const body = document.getElementById('quizSolverBody');
        body.innerHTML = quiz.questions.map((q, qi) => `
            <div class="solver-question" data-qi="${qi}">
                <h4>${qi + 1}. ${this.escapeHtml(q.question)}</h4>
                <div class="solver-options">
                    ${q.options.map((opt, oi) => `
                        <div class="solver-option" onclick="classroomManager.selectQuizOption(${qi}, ${oi}, this)">
                            <input type="radio" name="solver_q${qi}" value="${oi}" style="display:none;">
                            <span>${this.escapeHtml(opt)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        document.getElementById('quizSolverModal').classList.add('active');
    }

    selectQuizOption(qi, oi, element) {
        // Deselect all options in this question
        const parent = element.closest('.solver-question');
        parent.querySelectorAll('.solver-option').forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');
        element.querySelector('input[type="radio"]').checked = true;
    }

    submitQuiz() {
        if (!this.currentSolvingQuiz) return;

        const quiz = this.currentSolvingQuiz;
        let correct = 0;
        let total = quiz.questions.length;

        quiz.questions.forEach((q, qi) => {
            const selected = document.querySelector(`input[name="solver_q${qi}"]:checked`);
            const selectedIndex = selected ? parseInt(selected.value) : -1;

            // Show correct/incorrect
            const questionEl = document.querySelector(`.solver-question[data-qi="${qi}"]`);
            const options = questionEl.querySelectorAll('.solver-option');

            options.forEach((opt, oi) => {
                if (oi === q.correct) {
                    opt.classList.add('correct');
                } else if (oi === selectedIndex && oi !== q.correct) {
                    opt.classList.add('incorrect');
                }
            });

            if (selectedIndex === q.correct) {
                correct++;
            }
        });

        const percentage = Math.round((correct / total) * 100);
        const grade = percentage >= 90 ? 5 : percentage >= 70 ? 4 : percentage >= 50 ? 3 : percentage >= 30 ? 2 : 1;

        // Show result
        this.showNotification(`📊 Eredmény: ${correct}/${total} (${percentage}%) - Jegy: ${grade}`, 'info');

        // Save grade to Firestore
        this.saveQuizGrade(quiz.subject || 'Általános', grade);

        // Disable submit button
        const submitBtn = document.querySelector('#quizSolverModal .classroom-btn-primary');
        if (submitBtn) {
            submitBtn.textContent = `📊 ${correct}/${total} (${percentage}%)`;
            submitBtn.disabled = true;
        }
    }

    async saveQuizGrade(subject, grade) {
        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            const key = `members.${this.uid}.grades.${subject}`;
            await db.collection('classes').doc(this.classId).update({
                [key]: firebase.firestore.FieldValue.arrayUnion(grade)
            });
        } catch (error) {
            console.warn('⚠️ Jegy mentés hiba:', error.message);
        }
    }

    async deleteQuiz(quizId) {
        if (!confirm('Biztosan törlöd ezt a kvízt?')) return;

        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            await db.collection('classes').doc(this.classId)
                .collection('quizzes').doc(quizId).delete();

            await this.loadQuizzes();
            this.renderQuizList();
            this.renderOverview();
            this.showNotification('✅ Kvíz törölve!', 'success');
        } catch (error) {
            console.error('❌ Kvíz törlés hiba:', error);
            this.showNotification('❌ Hiba a kvíz törlésekor!', 'error');
        }
    }

    // ==================== HOMEWORK ====================

    async loadHomework() {
        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            const snapshot = await db.collection('classes').doc(this.classId)
                .collection('homework').orderBy('createdAt', 'desc').get();

            this.homework = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.warn('⚠️ Házi feladat betöltés hiba:', error.message);
        }
    }

    openHomeworkForm() {
        document.getElementById('hwSubject').value = '';
        document.getElementById('hwDescription').value = '';
        document.getElementById('hwDeadline').value = '';
        document.getElementById('homeworkModal').classList.add('active');
    }

    async saveHomework() {
        const subject = document.getElementById('hwSubject').value.trim();
        const description = document.getElementById('hwDescription').value.trim();
        const deadline = document.getElementById('hwDeadline').value;

        if (!subject || !description) {
            this.showNotification('❌ Tantárgy és leírás szükséges!', 'error');
            return;
        }

        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            await db.collection('classes').doc(this.classId)
                .collection('homework').add({
                    subject: subject,
                    description: description,
                    deadline: deadline || null,
                    createdBy: this.uid,
                    authorName: this.userName,
                    createdAt: new Date().toISOString(),
                    solutions: []
                });

            await this.loadHomework();
            this.renderHomeworkList();
            this.renderOverview();
            this.closeModal('homeworkModal');
            await this.addActivity('homework', `${this.userName} új házi feladatot adott: ${subject}`);
            this.showNotification('✅ Házi feladat mentve!', 'success');
        } catch (error) {
            console.error('❌ Házi feladat mentés hiba:', error);
            this.showNotification('❌ Hiba a házi feladat mentésekor!', 'error');
        }
    }

    openSolutionForm(homeworkId) {
        this.currentHomeworkId = homeworkId;
        document.getElementById('solutionText').value = '';
        document.getElementById('solutionModal').classList.add('active');
    }

    async submitSolution() {
        const text = document.getElementById('solutionText').value.trim();
        if (!text) {
            this.showNotification('❌ Írd le a megoldást!', 'error');
            return;
        }

        const db = this.getDb();
        if (!db || !this.classId || !this.currentHomeworkId) return;

        try {
            const hwRef = db.collection('classes').doc(this.classId)
                .collection('homework').doc(this.currentHomeworkId);

            const solution = {
                authorId: this.uid,
                authorName: this.userName,
                text: text,
                createdAt: new Date().toISOString()
            };

            await hwRef.update({
                solutions: firebase.firestore.FieldValue.arrayUnion(solution)
            });

            await this.loadHomework();
            this.renderHomeworkList();
            this.closeModal('solutionModal');
            await this.addActivity('solution', `${this.userName} megoldást küldött be`);
            this.showNotification('✅ Megoldás beküldve!', 'success');
        } catch (error) {
            console.error('❌ Megoldás beküldés hiba:', error);
            this.showNotification('❌ Hiba a megoldás beküldésekor!', 'error');
        }
    }

    async deleteHomework(homeworkId) {
        if (!confirm('Biztosan törlöd ezt a házi feladatot?')) return;

        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            await db.collection('classes').doc(this.classId)
                .collection('homework').doc(homeworkId).delete();

            await this.loadHomework();
            this.renderHomeworkList();
            this.renderOverview();
            this.showNotification('✅ Házi feladat törölve!', 'success');
        } catch (error) {
            console.error('❌ Házi feladat törlés hiba:', error);
            this.showNotification('❌ Hiba a házi feladat törlésekor!', 'error');
        }
    }

    // ==================== MEMBER PROFILES ====================

    showMemberProfile(uid) {
        const member = this.members[uid];
        if (!member) return;

        const initial = (member.name || 'U').charAt(0).toUpperCase();
        const isAdmin = member.role === 'admin';

        // Calculate member stats
        let gradeCount = 0;
        let gradeTotal = 0;
        if (member.grades) {
            Object.values(member.grades).forEach(subjectGrades => {
                if (Array.isArray(subjectGrades)) {
                    subjectGrades.forEach(g => {
                        gradeTotal += g;
                        gradeCount++;
                    });
                }
            });
        }
        const avgGrade = gradeCount > 0 ? (gradeTotal / gradeCount).toFixed(2) : '-';

        // Count quizzes by this member
        const quizzesCreated = this.quizzes.filter(q => q.createdBy === uid).length;
        const solutionsCount = this.homework.reduce((count, hw) => {
            return count + (hw.solutions ? hw.solutions.filter(s => s.authorId === uid).length : 0);
        }, 0);

        const body = document.getElementById('profileModalBody');
        body.innerHTML = `
            <div class="profile-view">
                <div class="profile-view-avatar">${initial}</div>
                <h3>${this.escapeHtml(member.name)}</h3>
                <p class="profile-email">${this.escapeHtml(member.email || '')}</p>
                <span class="member-role ${isAdmin ? 'admin' : ''}" style="display: inline-block; padding: 0.3rem 1rem; background: ${isAdmin ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.1)'}; border-radius: 20px; font-size: 0.9rem;">
                    ${isAdmin ? '⭐ Admin' : '👤 Tag'}
                </span>
                <div class="profile-stats">
                    <div class="profile-stat">
                        <h4>${avgGrade}</h4>
                        <p>Átlag</p>
                    </div>
                    <div class="profile-stat">
                        <h4>${quizzesCreated}</h4>
                        <p>Kvíz létrehozva</p>
                    </div>
                    <div class="profile-stat">
                        <h4>${solutionsCount}</h4>
                        <p>Megoldás</p>
                    </div>
                </div>
                ${member.grades && Object.keys(member.grades).length > 0 ? `
                    <div style="margin-top: 1.5rem; text-align: left;">
                        <h4 style="color: rgba(255,255,255,0.6); margin-bottom: 0.75rem; font-size: 0.9rem;">📊 Jegyek tantárgyanként</h4>
                        ${Object.entries(member.grades).map(([subject, grades]) => {
                            const subAvg = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : '-';
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 0.3rem;">
                                    <span style="color: white; font-size: 0.9rem;">${this.escapeHtml(subject)}</span>
                                    <span style="color: var(--primary-color, #6366f1); font-weight: 600;">${grades.join(', ')} (átl: ${subAvg})</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
                <p style="color: rgba(255,255,255,0.4); font-size: 0.8rem; margin-top: 1rem;">
                    📅 Csatlakozott: ${this.formatDate(member.joinedAt)}
                </p>
            </div>
        `;

        document.getElementById('profileModal').classList.add('active');
    }

    // ==================== ACTIVITIES ====================

    async addActivity(type, text) {
        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            await db.collection('classes').doc(this.classId)
                .collection('activities').add({
                    type: type,
                    text: text,
                    authorId: this.uid,
                    createdAt: new Date().toISOString()
                });
        } catch (error) {
            console.warn('⚠️ Tevékenység mentés hiba:', error.message);
        }
    }

    async loadActivities() {
        const db = this.getDb();
        if (!db || !this.classId) return;

        try {
            const snapshot = await db.collection('classes').doc(this.classId)
                .collection('activities').orderBy('createdAt', 'desc').limit(20).get();

            this.activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.warn('⚠️ Tevékenységek betöltés hiba:', error.message);
        }
    }

    // ==================== TABS ====================

    switchTab(tabId, btn) {
        document.querySelectorAll('.classroom-tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.classroom-tab').forEach(el => el.classList.remove('active'));

        const tabEl = document.getElementById(`tab-${tabId}`);
        if (tabEl) tabEl.classList.add('active');
        if (btn) btn.classList.add('active');
    }

    // ==================== MODALS ====================

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    copyClassCode() {
        const code = this.currentClass?.code;
        if (!code) return;

        navigator.clipboard.writeText(code).then(() => {
            this.showNotification('📋 Kód másolva: ' + code, 'success');
        }).catch(() => {
            // Fallback
            const input = document.createElement('input');
            input.value = code;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            this.showNotification('📋 Kód másolva: ' + code, 'success');
        });
    }

    // ==================== HELPERS ====================

    generateClassCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('hu-HU', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.classroom-notification');
        if (existing) existing.remove();

        const notif = document.createElement('div');
        notif.className = `classroom-notification ${type}`;
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => notif.remove(), 3000);
    }
}

// Inicializáció
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏫 ClassroomManager betöltése...');
    window.classroomManager = new ClassroomManager();
});
