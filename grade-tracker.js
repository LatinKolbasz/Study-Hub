/**
 * ============================================
 * GradeTracker - Videójáték stílusú jegytracker
 * ============================================
 * Követi a jegyeket, XP-t, achievementeket
 * Számítja a statisztikákat és javaslatokat ad
 */

class GradeTracker {
    constructor() {
        this.data = {
            grades: [],
            subjects: [],
            totalXp: 0,
            level: 1,
            streakDays: 0,
            lastActive: null,
            achievements: []
        };
        
        this.userPrefix = 'gradeTracker'; // Alapértelmezett, felülírásra kerül init()-ben
        
        this.achievementList = [
            // Első lépések
            { id: 'first_grade', name: 'Első lépés', desc: 'Első jegy hozzáadása', icon: '🎯', xp: 10 },
            
            // Mennyiségi - jegyek
            { id: 'five_grades', name: 'Megyer', desc: '5 jegy hozzáadása', icon: '⭐', xp: 25 },
            { id: 'ten_grades', name: 'Tízszer', desc: '10 jegy hozzáadása', icon: '💪', xp: 50 },
            { id: 'twenty_five', name: 'Ne quarter', desc: '25 jegy összesen', icon: '🎖️', xp: 75 },
            { id: 'hard_worker', name: 'Szorgalmas', desc: '50 jegy', icon: '🏆', xp: 100 },
            { id: 'century', name: 'Százados', desc: '100 jegy összesen', icon: '💯', xp: 200 },
            
            // Kiváló jegyek
            { id: 'perfect_score', name: 'Tökéletes', desc: 'Első 5-ös jegy', icon: '🌟', xp: 20 },
            { id: 'grade_streak_3', name: 'Színvonalas', desc: '3 egymás utáni 4es vagy jobb', icon: '🔥', xp: 40 },
            { id: 'grade_streak_5', name: 'Zseni', desc: '5 egymás utáni 4es vagy jobb', icon: '⚡', xp: 75 },
            { id: 'all_fives', name: 'Ötösös', desc: '10 db 5-ös jegy', icon: '👑', xp: 100 },
            
            // Streak - egymás utáni napok
            { id: 'study_streak', name: 'Streak', desc: '3 nap streak', icon: '🔥', xp: 30 },
            { id: 'week_warrior', name: 'Heti hős', desc: '7 nap streak', icon: '⚡', xp: 70 },
            { id: 'month_master', name: 'Hónap mester', desc: '30 nap streak', icon: '🏅', xp: 200 },
            
            // Tantárgyak
            { id: 'three_subjects', name: 'Sokoldalú', desc: '3 különböző tantárgy', icon: '🎓', xp: 25 },
            { id: 'five_subjects', name: 'Einstein', desc: '5 különböző tantárgy', icon: '🧠', xp: 50 },
            { id: 'subject_master', name: 'Mester', desc: 'Egy tantárgyból 5 jegy', icon: '🎓', xp: 40 },
            { id: 'subject_veteran', name: 'Veterán', desc: '5 különböző tantárgyból jegy', icon: '🏅', xp: 60 },
            
            // Átlag
            { id: 'avg_above_4', name: 'Kiváló', desc: 'Átlag 4 felett', icon: '💎', xp: 50 },
            { id: 'all_excellent', name: 'Kitüntetéses', desc: 'Átlag 4.5 felett', icon: '🌟', xp: 100 },
            { id: 'perfect_avg', name: 'Tökéletes', desc: 'Átlag 4.8 felett', icon: '💯', xp: 150 },
            
            // Speciális
            { id: 'early_bird', name: 'Kora madár', desc: 'Reggel adj hozzá jegyet', icon: '🌅', xp: 15 },
            { id: 'night_owl', name: 'Bagoly', desc: 'Éjjel adj hozzá jegyet', icon: '🦉', xp: 15 },
            { id: 'weekend_hero', name: 'Hétvégi hős', desc: 'Hétvégén adj hozzá jegyet', icon: '🎪', xp: 20 },
            { id: 'quick_learner', name: 'Gyors tanuló', desc: '5 jegy 1 nap alatt', icon: '🚀', xp: 35 },
        ];
        
        this.init();
    }

    /**
     * Inicializáció
     */
    init() {
        console.log('🏆 GradeTracker inicializálása...');
        
        // Bejelentkezés ellenőrzése
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            window.location.href = '../login.html';
            return;
        }

        // Felhasználó prefix beállítása
        this.setUserPrefix();

        this.loadData();
        this.checkStreak();
        this.renderAll();
        this.populateSubjectsList();

        // Telemetria
        if (window.authManager && window.authManager.logPageView) {
            window.authManager.logPageView('grade-tracker');
        }
    }

    /**
     * Felhasználó prefix beállítása
     */
    setUserPrefix() {
        if (window.authManager && window.authManager.currentUser) {
            const username = window.authManager.currentUser.username;
            const hash = this.simpleHash(username);
            this.userPrefix = `studyhub_${hash}_gradeTracker`;
            console.log('📁 Felhasználói prefix:', this.userPrefix);
        } else {
            this.userPrefix = 'gradeTracker';
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
     * Adatok betöltése
     */
    loadData() {
        const saved = localStorage.getItem(this.userPrefix);
        if (saved) {
            this.data = { ...this.data, ...JSON.parse(saved) };
            console.log('✅ Adatok betöltve a prefix-szel:', this.userPrefix);
        } else {
            console.log('📭 Nincs mentett adat, új felhasználó');
        }
    }

    /**
     * Adatok mentése
     */
    saveData() {
        localStorage.setItem(this.userPrefix, JSON.stringify(this.data));
    }

    /**
     * Streak ellenőrzés
     */
    checkStreak() {
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (this.data.lastActive === yesterday.toString()) {
            // Tegnap is aktív volt, streak marad
        } else if (this.data.lastActive !== today) {
            // Nem volt tegnap sem, streak nullázás
            this.data.streakDays = 0;
        }
        
        this.data.lastActive = today;
    }

    /**
     * Jegy hozzáadása
     */
    addGrade() {
        const subject = document.getElementById('subjectName').value.trim();
        const grade = parseInt(document.getElementById('gradeValue').value);
        const type = document.getElementById('gradeType').value;
        const weight = parseInt(document.getElementById('gradeWeight').value) || 100;
        
        if (!subject) {
            this.showNotification('❌ Add meg a tantárgyat!');
            return;
        }
        
        // Tantárgy hozzáadása, ha nem létezik
        if (!this.data.subjects.includes(subject)) {
            this.data.subjects.push(subject);
        }
        
        const newGrade = {
            id: Date.now(),
            subject: subject,
            grade: grade,
            type: type,
            weight: weight,
            date: new Date().toISOString()
        };
        
        this.data.grades.push(newGrade);
        
        // XP számítás
        const xpGained = this.calculateXp(grade);
        this.data.totalXp += xpGained;
        
        // Streak frissítés
        this.data.streakDays++;
        
        // Level számítás
        this.calculateLevel();
        
        // Achievementek ellenőrzése
        this.checkAchievements();
        
        this.saveData();
        this.renderAll();
        this.populateSubjectsList();
        
        // Űrlap reset
        document.getElementById('subjectName').value = '';
        
        this.showNotification(`✅ Jegy hozzáadva! +${xpGained} XP`);
    }

    /**
     * XP számítás
     */
    calculateXp(grade) {
        const baseXp = [0, 10, 20, 35, 50, 100]; // 1-5 jegyek XP-ja
        return baseXp[grade] || 10;
    }

    /**
     * Level számítás
     */
    calculateLevel() {
        const xp = this.data.totalXp;
        // Minden szinthez 100 XP kell + 50XP per szint
        let level = 1;
        let requiredXp = 100;
        let totalRequired = 0;
        
        while (xp >= totalRequired + requiredXp) {
            totalRequired += requiredXp;
            level++;
            requiredXp = 50 * level;
        }
        
        this.data.level = level;
        this.currentLevelXp = xp - totalRequired;
        this.requiredXp = requiredXp;
    }

    /**
     * Achievementek ellenőrzése
     */
    checkAchievements() {
        const grades = this.data.grades;
        const subjects = [...new Set(grades.map(g => g.subject))];
        const today = new Date();
        const hour = today.getHours();
        const day = today.getDay();
        
        const newAchievements = [];
        
        // Első jegy
        if (grades.length >= 1 && !this.data.achievements.includes('first_grade')) {
            newAchievements.push('first_grade');
        }
        
        // 5 jegy
        if (grades.length >= 5 && !this.data.achievements.includes('five_grades')) {
            newAchievements.push('five_grades');
        }
        
        // 10 jegy
        if (grades.length >= 10 && !this.data.achievements.includes('ten_grades')) {
            newAchievements.push('ten_grades');
        }
        
        // 25 jegy
        if (grades.length >= 25 && !this.data.achievements.includes('twenty_five')) {
            newAchievements.push('twenty_five');
        }
        
        // 50 jegy
        if (grades.length >= 50 && !this.data.achievements.includes('hard_worker')) {
            newAchievements.push('hard_worker');
        }
        
        // 100 jegy
        if (grades.length >= 100 && !this.data.achievements.includes('century')) {
            newAchievements.push('century');
        }
        
        // 5-ös jegy
        if (grades.some(g => g.grade === 5) && !this.data.achievements.includes('perfect_score')) {
            newAchievements.push('perfect_score');
        }
        
        // 3 egymás utáni 4es vagy jobb (sorban)
        const sortedByDate = [...grades].sort((a, b) => new Date(a.date) - new Date(b.date));
        let goodStreak = 0;
        for (const g of sortedByDate) {
            if (g.grade >= 4) goodStreak++;
            else goodStreak = 0;
            if (goodStreak >= 3 && !this.data.achievements.includes('grade_streak_3')) {
                newAchievements.push('grade_streak_3');
                break;
            }
        }
        
        // 5 egymás utáni 4es vagy jobb
        goodStreak = 0;
        for (const g of sortedByDate) {
            if (g.grade >= 4) goodStreak++;
            else goodStreak = 0;
            if (goodStreak >= 5 && !this.data.achievements.includes('grade_streak_5')) {
                newAchievements.push('grade_streak_5');
                break;
            }
        }
        
        // 10 db 5-ös
        const fivesCount = grades.filter(g => g.grade === 5).length;
        if (fivesCount >= 10 && !this.data.achievements.includes('all_fives')) {
            newAchievements.push('all_fives');
        }
        
        // 3 nap streak
        if (this.data.streakDays >= 3 && !this.data.achievements.includes('study_streak')) {
            newAchievements.push('study_streak');
        }
        
        // 7 nap streak
        if (this.data.streakDays >= 7 && !this.data.achievements.includes('week_warrior')) {
            newAchievements.push('week_warrior');
        }
        
        // 30 nap streak
        if (this.data.streakDays >= 30 && !this.data.achievements.includes('month_master')) {
            newAchievements.push('month_master');
        }
        
        // 3 különböző tantárgy
        if (subjects.length >= 3 && !this.data.achievements.includes('three_subjects')) {
            newAchievements.push('three_subjects');
        }
        
        // 5 különböző tantárgy
        if (subjects.length >= 5 && !this.data.achievements.includes('five_subjects')) {
            newAchievements.push('five_subjects');
        }
        
        // Tantárgyból 5 jegy
        subjects.forEach(subject => {
            const count = grades.filter(g => g.subject === subject).length;
            if (count >= 5) {
                const achievementId = `subject_${subject}`;
                if (!this.data.achievements.includes(achievementId)) {
                    newAchievements.push(achievementId);
                }
            }
        });
        
        // 5 különböző tantárgy
        if (subjects.length >= 5 && !this.data.achievements.includes('subject_veteran')) {
            newAchievements.push('subject_veteran');
        }
        
        // Átlag 4 felett
        if (this.getAverageGrade() >= 4 && !this.data.achievements.includes('avg_above_4')) {
            newAchievements.push('avg_above_4');
        }
        
        // Átlag 4.5 felett
        if (this.getAverageGrade() >= 4.5 && !this.data.achievements.includes('all_excellent')) {
            newAchievements.push('all_excellent');
        }
        
        // Átlag 4.8 felett
        if (this.getAverageGrade() >= 4.8 && !this.data.achievements.includes('perfect_avg')) {
            newAchievements.push('perfect_avg');
        }
        
        // Reggel (6-10)
        if (hour >= 6 && hour < 10 && !this.data.achievements.includes('early_bird')) {
            newAchievements.push('early_bird');
        }
        
        // Éjjel (22-6)
        if (hour >= 22 || hour < 6 && !this.data.achievements.includes('night_owl')) {
            newAchievements.push('night_owl');
        }
        
        // Hétvége (szombat vagy vasárnap)
        if ((day === 0 || day === 6) && !this.data.achievements.includes('weekend_hero')) {
            newAchievements.push('weekend_hero');
        }
        
        // 5 jegy 1 nap alatt
        const todayStr = today.toDateString();
        const todayGrades = grades.filter(g => new Date(g.date).toDateString() === todayStr).length;
        if (todayGrades >= 5 && !this.data.achievements.includes('quick_learner')) {
            newAchievements.push('quick_learner');
        }
        
        this.data.achievements = [...this.data.achievements, ...newAchievements];
        
        if (newAchievements.length > 0) {
            let totalNewXp = 0;
            newAchievements.forEach(id => {
                const ach = this.achievementList.find(a => a.id === id);
                if (ach) totalNewXp += ach.xp;
            });
            this.data.totalXp += totalNewXp;
            this.calculateLevel();
            
            setTimeout(() => {
                this.showNotification(`🎉 ${newAchievements.length} új achievement! +${totalNewXp} XP`);
            }, 500);
        }
    }

    /**
     * Átlag számítás (súlyozott)
     */
    getAverageGrade() {
        if (this.data.grades.length === 0) return 0;
        
        // Súlyozott átlag
        let totalWeight = 0;
        let weightedSum = 0;
        
        this.data.grades.forEach(g => {
            const weight = g.weight || 100;
            weightedSum += g.grade * weight;
            totalWeight += weight;
        });
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Tantárgy statisztikák (súlyozott)
     */
    getSubjectStats() {
        const stats = {};
        
        this.data.subjects.forEach(subject => {
            const subjectGrades = this.data.grades.filter(g => g.subject === subject);
            if (subjectGrades.length > 0) {
                // Súlyozott átlag számítás
                let totalWeight = 0;
                let weightedSum = 0;
                
                subjectGrades.forEach(g => {
                    const weight = g.weight || 100;
                    weightedSum += g.grade * weight;
                    totalWeight += weight;
                });
                
                stats[subject] = {
                    count: subjectGrades.length,
                    average: totalWeight > 0 ? weightedSum / totalWeight : 0,
                    grades: subjectGrades.map(g => g.grade)
                };
            }
        });
        
        return stats;
    }

    /**
     * Összes renderelés
     */
    renderAll() {
        this.renderPlayerCard();
        this.renderAchievementStats();
        this.renderSubjects();
        this.renderAnalytics();
        this.renderRecentGrades();
        this.renderAchievements();
    }

    /**
     * Player kártya renderelés
     */
    renderPlayerCard() {
        // XP bar
        const xpPercent = this.requiredXp ? (this.currentLevelXp / this.requiredXp) * 100 : 0;
        document.getElementById('xpFill').style.width = `${xpPercent}%`;
        document.getElementById('currentXp').textContent = this.currentLevelXp || 0;
        document.getElementById('requiredXp').textContent = this.requiredXp || 100;
        document.getElementById('levelBadge').textContent = this.data.level;
        
        // Átlag
        const avg = this.getAverageGrade();
        document.getElementById('avgGrade').textContent = avg > 0 ? avg.toFixed(2) : '-';
        
        // Összes jegy
        document.getElementById('totalGrades').textContent = this.data.grades.length;
        
        // Legjobb jegy
        const best = this.data.grades.length > 0 ? Math.max(...this.data.grades.map(g => g.grade)) : '-';
        document.getElementById('bestGrade').textContent = best;
    }

    /**
     * Achievement statisztikák
     */
    renderAchievementStats() {
        document.getElementById('streakDays').textContent = this.data.streakDays;
        document.getElementById('totalXp').textContent = this.data.totalXp;
        document.getElementById('subjectCount').textContent = this.data.subjects.length;
        document.getElementById('achievementCount').textContent = this.data.achievements.length;
    }

    /**
     * Tantárgy kártya renderelése kattinthatóként
     */
    renderSubjects() {
        const grid = document.getElementById('subjectsGrid');
        const stats = this.getSubjectStats();
        
        if (Object.keys(stats).length === 0) {
            grid.innerHTML = '<div class="empty-message"><p>📭 Még nincs tantárgy. Adj hozzá jegyeket!</p></div>';
            return;
        }
        
        grid.innerHTML = Object.entries(stats).map(([subject, data]) => {
            const badgeClass = data.average >= 4.5 ? 'excellent' : 
                             data.average >= 3.5 ? 'good' : 
                             data.average >= 2.5 ? 'average' : 'poor';
            
            const levelClass = data.average >= 4.5 ? 'level-5' :
                              data.average >= 4 ? 'level-4' :
                              data.average >= 3 ? 'level-3' :
                              data.average >= 2 ? 'level-2' : 'level-1';
            
            return `
                <div class="subject-card ${levelClass}" onclick="gradeTracker.openSubjectModal('${this.escapeHtml(subject)}')" style="cursor: pointer;">
                    <div class="subject-header">
                        <span class="subject-name">${this.escapeHtml(subject)}</span>
                        <span class="subject-badge ${badgeClass}">${data.average.toFixed(2)}</span>
                    </div>
                    <div class="subject-stats">
                        <div class="subject-stat">
                            <span class="subject-stat-label">Jegyek</span>
                            <span class="subject-stat-value">${data.count}</span>
                        </div>
                        <div class="subject-stat">
                            <span class="subject-stat-label">Átlag</span>
                            <span class="subject-stat-value">${data.average.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="subject-grades">
                        ${data.grades.map(g => `<span class="grade-mini g${g}">${g}</span>`).join('')}
                    </div>
                    <div class="subject-click-hint">Kattints a részletekhez →</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Tantárgy modal megnyitása
     */
    openSubjectModal(subjectName) {
        this.currentEditingSubject = subjectName;
        const grades = this.data.grades.filter(g => g.subject === subjectName);
        
        // Súlyozott átlag számítás
        let totalWeight = 0;
        let weightedSum = 0;
        grades.forEach(g => {
            const weight = g.weight || 100;
            weightedSum += g.grade * weight;
            totalWeight += weight;
        });
        const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;
        
        document.getElementById('modalSubjectName').textContent = subjectName;
        document.getElementById('modalSubjectAvg').textContent = avg.toFixed(2);
        document.getElementById('modalSubjectCount').textContent = grades.length;
        
        const listContainer = document.getElementById('subjectGradesList');
        
        // Rendezés dátum szerint (legújabb elöl)
        const sortedGrades = [...grades].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (sortedGrades.length === 0) {
            listContainer.innerHTML = '<div class="empty-message"><p>Nincs jegy ehhez a tantárgyhoz</p></div>';
        } else {
            listContainer.innerHTML = sortedGrades.map(grade => {
                const date = new Date(grade.date);
                const dateStr = date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
                const weight = grade.weight || 100;
                
                // Jegy szín
                const gradeColors = {
                    1: '#ef4444',
                    2: '#f97316', 
                    3: '#eab308',
                    4: '#22c55e',
                    5: '#10b981'
                };
                const color = gradeColors[grade.grade] || '#6366f1';
                
                return `
                    <div class="grade-detail-item">
                        <div class="grade-detail-info">
                            <div class="grade-detail-value" style="background: ${color}">${grade.grade}</div>
                            <div class="grade-detail-meta">
                                <span class="grade-detail-type">${this.getTypeName(grade.type)}</span>
                                <span class="grade-detail-weight">Súly: ${weight}% • Dátum: ${dateStr}</span>
                            </div>
                        </div>
                        <div class="grade-detail-actions">
                            <button class="btn-edit-grade" onclick="gradeTracker.editGrade(${grade.id})" title="Szerkesztés">✏️</button>
                            <button class="btn-delete-grade-detail" onclick="gradeTracker.deleteGrade(${grade.id})" title="Törlés">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        document.getElementById('subjectModal').style.display = 'flex';
    }

    /**
     * Modal bezárása
     */
    closeSubjectModal() {
        document.getElementById('subjectModal').style.display = 'none';
        this.currentEditingSubject = null;
    }

    /**
     * Jegy szerkesztése - modalban
     */
    editGrade(gradeId) {
        const grade = this.data.grades.find(g => g.id === gradeId);
        if (!grade) return;
        
        // Modal tartalom csere edit módra
        const listContainer = document.getElementById('subjectGradesList');
        listContainer.innerHTML = `
            <div class="grade-edit-form">
                <h3>Jegy szerkesztése</h3>
                <div class="edit-form-group">
                    <label>Jegy (1-5):</label>
                    <div class="grade-select-options">
                        ${[1,2,3,4,5].map(n => `
                            <button class="grade-option ${grade.grade === n ? 'selected' : ''}" 
                                onclick="gradeTracker.updateGradeValue(${grade.id}, ${n}, this)">
                                ${n}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="edit-form-group">
                    <label>Súly (%):</label>
                    <input type="number" id="editWeight" value="${grade.weight || 100}" min="1" max="100">
                </div>
                <div class="edit-form-actions">
                    <button class="btn-cancel" onclick="gradeTracker.openSubjectModal('${this.currentEditingSubject}')">Mégse</button>
                    <button class="btn-save" onclick="gradeTracker.saveGradeEdit(${grade.id})">Mentés</button>
                </div>
            </div>
        `;
    }

    /**
     * Jegy érték frissítése a szerkesztésnél
     */
    updateGradeValue(gradeId, value, btn) {
        // Frissítés a DOM-ban
        document.querySelectorAll('.grade-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // Ideiglenes tárolás
        this.tempGradeValue = value;
    }

    /**
     * Szerkesztés mentése
     */
    saveGradeEdit(gradeId) {
        const grade = this.data.grades.find(g => g.id === gradeId);
        if (!grade) return;
        
        // Jegy frissítése
        if (this.tempGradeValue) {
            grade.grade = this.tempGradeValue;
        }
        
        // Súly frissítése
        const weightInput = document.getElementById('editWeight');
        if (weightInput) {
            const newWeight = parseInt(weightInput.value);
            if (newWeight >= 1 && newWeight <= 100) {
                grade.weight = newWeight;
            }
        }
        
        this.tempGradeValue = null;
        
        this.recalculateStats();
        this.saveData();
        this.renderAll();
        this.populateSubjectsList();
        
        // Modal újrarenderelés
        this.openSubjectModal(this.currentEditingSubject);
        
        this.showNotification('✅ Jegy módosítva!');
    }

    /**
     * Elemzések renderelése
     */
    renderAnalytics() {
        // Jegy eloszlás
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        this.data.grades.forEach(g => distribution[g.grade]++);
        
        const maxCount = Math.max(...Object.values(distribution));
        
        const distContainer = document.getElementById('gradeDistribution');
        distContainer.innerHTML = Object.entries(distribution).map(([grade, count]) => {
            const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return `
                <div class="distribution-row">
                    <span class="distribution-label">${grade}</span>
                    <div class="distribution-bar">
                        <div class="distribution-fill g${grade}" style="width: ${percent}%"></div>
                    </div>
                    <span class="distribution-count">${count}</span>
                </div>
            `;
        }).join('');
        
        // Legjobb tantárgyak
        const stats = this.getSubjectStats();
        const sorted = Object.entries(stats).sort((a, b) => b[1].average - a[1].average).slice(0, 3);
        
        const bestContainer = document.getElementById('bestSubjects');
        if (sorted.length === 0) {
            bestContainer.innerHTML = '<p class="no-warning">Nincs elég adat</p>';
        } else {
            bestContainer.innerHTML = sorted.map(([name, data]) => `
                <div class="best-subject">
                    <span class="best-subject-name">${this.escapeHtml(name)}</span>
                    <span class="best-subject-avg">${data.average.toFixed(2)}</span>
                </div>
            `).join('');
        }
        
        // Javításra szorul
        const improveContainer = document.getElementById('needsImprovement');
        const needsWork = Object.entries(stats).filter(([_, data]) => data.average < 3).slice(0, 3);
        
        if (needsWork.length === 0) {
            improveContainer.innerHTML = '<p class="no-warning">✅ Nincs javítanivaló!</p>';
        } else {
            improveContainer.innerHTML = needsWork.map(([name, data]) => `
                <div class="improve-subject">
                    <span class="improve-subject-name">${this.escapeHtml(name)}</span>
                    <span class="improve-subject-avg">${data.average.toFixed(2)}</span>
                </div>
            `).join('');
        }
    }

    /**
     * Legutóbbi jegyek renderelése
     */
    renderRecentGrades() {
        const container = document.getElementById('recentGrades');
        const recent = [...this.data.grades].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        if (recent.length === 0) {
            container.innerHTML = '<div class="empty-message"><p>Még nincs jegy</p></div>';
            return;
        }
        
        container.innerHTML = recent.map(grade => {
            const date = new Date(grade.date);
            const dateStr = date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
            
            return `
                <div class="recent-grade">
                    <div class="recent-grade-info">
                        <div class="recent-grade-value g${grade.grade}">${grade.grade}</div>
                        <div>
                            <div class="recent-grade-subject">${this.escapeHtml(grade.subject)}</div>
                            <div class="recent-grade-type">${this.getTypeName(grade.type)}</div>
                        </div>
                    </div>
                    <div class="recent-grade-actions">
                        <div class="recent-grade-date">${dateStr}</div>
                        <button class="btn-delete-grade" onclick="gradeTracker.deleteGrade(${grade.id})" title="Törlés">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Achievementek renderelése
     */
    renderAchievements() {
        const container = document.getElementById('achievementsGrid');
        
        container.innerHTML = this.achievementList.map(ach => {
            const unlocked = this.data.achievements.includes(ach.id);
            return `
                <div class="achievement ${unlocked ? 'unlocked' : ''}">
                    <div class="achievement-icon">${ach.icon}</div>
                    <div class="achievement-name">${ach.name}</div>
                    <div class="achievement-desc">${ach.desc}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Tantárgy lista populálás
     */
    populateSubjectsList() {
        const datalist = document.getElementById('subjectsList');
        datalist.innerHTML = this.data.subjects.map(s => 
            `<option value="${this.escapeHtml(s)}">`
        ).join('');
    }

    /**
     * Típus név magyarítása
     */
    getTypeName(type) {
        const types = {
            'dolgozat': 'Dolgozat',
            'zh': 'ZH',
            'nzh': 'Nyelvhelyesség',
            'felelés': 'Felelés',
            'projekt': 'Projekt',
            'egyéb': 'Egyéb'
        };
        return types[type] || type;
    }

    /**
     * Jegy törlése
     */
    deleteGrade(gradeId) {
        if (!confirm('Biztosan törlöd ezt a jegyet?')) return;
        
        this.data.grades = this.data.grades.filter(g => g.id !== gradeId);
        
        // Tantárgy lista frissítése (ha nincs már jegy hozzá)
        this.data.subjects = [...new Set(this.data.grades.map(g => g.subject))];
        
        // XP és level újraszámítás
        this.recalculateStats();
        
        this.saveData();
        this.renderAll();
        this.populateSubjectsList();
        
        // Ha modalban vagyunk, frissítsük
        if (this.currentEditingSubject) {
            this.openSubjectModal(this.currentEditingSubject);
        }
        
        this.showNotification('🗑️ Jegy törölve!');
    }

    /**
     * Statisztikák újraszámítása
     */
    recalculateStats() {
        // XP újraszámítás
        let totalXp = 0;
        this.data.grades.forEach(g => {
            totalXp += this.calculateXp(g.grade);
        });
        this.data.totalXp = totalXp;
        
        // Achievement XP hozzáadása (nem vonjuk vissza)
        this.data.achievements.forEach(achId => {
            const ach = this.achievementList.find(a => a.id === achId);
            if (ach) {
                // Ne adjunk hozzá XP-t újra, mert az már benne van
            }
        });
        
        this.calculateLevel();
    }

    /**
     * Reset minden adat
     */
    resetAll() {
        if (confirm('Biztosan törlöd az összes adatot? Ez nem vonható vissza!')) {
            this.data = {
                grades: [],
                subjects: [],
                totalXp: 0,
                level: 1,
                streakDays: 0,
                lastActive: null,
                achievements: []
            };
            this.saveData();
            this.renderAll();
            this.populateSubjectsList();
            this.showNotification('🔄 Minden adat törölve!');
        }
    }

    /**
     * HTML escape
     */
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
     * Értesítés
     */
    showNotification(message) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.remove(), 3000);
    }
}

// Inicializáció
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏆 Grade tracker betöltése...');
    window.gradeTracker = new GradeTracker();
});

