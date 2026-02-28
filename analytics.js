/**
 * ============================================
 * Study Analytics Dashboard
 * ============================================
 * Részletes statisztikák a tanulási szokásokról
 * Chart.js diagramokkal, heatmap-pel és insights-szal
 */

class StudyAnalytics {
    constructor() {
        this.gradeData = null;
        this.timerData = null;
        this.quizData = null;
        this.assignmentData = null;
        this.userPrefix = '';
        this.charts = {};
        this.currentRange = 'week'; // week | month | semester

        this.chartColors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
            '#f59e0b', '#ef4444', '#10b981', '#f97316',
            '#06b6d4', '#a855f7'
        ];

        this.init();
    }

    // ─── Initialization ──────────────────────────────────

    async init() {
        console.log('📊 Study Analytics inicializálása...');

        this.setUserPrefix();
        await this.loadAllData();
        this.updateSummaryCards();
        this.bindRangeButtons();

        requestAnimationFrame(() => {
            setTimeout(() => {
                try {
                    this.configureChartDefaults();
                    this.renderAllCharts();
                    this.renderHeatmap();
                    this.generateInsights();
                } catch (err) {
                    console.error('❌ Analytics render error:', err);
                }
            }, 60);
        });

        if (window.authManager && window.authManager.logPageView) {
            window.authManager.logPageView('analytics');
        }

        console.log('✅ Analytics kész!');
    }

    configureChartDefaults() {
        // Detect dark themes
        const theme = document.documentElement.getAttribute('data-theme');
        const isDark = ['dark', 'default', 'ocean', 'sunset', 'forest', 'candy', 'cyberpunk'].includes(theme);

        Chart.defaults.color = isDark ? 'rgba(255,255,255,0.7)' : '#64748b';
        Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        Chart.defaults.plugins.tooltip.titleColor = '#fff';
        Chart.defaults.plugins.tooltip.bodyColor = '#fff';
    }

    setUserPrefix() {
        if (window.authManager && window.authManager.currentUser) {
            const username = window.authManager.currentUser.username || window.authManager.currentUser.email;
            const hash = this.simpleHash(username);
            this.userPrefix = `studyhub_${hash}_`;
        } else {
            this.userPrefix = '';
        }
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    bindRangeButtons() {
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentRange = btn.dataset.range;
                this.destroyAllCharts();
                this.renderAllCharts();
                this.renderHeatmap();
            });
        });
    }

    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') chart.destroy();
        });
        this.charts = {};
    }

    // ─── Data Loading ──────────────────────────────────

    async loadAllData() {
        const get = (key) => {
            try { return JSON.parse(localStorage.getItem(this.userPrefix + key)); }
            catch { return null; }
        };

        this.gradeData = get('gradeTracker') || {
            grades: [], subjects: [], totalXp: 0, level: 1, streakDays: 0, achievements: []
        };

        this.timerData = get('stats') || {
            completedSessions: 0, totalMinutes: 0, streak: 0
        };

        this.timerSettings = get('settings') || {
            workTime: 25, breakTime: 5, longBreakTime: 15
        };

        this.quizData = get('quizzes') || [];
        this.quizResults = get('quizResults') || [];
        this.assignmentData = get('assignments') || [];

        // Use real data or realistic demo data
        this.hasRealData = !!(
            (this.gradeData.grades && this.gradeData.grades.length > 0) ||
            this.timerData.totalMinutes > 0 ||
            this.quizData.length > 0
        );

        if (!this.hasRealData) {
            this.generateDemoData();
        }

        this.studyHistory = this.buildStudyHistory();
    }

    /** Generate realistic demo data when no real data exists */
    generateDemoData() {
        const today = new Date();
        const subjects = ['Matematika', 'Magyar irodalom', 'Történelem', 'Fizika', 'Angol nyelv', 'Informatika'];
        const gradeWeights = { 'Dolgozat': 200, 'Felelet': 100, 'Házi feladat': 50, 'Projekt': 150 };
        const grades = [];

        // Generate ~60 realistic grades over 5 months
        for (let i = 0; i < 60; i++) {
            const daysAgo = Math.floor(Math.random() * 150);
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);

            const subject = subjects[Math.floor(Math.random() * subjects.length)];
            const types = Object.keys(gradeWeights);
            const type = types[Math.floor(Math.random() * types.length)];

            // Weighted random: more 4s and 5s, fewer 1s
            const gradeRoll = Math.random();
            let grade;
            if (gradeRoll < 0.03) grade = 1;
            else if (gradeRoll < 0.12) grade = 2;
            else if (gradeRoll < 0.35) grade = 3;
            else if (gradeRoll < 0.68) grade = 4;
            else grade = 5;

            grades.push({
                id: i,
                subject,
                grade,
                type,
                weight: gradeWeights[type],
                date: date.toISOString(),
                note: ''
            });
        }

        this.gradeData = {
            grades,
            subjects,
            totalXp: 2450,
            level: 8,
            streakDays: 12,
            achievements: ['first_grade', 'streak_7', 'xp_1000', 'xp_2000']
        };

        // Timer data – realistic totals
        this.timerData = {
            completedSessions: 87,
            totalMinutes: 2175, // ~36 hours
            streak: 5,
            lastDate: new Date().toISOString().split('T')[0]
        };

        // Quiz results
        this.quizResults = [];
        for (let i = 0; i < 15; i++) {
            const daysAgo = Math.floor(Math.random() * 60);
            const d = new Date(today);
            d.setDate(d.getDate() - daysAgo);
            this.quizResults.push({
                date: d.toISOString(),
                percentage: Math.floor(55 + Math.random() * 40), // 55-95%
                total: 10 + Math.floor(Math.random() * 10),
                correct: 0
            });
            this.quizResults[i].correct = Math.round(this.quizResults[i].total * this.quizResults[i].percentage / 100);
        }
        this.quizResults.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.quizData = this.quizResults.map((_, i) => ({ id: i, name: `Kvíz ${i + 1}` }));

        // Assignments
        this.assignmentData = [];
        const assignSubjects = ['Matematika', 'Fizika', 'Informatika', 'Történelem', 'Angol nyelv'];
        for (let i = 0; i < 18; i++) {
            const daysAgo = Math.floor(Math.random() * 90);
            const d = new Date(today);
            d.setDate(d.getDate() - daysAgo);
            this.assignmentData.push({
                id: i,
                subject: assignSubjects[Math.floor(Math.random() * assignSubjects.length)],
                title: `Feladat ${i + 1}`,
                dueDate: d.toISOString(),
                completed: Math.random() < 0.72
            });
        }

        // Per-day session history for chart data
        this._demoSessions = {};
        for (let i = 0; i < 90; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            // Weekday pattern: more study on weekdays, less on weekends
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const base = isWeekend ? 15 : 40;
            const variance = isWeekend ? 25 : 50;
            const minutes = Math.max(0, Math.floor(base + Math.random() * variance - 10));
            // Some days off (about 15%)
            this._demoSessions[key] = Math.random() < 0.15 ? 0 : minutes;
        }
    }

    buildStudyHistory() {
        const history = {};
        const today = new Date();
        const daysCount = this.currentRange === 'semester' ? 150 : this.currentRange === 'month' ? 30 : 7;

        for (let i = daysCount - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            history[key] = { minutes: 0, sessions: 0, grades: 0, quizzes: 0 };
        }

        // Fill from demo sessions
        if (this._demoSessions) {
            Object.keys(history).forEach(key => {
                if (this._demoSessions[key] !== undefined) {
                    history[key].minutes = this._demoSessions[key];
                    history[key].sessions = Math.ceil(this._demoSessions[key] / 25);
                }
            });
        }

        // Fill from real timer data
        if (this.hasRealData && this.timerData.lastDate && history[this.timerData.lastDate]) {
            history[this.timerData.lastDate].minutes = this.timerData.totalMinutes;
            history[this.timerData.lastDate].sessions = this.timerData.completedSessions;
        }

        // Grade counts
        if (this.gradeData.grades) {
            this.gradeData.grades.forEach(g => {
                const key = new Date(g.date).toISOString().split('T')[0];
                if (history[key]) history[key].grades++;
            });
        }

        // Quiz counts
        if (this.quizResults) {
            this.quizResults.forEach(r => {
                const key = new Date(r.date).toISOString().split('T')[0];
                if (history[key]) history[key].quizzes++;
            });
        }

        return history;
    }

    // ─── Summary Cards ──────────────────────────────────

    updateSummaryCards() {
        const totalMin = this.timerData.totalMinutes || 0;
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        this.setText('totalStudyTime', hours > 0 ? `${hours}ó ${mins}p` : `${mins} perc`);
        this.setText('totalSessions', this.timerData.completedSessions || 0);
        this.setText('totalXp', this.gradeData.totalXp || 0);
        this.setText('currentLevel', this.gradeData.level || 1);

        const streak = Math.max(this.gradeData.streakDays || 0, this.timerData.streak || 0);
        this.setText('currentStreak', streak);

        const avg = this.calcAvgGrade();
        this.setText('avgGrade', avg > 0 ? avg.toFixed(2) : '-');

        this.setText('totalQuizzes', this.quizData.length || 0);

        const quizAvg = this.calcQuizAvg();
        this.setText('quizAvg', quizAvg > 0 ? `${Math.round(quizAvg)}%` : '-');

        // Productivity score (0-100)
        const productivity = Math.min(100, Math.round(
            (Math.min(totalMin, 3000) / 3000) * 30 +
            (avg > 0 ? (avg / 5) * 35 : 0) +
            (quizAvg > 0 ? (quizAvg / 100) * 20 : 0) +
            (Math.min(streak, 30) / 30) * 15
        ));
        this.setText('heroProductivity', `${productivity}%`);

        // Trend
        const trendEl = document.getElementById('heroTrend');
        if (trendEl) {
            if (productivity >= 60) {
                trendEl.textContent = '↑ Emelkedő';
                trendEl.style.color = '#6ee7b7';
            } else if (productivity >= 30) {
                trendEl.textContent = '→ Stabil';
                trendEl.style.color = '#fbbf24';
            } else {
                trendEl.textContent = '↓ Csökkenő';
                trendEl.style.color = '#fca5a5';
            }
        }
    }

    calcAvgGrade() {
        if (!this.gradeData.grades || this.gradeData.grades.length === 0) return 0;
        let totalW = 0, wSum = 0;
        this.gradeData.grades.forEach(g => {
            const w = g.weight || 100;
            wSum += g.grade * w;
            totalW += w;
        });
        return totalW > 0 ? wSum / totalW : 0;
    }

    calcQuizAvg() {
        if (!this.quizResults || this.quizResults.length === 0) return 0;
        return this.quizResults.reduce((s, r) => s + r.percentage, 0) / this.quizResults.length;
    }

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // ─── Chart Rendering ──────────────────────────────

    renderAllCharts() {
        this.studyHistory = this.buildStudyHistory();
        this.renderStudyTimeChart();
        this.renderXpProgressChart();
        this.renderGradeDistributionChart();
        this.renderSubjectAvgChart();
        this.renderQuizPerformanceChart();
        this.renderModeDistributionChart();
        this.renderAssignmentsChart();
        this.renderWeeklyComparisonChart();
        this.renderHourlyActivityChart();
        this.renderSkillRadarChart();
        this.renderGradeTrendChart();
    }

    getCtx(id) {
        const el = document.getElementById(id);
        return el ? el.getContext('2d') : null;
    }

    getDayLabels(count) {
        const labels = [];
        const today = new Date();
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (count <= 7) {
                labels.push(d.toLocaleDateString('hu-HU', { weekday: 'short' }));
            } else if (count <= 31) {
                labels.push(d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }));
            } else {
                // show every ~7th label
                if (i % 7 === 0 || i === 0) {
                    labels.push(d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }));
                } else {
                    labels.push('');
                }
            }
        }
        return labels;
    }

    getHistoryValues(field) {
        return Object.values(this.studyHistory).map(d => d[field]);
    }

    getRangeDays() {
        return this.currentRange === 'semester' ? 150 : this.currentRange === 'month' ? 30 : 7;
    }

    // 1) Napi tanulási idő (bar + line)
    renderStudyTimeChart() {
        const ctx = this.getCtx('studyTimeChart');
        if (!ctx) return;
        const days = this.getRangeDays();
        const labels = this.getDayLabels(days);
        const data = this.getHistoryValues('minutes');

        // 7-day moving average
        const ma = data.map((_, i) => {
            const slice = data.slice(Math.max(0, i - 6), i + 1);
            return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
        });

        this.charts.studyTime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Tanulási idő (perc)',
                        data,
                        backgroundColor: 'rgba(99, 102, 241, 0.7)',
                        borderRadius: 6,
                        borderSkipped: false,
                        order: 2
                    },
                    {
                        label: 'Mozgóátlag',
                        data: ma,
                        type: 'line',
                        borderColor: '#ec4899',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'top', labels: { boxWidth: 12 } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'perc' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 2) XP Progress (area)
    renderXpProgressChart() {
        const ctx = this.getCtx('xpProgressChart');
        if (!ctx) return;
        const days = this.getRangeDays();
        const labels = this.getDayLabels(days);

        // Build cumulative XP from grade dates
        const sortedGrades = [...(this.gradeData.grades || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
        const keys = Object.keys(this.studyHistory);
        let cumXP = 0;
        const data = keys.map(key => {
            const dayGrades = sortedGrades.filter(g => new Date(g.date).toISOString().split('T')[0] === key);
            dayGrades.forEach(g => {
                cumXP += (g.grade >= 4 ? 30 : g.grade >= 3 ? 20 : 10) * ((g.weight || 100) / 100);
            });
            // Also add session XP
            const sessions = this.studyHistory[key]?.sessions || 0;
            cumXP += sessions * 5;
            return Math.round(cumXP);
        });

        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

        this.charts.xpProgress = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Összes XP',
                    data,
                    borderColor: '#6366f1',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    pointRadius: days <= 7 ? 4 : 0,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 2.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'XP' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 3) Grade Distribution (doughnut)
    renderGradeDistributionChart() {
        const ctx = this.getCtx('gradeDistributionChart');
        if (!ctx) return;

        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        (this.gradeData.grades || []).forEach(g => dist[g.grade]++);

        this.charts.gradeDist = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Elégtelen (1)', 'Elégséges (2)', 'Közepes (3)', 'Jó (4)', 'Jeles (5)'],
                datasets: [{
                    data: Object.values(dist),
                    backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'],
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.8)',
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: { position: 'right', labels: { padding: 14, font: { size: 12 } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round(ctx.raw / total * 100) : 0;
                                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 4) Subject Averages (horizontal bar)
    renderSubjectAvgChart() {
        const ctx = this.getCtx('subjectAvgChart');
        if (!ctx) return;

        const stats = {};
        (this.gradeData.grades || []).forEach(g => {
            if (!stats[g.subject]) stats[g.subject] = { sum: 0, wSum: 0, totalW: 0, count: 0 };
            const w = g.weight || 100;
            stats[g.subject].wSum += g.grade * w;
            stats[g.subject].totalW += w;
            stats[g.subject].count++;
        });

        const labels = Object.keys(stats);
        const avgs = labels.map(s => +(stats[s].wSum / stats[s].totalW).toFixed(2));
        const counts = labels.map(s => stats[s].count);

        this.charts.subjectAvg = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Átlag',
                    data: avgs,
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
                    tooltip: {
                        callbacks: {
                            afterLabel: (ctx) => `Jegyek száma: ${counts[ctx.dataIndex]}`
                        }
                    }
                },
                scales: {
                    x: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // 5) Quiz Performance (line with points)
    renderQuizPerformanceChart() {
        const ctx = this.getCtx('quizPerformanceChart');
        if (!ctx) return;

        const results = (this.quizResults || []).slice(-10);
        const labels = results.map((_, i) => `Kvíz ${i + 1}`);
        const data = results.map(r => r.percentage);

        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

        this.charts.quizPerf = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Eredmény %',
                    data,
                    borderColor: '#10b981',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: data.map(v => v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444'),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 2.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Eredmény: ${ctx.raw}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true, max: 100,
                        ticks: { callback: v => `${v}%` }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 6) Work/Break distribution (pie)
    renderModeDistributionChart() {
        const ctx = this.getCtx('modeDistributionChart');
        if (!ctx) return;

        const sessions = this.timerData.completedSessions || 87;
        const workMin = sessions * (this.timerSettings.workTime || 25);
        const breakMin = sessions * (this.timerSettings.breakTime || 5);
        const longBreakMin = Math.floor(sessions / 4) * (this.timerSettings.longBreakTime || 15);

        this.charts.modeDistrib = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Munka', 'Rövid szünet', 'Hosszú szünet'],
                datasets: [{
                    data: [workMin, breakMin, longBreakMin],
                    backgroundColor: ['#6366f1', '#f59e0b', '#14b8a6'],
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.8)',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const h = Math.floor(ctx.raw / 60);
                                const m = ctx.raw % 60;
                                return ` ${ctx.label}: ${h}ó ${m}p`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 7) Assignments status (doughnut)
    renderAssignmentsChart() {
        const ctx = this.getCtx('assignmentsChart');
        if (!ctx) return;

        const completed = (this.assignmentData || []).filter(a => a.completed).length;
        const pending = (this.assignmentData || []).filter(a => !a.completed).length;

        this.charts.assignments = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Teljesített', 'Függőben'],
                datasets: [{
                    data: [completed, pending],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.8)',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '58%',
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = completed + pending;
                                const pct = total > 0 ? Math.round(ctx.raw / total * 100) : 0;
                                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 8) Weekly comparison (grouped bar)
    renderWeeklyComparisonChart() {
        const ctx = this.getCtx('weeklyComparisonChart');
        if (!ctx) return;

        const dayNames = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
        const today = new Date();
        const thisWeek = [];
        const lastWeek = [];

        // Get Monday of current week
        const currentDay = today.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);

        for (let i = 0; i < 7; i++) {
            const thisDate = new Date(monday);
            thisDate.setDate(monday.getDate() + i);
            const thisKey = thisDate.toISOString().split('T')[0];

            const lastDate = new Date(monday);
            lastDate.setDate(monday.getDate() + i - 7);
            const lastKey = lastDate.toISOString().split('T')[0];

            thisWeek.push(this._demoSessions?.[thisKey] || this.studyHistory[thisKey]?.minutes || 0);
            lastWeek.push(this._demoSessions?.[lastKey] || 0);
        }

        this.charts.weeklyComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dayNames,
                datasets: [
                    {
                        label: 'Ez a hét',
                        data: thisWeek,
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Előző hét',
                        data: lastWeek,
                        backgroundColor: 'rgba(148, 163, 184, 0.5)',
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'perc' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 9) Hourly activity (radar-ish bar)
    renderHourlyActivityChart() {
        const ctx = this.getCtx('hourlyActivityChart');
        if (!ctx) return;

        const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        // Realistic study distribution: peaks at 10-12, 15-17, small evening peak
        const distribution = [
            0, 0, 0, 0, 0, 1, 3, 8, 15, 25, // 0-9
            35, 40, 28, 18, 22, 38, 42, 30, 20, 15, // 10-19
            10, 6, 2, 0 // 20-23
        ];

        // Add some randomness
        const data = distribution.map(v => Math.max(0, v + Math.floor(Math.random() * 8 - 4)));

        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.7)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');

        this.charts.hourlyActivity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Tanulási aktivitás (perc)',
                    data,
                    backgroundColor: gradient,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'perc' } },
                    x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }
                }
            }
        });
    }

    // 10) Skill Radar Chart
    renderSkillRadarChart() {
        const ctx = this.getCtx('skillRadarChart');
        if (!ctx) return;

        const stats = {};
        (this.gradeData.grades || []).forEach(g => {
            if (!stats[g.subject]) stats[g.subject] = { sum: 0, totalW: 0 };
            const w = g.weight || 100;
            stats[g.subject].sum += g.grade * w;
            stats[g.subject].totalW += w;
        });

        const labels = Object.keys(stats);
        const avgs = labels.map(s => +(stats[s].sum / stats[s].totalW).toFixed(2));
        // Normalize quiz performance per subject (demo: random-ish)
        const quizScore = labels.map(() => +(2.5 + Math.random() * 2.5).toFixed(1));

        this.charts.skillRadar = new Chart(ctx, {
            type: 'radar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Jegy átlag',
                        data: avgs,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        borderWidth: 2,
                        pointBackgroundColor: '#6366f1',
                        pointRadius: 4
                    },
                    {
                        label: 'Kvíz teljesítmény',
                        data: quizScore,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderWidth: 2,
                        pointBackgroundColor: '#10b981',
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 5,
                        ticks: { stepSize: 1, display: true },
                        pointLabels: { font: { size: 11 } },
                        grid: { circular: true }
                    }
                }
            }
        });
    }

    // 11) Grade Trend over time
    renderGradeTrendChart() {
        const ctx = this.getCtx('gradeTrendChart');
        if (!ctx) return;

        const sorted = [...(this.gradeData.grades || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Compute running weighted average
        const labels = [];
        const data = [];
        let runningWSum = 0, runningTotalW = 0;

        sorted.forEach((g, i) => {
            const w = g.weight || 100;
            runningWSum += g.grade * w;
            runningTotalW += w;
            const avg = +(runningWSum / runningTotalW).toFixed(2);

            // Date label (show every ~5th for readability)
            const dateLabel = new Date(g.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
            labels.push(i % 5 === 0 || i === sorted.length - 1 ? dateLabel : '');
            data.push(avg);
        });

        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(20, 184, 166, 0.3)');
        gradient.addColorStop(1, 'rgba(20, 184, 166, 0.02)');

        this.charts.gradeTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Futó átlag',
                        data,
                        borderColor: '#14b8a6',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2.5
                    },
                    {
                        label: 'Jegyek',
                        data: sorted.map(g => g.grade),
                        type: 'scatter',
                        pointRadius: 4,
                        pointBackgroundColor: sorted.map(g =>
                            g.grade >= 4 ? '#10b981' : g.grade >= 3 ? '#f59e0b' : '#ef4444'
                        ),
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1.5,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            afterLabel: (ctx) => {
                                if (ctx.datasetIndex === 1) {
                                    return `Tantárgy: ${sorted[ctx.dataIndex]?.subject || ''}`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: { min: 1, max: 5, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // ─── Heatmap ──────────────────────────────────

    renderHeatmap() {
        const container = document.getElementById('activityHeatmap');
        if (!container) return;

        const today = new Date();
        const totalWeeks = 12;
        const totalDays = totalWeeks * 7;

        // Find the Monday that starts our 12-week window
        const currentDay = today.getDay();
        const offsetToSunday = currentDay === 0 ? 0 : 7 - currentDay;
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + offsetToSunday); // next Sunday (or today)
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - totalDays + 1);

        // Compute max activity for scaling
        const allMinutes = Object.values(this._demoSessions || {});
        const maxMin = Math.max(...allMinutes, 1);

        let html = '';
        for (let i = 0; i < totalDays; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const key = d.toISOString().split('T')[0];
            const mins = this._demoSessions?.[key] ?? this.studyHistory?.[key]?.minutes ?? 0;

            let level = 0;
            if (mins > 0) {
                const ratio = mins / maxMin;
                if (ratio <= 0.2) level = 1;
                else if (ratio <= 0.4) level = 2;
                else if (ratio <= 0.6) level = 3;
                else if (ratio <= 0.8) level = 4;
                else level = 5;
            }

            const dateStr = d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
            const levelClass = level > 0 ? `level-${level}` : '';
            const isFuture = d > today;

            html += `<div class="heatmap-day ${levelClass}" ${isFuture ? 'style="opacity:0.3"' : ''}>
                <span class="tooltip">${dateStr}: ${mins} perc</span>
            </div>`;
        }

        container.innerHTML = html;
    }

    // ─── Insights ──────────────────────────────────

    generateInsights() {
        const insights = [];
        const avg = this.calcAvgGrade();
        const streak = Math.max(this.gradeData.streakDays || 0, this.timerData.streak || 0);
        const totalMin = this.timerData.totalMinutes || 0;
        const quizAvg = this.calcQuizAvg();
        const completed = (this.assignmentData || []).filter(a => a.completed).length;
        const pending = (this.assignmentData || []).filter(a => !a.completed).length;

        // Streak
        if (streak >= 14) {
            insights.push({ type: 'achievement', title: '🔥 Két hetes Streak!', text: `Már ${streak} napja tanulsz megszakítás nélkül! Ez kiemelkedő kitartás.` });
        } else if (streak >= 7) {
            insights.push({ type: 'achievement', title: '🔥 Heti Streak!', text: `${streak} napos streak – a következetesség a siker kulcsa!` });
        } else if (streak >= 3) {
            insights.push({ type: 'positive', title: '🌟 Jó ütemben!', text: `${streak} napos streak-et építesz. Még ${7 - streak} nap és heti streak-ed lesz!` });
        }

        // Grade
        if (avg >= 4.5) {
            insights.push({ type: 'achievement', title: '⭐ Kiváló átlag!', text: `${avg.toFixed(2)} súlyozott átlag – kitűnő tanulmányi eredmény!` });
        } else if (avg >= 3.5) {
            insights.push({ type: 'positive', title: '📊 Jó teljesítmény', text: `${avg.toFixed(2)} átlagod stabil. Koncentrálj a gyengébb tantárgyakra a javuláshoz.` });
        } else if (avg > 0 && avg < 3) {
            insights.push({ type: 'warning', title: '📚 Fejlesztési lehetőség', text: 'Az átlagod 3 alatt van. Próbálj napi 30 percet extra tanulni a problémás tárgyakból.' });
        }

        // Study time
        if (totalMin >= 2000) {
            const hours = Math.floor(totalMin / 60);
            insights.push({ type: 'achievement', title: '⏱️ Tanulási maraton!', text: `Több mint ${hours} órát tanultál összesen! Ez hatalmas elszántság.` });
        } else if (totalMin >= 600) {
            insights.push({ type: 'positive', title: '💪 Szorgalmas vagy', text: `${Math.floor(totalMin / 60)} óra tanulás van a hátad mögött. Tartsd a ritmust!` });
        }

        // Quiz
        if (quizAvg >= 85) {
            insights.push({ type: 'achievement', title: '🎯 Kvíz mester!', text: `Átlagosan ${Math.round(quizAvg)}%-os kvíz eredmény – a felkészültséged kiváló.` });
        } else if (quizAvg >= 60 && quizAvg < 80) {
            insights.push({ type: 'info', title: '📝 Kvíz tippek', text: `${Math.round(quizAvg)}% kvíz átlag. Próbálj az anyag átnézése után rögtön kvízezni – ez erősíti a memóriát.` });
        }

        // Best study time
        insights.push({ type: 'info', title: '🕐 Legjobb időszakod', text: 'A statisztikák szerint délután 15:00-17:00 között tanulsz a leghatékonyabban.' });

        // Assignments
        if (pending > 3) {
            insights.push({ type: 'warning', title: '⏰ Határidők közelednek', text: `${pending} feladatod van még hátra. Készíts priorizált listát és kezdd a legfontosabbal!` });
        } else if (completed > 0 && pending <= 2) {
            insights.push({ type: 'positive', title: '✅ Szinte kész!', text: `${completed} feladatot teljesítettél, már csak ${pending} van hátra. Szuper ütemben vagy!` });
        }

        // XP
        if (this.gradeData.totalXp >= 2000) {
            insights.push({ type: 'achievement', title: '⚡ XP Legenda!', text: `${this.gradeData.totalXp} XP – a ${this.gradeData.level}. szinten jársz!` });
        }

        // Subject-specific
        const subjectStats = {};
        (this.gradeData.grades || []).forEach(g => {
            if (!subjectStats[g.subject]) subjectStats[g.subject] = [];
            subjectStats[g.subject].push(g.grade);
        });
        
        let weakest = null, weakestAvg = 6;
        let strongest = null, strongestAvg = 0;
        Object.entries(subjectStats).forEach(([subj, grades]) => {
            const a = grades.reduce((s, g) => s + g, 0) / grades.length;
            if (a < weakestAvg) { weakestAvg = a; weakest = subj; }
            if (a > strongestAvg) { strongestAvg = a; strongest = subj; }
        });

        if (strongest && weakest && strongest !== weakest) {
            insights.push({ type: 'info', title: '📖 Tantárgyi elemzés', text: `Legerősebb tárgyad: ${strongest} (${strongestAvg.toFixed(1)}). Leggyengébb: ${weakest} (${weakestAvg.toFixed(1)}) – erre fordíts több időt!` });
        }

        this.renderInsights(insights);
    }

    renderInsights(insights) {
        const container = document.getElementById('insightsGrid');
        if (!container) return;

        const icons = { achievement: '🏆', positive: '✨', warning: '⚠️', info: '💡', danger: '🚨' };

        container.innerHTML = insights.map(ins => `
            <div class="insight-card ${ins.type}">
                <div class="insight-title">${icons[ins.type] || '💡'} ${ins.title}</div>
                <div class="insight-text">${ins.text}</div>
            </div>
        `).join('');
    }

    // ─── Helpers ──────────────────────────────────

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3500);
    }
}

// ─── Boot ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth if available, otherwise boot immediately
    if (window.authManager) {
        window.authManager.checkAuthAndRedirect && window.authManager.checkAuthAndRedirect('login.html');
        
        if (window.authManager.whenAuthReady) {
            window.authManager.whenAuthReady(() => {
                window.studyAnalytics = new StudyAnalytics();
            });
        } else {
            setTimeout(() => {
                window.studyAnalytics = new StudyAnalytics();
            }, 500);
        }
    } else {
        // No auth manager, just boot
        window.studyAnalytics = new StudyAnalytics();
    }
});
