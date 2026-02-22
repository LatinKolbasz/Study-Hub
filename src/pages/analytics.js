/**
 * ============================================
 * Study Analytics Dashboard
 * ============================================
 * Részletes statisztikák a tanulási szokásokról
 * Chart.js diagramokkal és heatmap-pel
 */

class StudyAnalytics {
    constructor() {
        // Adat tárolók
        this.gradeData = null;
        this.timerData = null;
        this.quizData = null;
        this.assignmentData = null;
        
        // Felhasználó prefix
        this.userPrefix = '';
        
        // Chart példányok
        this.charts = {};
        
        // Szín paletta
        this.colors = {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#14b8a6',
            pink: '#ec4899',
            orange: '#f97316'
        };
        
        this.chartColors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', 
            '#f59e0b', '#ef4444', '#10b981', '#f97316'
        ];
        
        this.init();
    }

    /**
     * Inicializáció
     */
    async init() {
        console.log('📊 Study Analytics inicializálása...');
        
        // Bejelentkezés ellenőrzése
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            window.location.href = '../login.html';
            return;
        }

        // Felhasználó prefix beállítása
        this.setUserPrefix();
        
        // Adatok betöltése
        await this.loadAllData();
        
        // Canvas elemek ellenőrzése
        this.debugCanvasElements();
        
        // UI frissítés
        this.updateSummaryCards();
        // Defer chart rendering until after a paint/layout pass so Chart.js can measure canvases reliably
        requestAnimationFrame(() => {
            setTimeout(() => {
                try {
                    this.renderAllCharts();
                    this.renderHeatmap();
                    this.generateInsights();
                } catch (err) {
                    console.error('❌ Analytics render error:', err);
                    // optional: show user-facing notification
                    this.showNotification('Hiba a diagramok megjelenítésénél (console: Analytics render error)', 'error');
                }
            }, 50);
        });
        
        // Telemetria
        if (window.authManager && window.authManager.logPageView) {
            window.authManager.logPageView('analytics');
        }
        
        console.log('✅ Analytics kész!');
    }

    /**
     * Canvas elemek debug-olása
     */
    debugCanvasElements() {
        const canvasIds = [
            'studyTimeChart', 'gradeDistributionChart', 'subjectAvgChart',
            'xpProgressChart', 'quizPerformanceChart', 'modeDistributionChart', 'assignmentsChart'
        ];
        
        console.log('🔍 Canvas elemek ellenőrzése:');
        canvasIds.forEach(id => {
            const el = document.getElementById(id);
            console.log(`  - ${id}: ${el ? '✅ létezik' : '❌ NEM LÉTEZIK'}`);
            if (el) {
                console.log(`    - display: ${window.getComputedStyle(el).display}`);
                console.log(`    - width: ${el.width}, height: ${el.height}`);
                console.log(`    - parent: ${el.parentElement?.className}`);
            }
        });
    }

    /**
     * Felhasználó prefix beállítása
     */
    setUserPrefix() {
        if (window.authManager && window.authManager.currentUser) {
            const username = window.authManager.currentUser.username;
            const hash = this.simpleHash(username);
            this.userPrefix = `studyhub_${hash}_`;
            console.log('📁 Felhasználói prefix:', this.userPrefix);
        } else {
            this.userPrefix = '';
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
     * Összes adat betöltése
     */
    async loadAllData() {
        // Grade Tracker
        const gradeSaved = localStorage.getItem(this.userPrefix + 'gradeTracker');
        this.gradeData = gradeSaved ? JSON.parse(gradeSaved) : {
            grades: [],
            subjects: [],
            totalXp: 0,
            level: 1,
            streakDays: 0,
            achievements: []
        };
        
        // Study Timer - konzisztens kulcsnév: 'stats' (nem 'timerStats')
        const timerStats = localStorage.getItem(this.userPrefix + 'stats');
        this.timerData = timerStats ? JSON.parse(timerStats) : {
            completedSessions: 0,
            totalMinutes: 0,
            streak: 0
        };
        
        // Timer settings - konzisztens kulcsnév: 'settings' (nem 'timerSettings')
        const timerSettings = localStorage.getItem(this.userPrefix + 'settings');
        this.timerSettings = timerSettings ? JSON.parse(timerSettings) : {
            workTime: 25,
            breakTime: 5,
            longBreakTime: 15
        };
        
        // Quiz
        const quizzes = localStorage.getItem(this.userPrefix + 'quizzes');
        this.quizData = quizzes ? JSON.parse(quizzes) : [];
        
        // Quiz results history (ha van)
        const quizResults = localStorage.getItem(this.userPrefix + 'quizResults');
        this.quizResults = quizResults ? JSON.parse(quizResults) : [];
        
        // Assignments
        const assignments = localStorage.getItem(this.userPrefix + 'assignments');
        this.assignmentData = assignments ? JSON.parse(assignments) : [];
        
        // Study sessions history (utolsó 30 nap)
        this.studyHistory = this.generateStudyHistory();
        
        console.log('📊 Betöltött adatok:', {
            gradeData: !!gradeSaved,
            timerData: !!timerStats,
            timerSettings: !!timerSettings,
            quizData: this.quizData.length,
            assignmentData: this.assignmentData.length
        });
    }

    /**
     * Tanulási előzmény generálása (utolsó 30 nap)
     */
    generateStudyHistory() {
        const history = {};
        const today = new Date();
        
        // Initialize last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            history[dateStr] = {
                minutes: 0,
                sessions: 0,
                grades: 0,
                quizzes: 0
            };
        }
        
        // Timer adatok hozzáadása (ha van lastDate)
        if (this.timerData.lastDate) {
            const sessionMinutes = this.timerData.totalMinutes;
            const sessions = this.timerData.completedSessions;
            
            // Oszd el az időt a napokra (egyszerűsített)
            if (sessionMinutes > 0 && this.timerData.lastDate) {
                history[this.timerData.lastDate] = {
                    minutes: sessionMinutes,
                    sessions: sessions,
                    grades: 0,
                    quizzes: 0
                };
            }
        }
        
        // Grade adatok hozzáadása
        if (this.gradeData.grades) {
            this.gradeData.grades.forEach(grade => {
                const dateStr = new Date(grade.date).toISOString().split('T')[0];
                if (history[dateStr]) {
                    history[dateStr].grades++;
                }
            });
        }
        
        return history;
    }

    /**
     * Összesítő kártyák frissítése
     */
    updateSummaryCards() {
        // Összes tanulási idő
        const totalMinutes = this.timerData.totalMinutes || 0;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        document.getElementById('totalStudyTime').textContent = 
            hours > 0 ? `${hours}ó ${mins}p` : `${mins} perc`;
        
        // Sessions
        document.getElementById('totalSessions').textContent = 
            this.timerData.completedSessions || 0;
        
        // XP
        document.getElementById('totalXp').textContent = 
            this.gradeData.totalXp || 0;
        
        // Level
        document.getElementById('currentLevel').textContent = 
            this.gradeData.level || 1;
        
        // Streak
        const gradeStreak = this.gradeData.streakDays || 0;
        const timerStreak = this.timerData.streak || 0;
        document.getElementById('currentStreak').textContent = 
            Math.max(gradeStreak, timerStreak);
        
        // Átlag jegy
        const avgGrade = this.calculateAverageGrade();
        document.getElementById('avgGrade').textContent = 
            avgGrade > 0 ? avgGrade.toFixed(2) : '-';
        
        // Kvízek száma
        document.getElementById('totalQuizzes').textContent = 
            this.quizData.length || 0;
        
        // Kvíz átlag (ha vannak eredmények)
        const quizAvg = this.calculateQuizAverage();
        document.getElementById('quizAvg').textContent = 
            quizAvg > 0 ? `${Math.round(quizAvg)}%` : '-';
    }

    /**
     * Átlag jegy számítás
     */
    calculateAverageGrade() {
        if (!this.gradeData.grades || this.gradeData.grades.length === 0) {
            return 0;
        }
        
        let totalWeight = 0;
        let weightedSum = 0;
        
        this.gradeData.grades.forEach(g => {
            const weight = g.weight || 100;
            weightedSum += g.grade * weight;
            totalWeight += weight;
        });
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Kvíz átlag számítás
     */
    calculateQuizAverage() {
        if (this.quizResults.length === 0) {
            // Nincs mentett eredmény, nézzük meg a kvízeket
            return 0;
        }
        
        const totalPercent = this.quizResults.reduce((sum, r) => sum + r.percentage, 0);
        return totalPercent / this.quizResults.length;
    }

    /**
     * Összes chart renderelése
     */
    renderAllCharts() {
        console.log('🎨 Diagramok renderelése...');
        this.renderStudyTimeChart();
        this.renderGradeDistributionChart();
        this.renderSubjectAvgChart();
        this.renderXpProgressChart();
        this.renderQuizPerformanceChart();
        this.renderModeDistributionChart();
        this.renderAssignmentsChart();
        console.log('✅ Minden diagram elkészült');
    }

    /**
     * Napi tanulási idő chart (utolsó 7 nap)
     */
    renderStudyTimeChart() {
        const canvasEl = document.getElementById('studyTimeChart');
        if (!canvasEl) {
            console.error('❌ studyTimeChart nem található!');
            return;
        }
        
        const ctx = canvasEl.getContext('2d');
        
        // Utolsó 7 nap adatok
        const labels = [];
        const data = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('hu-HU', { weekday: 'short' });
            labels.push(dateStr);
            
            // Véletlenszerű adatok demo céljából (valóságban a studyHistory-ból)
            const randomMinutes = Math.floor(Math.random() * 120) + 10;
            data.push(randomMinutes);
        }
        
        // Ha van valós adat, használd azt
        if (this.timerData.totalMinutes > 0) {
            data[6] = this.timerData.totalMinutes;
        }
        
        this.charts.studyTime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tanulási idő (perc)',
                    data: data,
                    backgroundColor: '#6366f1',
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: { color: '#666' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#666' }
                    }
                }
            }
        });
    }

    /**
     * Jegy eloszlás torta chart
     */
    renderGradeDistributionChart() {
        const canvasEl = document.getElementById('gradeDistributionChart');
        if (!canvasEl) {
            console.error('❌ gradeDistributionChart nem található!');
            return;
        }
        
        const ctx = canvasEl.getContext('2d');
        
        // Jegy eloszlás számítás
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        if (this.gradeData.grades) {
            this.gradeData.grades.forEach(g => {
                distribution[g.grade]++;
            });
        }
        
        const hasData = Object.values(distribution).some(v => v > 0);
        
        if (!hasData) {
            // Demo adatok
            distribution[3] = 5;
            distribution[4] = 8;
            distribution[5] = 3;
        }
        
        this.charts.gradeDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['1-es', '2-es', '3-as', '4-es', '5-ös'],
                datasets: [{
                    data: Object.values(distribution),
                    backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#333', padding: 10, usePointStyle: true, pointStyle: 'circle' }
                    },
                    tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
                }
            }
        });
    }

    /**
     * Tantárgyak átlaga bar chart
     */
    renderSubjectAvgChart() {
        const canvasEl = document.getElementById('subjectAvgChart');
        if (!canvasEl) {
            console.error('❌ subjectAvgChart nem található!');
            return;
        }
        
        const ctx = canvasEl.getContext('2d');
        
        // Tantárgy statisztikák
        const subjectStats = {};
        
        if (this.gradeData.grades) {
            this.gradeData.grades.forEach(g => {
                if (!subjectStats[g.subject]) {
                    subjectStats[g.subject] = { total: 0, count: 0 };
                }
                subjectStats[g.subject].total += g.grade;
                subjectStats[g.subject].count++;
            });
        }
        
        const labels = Object.keys(subjectStats);
        const data = labels.map(subj => {
            return subjectStats[subj].count > 0 
                ? (subjectStats[subj].total / subjectStats[subj].count).toFixed(2)
                : 0;
        });
        
        // Demo adatok ha nincs valós
        if (labels.length === 0) {
            const demoSubjects = ['Matematika', 'Fizika', 'Történelem', 'Irodalom'];
            const demoAvgs = [4.2, 3.8, 4.5, 3.9];
            
            labels.push(...demoSubjects);
            data.push(...demoAvgs);
        }
        
        this.charts.subjectAvg = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Átlag',
                    data: data,
                    backgroundColor: labels.map((_, i) => this.chartColors[i % this.chartColors.length]),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 5,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: { color: '#666' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#666' }
                    }
                }
            }
        });
    }

    /**
     * XP fejlődés chart
     */
    renderXpProgressChart() {
        const canvasEl = document.getElementById('xpProgressChart');
        if (!canvasEl) {
            console.error('❌ xpProgressChart nem található!');
            return;
        }
        
        const ctx = canvasEl.getContext('2d');
        
        // XP trend (utolsó 7 nap)
        const labels = [];
        const data = [];
        let cumulativeXp = 0;
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
            labels.push(dateStr);
            
            // Demo adatok
            const dailyXp = Math.floor(Math.random() * 50) + 10;
            cumulativeXp += dailyXp;
            data.push(cumulativeXp);
        }
        
        // Valós XP hozzáadása
        if (this.gradeData.totalXp > 0) {
            data[6] = this.gradeData.totalXp;
        }
        
        this.charts.xpProgress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Összes XP',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: { color: '#666' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#666' }
                    }
                }
            }
        });
    }

    /**
     * Kvíz teljesítmény chart
     */
    renderQuizPerformanceChart() {
        const canvasEl = document.getElementById('quizPerformanceChart');
        if (!canvasEl) {
            console.error('❌ quizPerformanceChart nem található!');
            return;
        }
        
        const ctx = canvasEl.getContext('2d');
        
        // Kvíz eredmények
        let labels = [];
        let data = [];
        
        if (this.quizResults && this.quizResults.length > 0) {
            this.quizResults.slice(-7).forEach((result, i) => {
                labels.push(`Kvíz ${i + 1}`);
                data.push(result.percentage);
            });
        } else {
            // Demo adatok
            labels = ['Kvíz 1', 'Kvíz 2', 'Kvíz 3', 'Kvíz 4', 'Kvíz 5'];
            data = [75, 85, 60, 90, 80];
        }
        
        this.charts.quizPerformance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Eredmény %',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: { color: '#666', callback: (value) => `${value}%` }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#666' }
                    }
                }
            }
        });
    }

    /**
     * Módusz eloszlás chart
     */
    renderModeDistributionChart() {
        const canvasEl = document.getElementById('modeDistributionChart');
        if (!canvasEl) {
            console.error('❌ modeDistributionChart nem található!');
            return;
        }
        
        const ctx = canvasEl.getContext('2d');
        
        // Timer mode eloszlás
        const workPercent = this.timerData.completedSessions 
            ? (this.timerData.completedSessions * this.timerSettings.workTime / 
               (this.timerData.completedSessions * this.timerSettings.workTime + 
                this.timerData.completedSessions * this.timerSettings.breakTime)) * 100
            : 70;
        
        const finalWork = this.timerData.totalMinutes > 0 ? workPercent : 70;
        const finalBreak = 30;
        
        this.charts.modeDistribution = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Munka', 'Szünet'],
                datasets: [{
                    data: [finalWork, finalBreak],
                    backgroundColor: ['#6366f1', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#333', padding: 15, usePointStyle: true, pointStyle: 'circle' }
                    },
                    tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
                }
            }
        });
    }

    /**
     * Assignments chart
     */
    renderAssignmentsChart() {
        const canvasEl = document.getElementById('assignmentsChart');
        if (!canvasEl) {
            console.error('❌ assignmentsChart nem található!');
            return;
        }
        
        const ctx = canvasEl.getContext('2d');
        
        const completed = this.assignmentData 
            ? this.assignmentData.filter(a => a.completed).length 
            : 0;
        const pending = this.assignmentData 
            ? this.assignmentData.filter(a => !a.completed).length 
            : 0;
        
        // Demo adatok
        const finalCompleted = this.assignmentData ? completed : 12;
        const finalPending = this.assignmentData ? pending : 5;
        
        this.charts.assignments = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Teljesített', 'Függőben'],
                datasets: [{
                    data: [finalCompleted, finalPending],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#333', padding: 15, usePointStyle: true, pointStyle: 'circle' }
                    },
                    tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
                }
            }
        });
    }

    /**
     * Heatmap renderelése
     */
    renderHeatmap() {
        const container = document.getElementById('activityHeatmap');
        const today = new Date();
        const days = [];
        
        // Utolsó 28 nap (4 hét)
        for (let i = 27; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        
        // Aktivitási szintek számítása
        const activityData = {};
        
        // Timer adatok
        if (this.timerData.totalMinutes > 0 && this.timerData.lastDate) {
            const minutes = this.timerData.totalMinutes;
            if (minutes >= 120) activityData[this.timerData.lastDate] = 5;
            else if (minutes >= 60) activityData[this.timerData.lastDate] = 4;
            else if (minutes >= 30) activityData[this.timerData.lastDate] = 3;
            else if (minutes >= 15) activityData[this.timerData.lastDate] = 2;
            else activityData[this.timerData.lastDate] = 1;
        }
        
        // Grade adatok
        if (this.gradeData.grades) {
            this.gradeData.grades.forEach(g => {
                const dateStr = new Date(g.date).toISOString().split('T')[0];
                if (!activityData[dateStr]) activityData[dateStr] = 0;
                activityData[dateStr] = Math.min(5, activityData[dateStr] + 1);
            });
        }
        
        // HTML generálás
        let html = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">';
        
        days.forEach((date) => {
            const dateStr = date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
            const dateKey = date.toISOString().split('T')[0];
            const level = activityData[dateKey] || 0;
            
            const levelClass = level > 0 ? `has-activity level-${level}` : '';
            const tooltip = `${dateStr}: ${level > 0 ? 'Aktív' : 'Nincs aktivitás'}`;
            
            html += `<div class="heatmap-day ${levelClass}" title="${tooltip}"><span class="tooltip">${dateStr}</span></div>`;
        });
        
        html += '</div>';
        
        // Legend
        html += `
            <div class="heatmap-legend">
                <span>Kevés</span>
                <div class="heatmap-legend-item" style="background: #e2e8f0;"></div>
                <div class="heatmap-legend-item" style="background: #c7d2fe;"></div>
                <div class="heatmap-legend-item" style="background: #a5b4fc;"></div>
                <div class="heatmap-legend-item" style="background: #818cf8;"></div>
                <div class="heatmap-legend-item" style="background: #6366f1;"></div>
                <div class="heatmap-legend-item" style="background: #4f46e5;"></div>
                <span>Sok</span>
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Megállapítások generálása
     */
    generateInsights() {
        const insights = [];
        
        // Streak insight
        const streak = Math.max(this.gradeData.streakDays || 0, this.timerData.streak || 0);
        
        if (streak >= 7) {
            insights.push({ type: 'achievement', title: '🔥 Heti Streak!', text: `Már ${streak} napja tanulsz megszakítás nélkül! Szuper!` });
        } else if (streak >= 3) {
            insights.push({ type: 'positive', title: '🌟 Jó kezdet!', text: `${streak} napos streak-et építesz. Folytasd így!` });
        }
        
        // Jegy insight
        const avg = this.calculateAverageGrade();
        if (avg >= 4.5) {
            insights.push({ type: 'achievement', title: '⭐ Kiváló átlag!', text: `Az ${avg.toFixed(2)} átlagod fantasztikus!` });
        } else if (avg < 3 && avg > 0) {
            insights.push({ type: 'warning', title: '📚 Van javítási lehetőség', text: 'Érdemes többet tanulni a gyengébb tantárgyakból.' });
        }
        
        // Tanulási idő insight
        const totalMinutes = this.timerData.totalMinutes || 0;
        if (totalMinutes >= 600) {
            insights.push({ type: 'achievement', title: '⏱️ Több mint 10 óra!', text: 'Már több mint 10 órát tanultál! Szorgalmas vagy!' });
        } else if (totalMinutes >= 60) {
            insights.push({ type: 'positive', title: '💪 Szép mennyiség', text: `${Math.floor(totalMinutes / 60)} óra ${totalMinutes % 60} perc tanulás. Jól haladsz!` });
        }
        
        // Kvíz insight
        if (this.quizData.length > 0) {
            const quizAvg = this.calculateQuizAverage();
            if (quizAvg >= 80) {
                insights.push({ type: 'positive', title: '🎯 Kvíz mester!', text: `Átlagosan ${Math.round(quizAvg)}%-os eredményt érsz el a kvízekben!` });
            }
        }
        
        // Assignments insight
        const completed = this.assignmentData ? this.assignmentData.filter(a => a.completed).length : 0;
        const pending = this.assignmentData ? this.assignmentData.filter(a => !a.completed).length : 0;
        
        if (pending > 5) {
            insights.push({ type: 'warning', title: '⏰ Van függőben', text: `${pending} beadandó vár még rád. Ne halaszd!` });
        } else if (completed > 0 && pending === 0) {
            insights.push({ type: 'achievement', title: '✅ Minden kész!', text: 'Az összes beadandódat teljesítetted. Szuper!' });
        }
        
        // XP insight
        if (this.gradeData.totalXp >= 500) {
            insights.push({ type: 'achievement', title: '⚡ XP Mester!', text: `Már ${this.gradeData.totalXp} XP-t gyűjtöttél!` });
        }
        
        // Ha nincs elég insight, adjunk általánosakat
        if (insights.length < 3) {
            insights.push({ type: 'info', title: '📖 Tanulj rendszeresen', text: 'A legjobb eredményeket rendszeres, kisebb tanulással érheted el.' });
            if (this.gradeData.grades && this.gradeData.grades.length < 5) {
                insights.push({ type: 'info', title: '📝 Adj hozzá jegyeket', text: 'Több jegy hozzáadásával pontosabb statisztikákat kaphatsz.' });
            }
        }
        
        this.renderInsights(insights);
    }

    /**
     * Insights renderelése
     */
    renderInsights(insights) {
        const container = document.getElementById('insightsGrid');
        
        const icons = { achievement: '🏆', positive: '✨', warning: '⚠️', info: '💡' };
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-title"><span>${icons[insight.type]}</span> ${insight.title}</div>
                <div class="insight-text">${insight.text}</div>
            </div>
        `).join('');
    }

    /**
     * Értesítés megjelenítése
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

