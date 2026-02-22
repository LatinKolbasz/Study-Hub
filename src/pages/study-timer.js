/**
 * ============================================
 * StudyTimerManager - Pomodoro Timer
 * ============================================
 * Kezeli a Pomodoro timer funkcionalitast:
 * - Munka es szunet idok kezelese
 * - Statisztikak nyilvantartasa
 * - Hangjelzesek
 * - localStorage ba mentes
 */

class StudyTimerManager {
    constructor() {
        // Alapertelmezett beallitasok
        this.settings = {
            workTime: 25,
            breakTime: 5,
            longBreakTime: 15,
            sessionsBeforeLong: 4,
            soundEnabled: true
        };

        this.userPrefix = 'timer'; // Alapértelmezett, felülírásra kerül

        // Timer allapot
        this.state = {
            isRunning: false,
            isPaused: false,
            currentMode: 'work', // 'work', 'break', 'longBreak'
            timeRemaining: this.settings.workTime * 60,
            currentSession: 1,
            totalSessions: 0,
            intervalId: null
        };

        // Statisztikak
        this.stats = {
            completedSessions: 0,
            totalMinutes: 0,
            lastDate: null,
            streak: 0
        };

        this.init();
    }

    /**
     * Inicializacio
     */
    init() {
        console.log('⏱️ StudyTimerManager inicializálása...');
        
        // Bejelentkezés ellenőrzése
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            window.location.href = '../login.html';
            return;
        }

        // Felhasználó prefix beállítása
        this.setUserPrefix();
        
        this.loadSettings();
        this.loadStats();
        this.updateDisplay();
        this.updateStatsDisplay();
        this.updateSessionCounter();
        this.setModeClass();

        // Telemetria
        if (window.authManager && window.authManager.logPageView) {
            window.authManager.logPageView('study-timer');
        }
    }

    /**
     * Felhasználó prefix beállítása
     */
    setUserPrefix() {
        if (window.authManager && window.authManager.currentUser) {
            const username = window.authManager.currentUser.username;
            const hash = this.simpleHash(username);
            this.userPrefix = `studyhub_${hash}_timer`;
            console.log('📁 Felhasználói prefix:', this.userPrefix);
        } else {
            this.userPrefix = 'timer';
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
     * Beallitasok betoltese localStorage-bol
     */
    loadSettings() {
        // Konzisztens kulcsnév: 'settings' (nem 'Settings')
        const saved = localStorage.getItem(this.userPrefix + 'settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Inputok frissitese
        document.getElementById('workTime').value = this.settings.workTime;
        document.getElementById('breakTime').value = this.settings.breakTime;
        document.getElementById('longBreakTime').value = this.settings.longBreakTime;
        document.getElementById('sessionsBeforeLong').value = this.settings.sessionsBeforeLong;
        document.getElementById('soundEnabled').checked = this.settings.soundEnabled;

        // Timer alaphelyzetbe allitasa
        this.state.timeRemaining = this.settings.workTime * 60;
    }

    /**
     * Beallitasok mentese localStorage-ba
     */
    saveSettings() {
        // Konzisztens kulcsnév: 'settings' (nem 'Settings')
        localStorage.setItem(this.userPrefix + 'settings', JSON.stringify(this.settings));
    }

    /**
     * Statisztikak betoltese
     */
    loadStats() {
        // Konzisztens kulcsnév: 'stats' (nem 'Stats')
        const saved = localStorage.getItem(this.userPrefix + 'stats');
        if (saved) {
            this.stats = JSON.parse(saved);
        }

        // Ellenorizzuk, hogy ma mar volt-e aktivitas
        const today = new Date().toDateString();
        if (this.stats.lastDate !== today) {
            // Ha nem ma volt az utolso, ellenorizzuk a streat
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (this.stats.lastDate === yesterday.toDateString()) {
                // Tegnap is volt aktivitas, streaket megtartjuk
            } else if (this.stats.lastDate !== null) {
                // Mas nap volt, streak nullazas
                this.stats.streak = 0;
            }
        }
    }

    /**
     * Statisztikak mentese
     */
    saveStats() {
        // Konzisztens kulcsnév: 'stats' (nem 'Stats')
        localStorage.setItem(this.userPrefix + 'stats', JSON.stringify(this.stats));
    }

    /**
     * Beallitasok frissitese
     */
    updateSettings() {
        this.settings.workTime = parseInt(document.getElementById('workTime').value) || 25;
        this.settings.breakTime = parseInt(document.getElementById('breakTime').value) || 5;
        this.settings.longBreakTime = parseInt(document.getElementById('longBreakTime').value) || 15;
        this.settings.sessionsBeforeLong = parseInt(document.getElementById('sessionsBeforeLong').value) || 4;

        this.saveSettings();

        // Ha nincs futo timer, frissitsuk a megjelenitest
        if (!this.state.isRunning && !this.state.isPaused) {
            this.state.timeRemaining = this.settings.workTime * 60;
            this.updateDisplay();
        }

        this.updateSessionCounter();
        this.showNotification('✅ Beállítások mentve!');
    }

    /**
     * Hang be/ki kapcsolasa
     */
    toggleSound() {
        this.settings.soundEnabled = document.getElementById('soundEnabled').checked;
        this.saveSettings();
    }

    /**
     * Timer inditasa
     */
    startTimer() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.state.isPaused = false;

        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-flex';
        document.querySelector('.timer-circle').classList.add('running');

        this.state.intervalId = setInterval(() => {
            this.state.timeRemaining--;
            this.updateDisplay();
            this.updateProgressCircle();

            if (this.state.timeRemaining <= 0) {
                this.handlePhaseComplete();
            }
        }, 1000);

        this.showNotification('▶️ Timer elindítva!');
    }

    /**
     * Timer szüneteltetése
     */
    pauseTimer() {
        if (!this.state.isRunning) return;

        this.state.isRunning = false;
        this.state.isPaused = true;

        clearInterval(this.state.intervalId);

        document.getElementById('startBtn').style.display = 'inline-flex';
        document.getElementById('pauseBtn').style.display = 'none';
        document.querySelector('.timer-circle').classList.remove('running');

        document.getElementById('startBtn').innerHTML = '<span class="btn-icon">▶️</span> Folytatás';

        this.showNotification('⏸️ Timer szüneteltetve');
    }

    /**
     * Timer ujrainditasa
     */
    resetTimer() {
        clearInterval(this.state.intervalId);
        
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.state.currentSession = 1;
        this.state.currentMode = 'work';
        this.state.timeRemaining = this.settings.workTime * 60;

        document.getElementById('startBtn').style.display = 'inline-flex';
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('startBtn').innerHTML = '<span class="btn-icon">▶️</span> Indítás';
        document.querySelector('.timer-circle').classList.remove('running');

        this.updateDisplay();
        this.updateProgressCircle();
        this.updateSessionCounter();
        this.setModeClass();

        this.showNotification('🔄 Timer alaphelyzetben');
    }

    /**
     * Ugrás a kovetkezo fazisra
     */
    skipPhase() {
        this.handlePhaseComplete();
    }

    /**
     * Fazis befejezesenek kezelese
     */
    handlePhaseComplete() {
        clearInterval(this.state.intervalId);
        
        // Hangjelzes
        if (this.settings.soundEnabled) {
            this.playNotificationSound();
        }

        // Modus valtas
        if (this.state.currentMode === 'work') {
            // Munka befejezve
            this.stats.completedSessions++;
            this.stats.totalMinutes += this.settings.workTime;
            this.stats.lastDate = new Date().toDateString();
            
            // Streak frissites
            const today = new Date().toDateString();
            if (this.stats.lastDate === today) {
                // Ellenorizzuk, hogy tegnap is volt-e
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (this.stats.lastDate === yesterday.toDateString()) {
                    this.stats.streak++;
                } else if (this.stats.streak === 0) {
                    this.stats.streak = 1;
                }
            }
            
            this.saveStats();
            this.updateStatsDisplay();

            // Szunet mod
            if (this.state.currentSession >= this.settings.sessionsBeforeLong) {
                this.state.currentMode = 'longBreak';
                this.state.timeRemaining = this.settings.longBreakTime * 60;
                this.state.currentSession = 1;
                this.showNotification('🎉 Nagyszerű munka! Most pihenj egy nagyot!');
            } else {
                this.state.currentMode = 'break';
                this.state.timeRemaining = this.settings.breakTime * 60;
                this.showNotification('☕ Pihenj egy kicsit!');
            }
        } else {
            // Szunet befejezve, vissza munkahoz
            this.state.currentMode = 'work';
            this.state.timeRemaining = this.settings.workTime * 60;
            this.state.currentSession++;
            this.showNotification('💪 Kész a pihenés, vissza a munkához!');
        }

        // UI frissites
        this.state.isRunning = false;
        this.state.isPaused = false;
        
        document.getElementById('startBtn').style.display = 'inline-flex';
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('startBtn').innerHTML = '<span class="btn-icon">▶️</span> Indítás';
        document.querySelector('.timer-circle').classList.remove('running');

        this.updateDisplay();
        this.updateProgressCircle();
        this.updateSessionCounter();
        this.setModeClass();
    }

    /**
     * Idomero megjelenites frissitese
     */
    updateDisplay() {
        const minutes = Math.floor(this.state.timeRemaining / 60);
        const seconds = this.state.timeRemaining % 60;
        
        document.getElementById('timerDisplay').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Modus szoveg
        const modeTexts = {
            'work': '🍅 Munka',
            'break': '☕ Rövid szünet',
            'longBreak': '🌴 Hosszú szünet'
        };
        document.getElementById('timerMode').textContent = modeTexts[this.state.currentMode];
    }

    /**
     * Kor progressz frissitese
     */
    updateProgressCircle() {
        const circle = document.getElementById('progressCircle');
        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        
        let totalTime;
        if (this.state.currentMode === 'work') {
            totalTime = this.settings.workTime * 60;
        } else if (this.state.currentMode === 'break') {
            totalTime = this.settings.breakTime * 60;
        } else {
            totalTime = this.settings.longBreakTime * 60;
        }

        const progress = (totalTime - this.state.timeRemaining) / totalTime;
        const offset = circumference * (1 - progress);
        
        circle.style.strokeDashoffset = offset;
    }

    /**
     * Munkamenet szamlalo frissitese
     */
    updateSessionCounter() {
        document.getElementById('sessionCounter').textContent = 
            `${this.state.currentSession}/${this.settings.sessionsBeforeLong}`;
    }

    /**
     * Modus osztaly beallitasa
     */
    setModeClass() {
        const container = document.querySelector('.timer-container');
        container.classList.remove('mode-work', 'mode-break', 'mode-long-break');
        
        if (this.state.currentMode === 'work') {
            container.classList.add('mode-work');
        } else if (this.state.currentMode === 'break') {
            container.classList.add('mode-break');
        } else {
            container.classList.add('mode-long-break');
        }
    }

    /**
     * Statisztika megjelenites frissitese
     */
    updateStatsDisplay() {
        document.getElementById('completedSessions').textContent = this.stats.completedSessions;
        document.getElementById('totalMinutes').textContent = this.stats.totalMinutes;
        document.getElementById('currentStreak').textContent = this.stats.streak;
    }

    /**
     * Statisztikak torlese
     */
    clearStats() {
        if (confirm('Biztosan torolni szeretned az osszes statisztikat?')) {
            this.stats = {
                completedSessions: 0,
                totalMinutes: 0,
                lastDate: null,
                streak: 0
            };
            this.saveStats();
            this.updateStatsDisplay();
            this.showNotification('📉 Statisztikak torolve!');
        }
    }

    /**
     * Hangjelzes lejatszasa
     */
    playNotificationSound() {
        // Egyszeru beep hang Web Audio API-val
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Elso hang (magas)
            this.playTone(audioContext, 880, 0.1, 0);
            // Masodik hang (meg magasabb)
            this.playTone(audioContext, 1100, 0.1, 0.15);
            // Harmadik hang (meg magasabb)
            this.playTone(audioContext, 1320, 0.2, 0.3);
            
        } catch (e) {
            console.warn('Hang lejatszasi hiba:', e);
        }
    }

    /**
     * Egy hang lejatszasa
     */
    playTone(audioContext, frequency, duration, delay) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + duration);
        
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + duration);
    }

    /**
     * Ertesites megjelenitese
     */
    showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.remove(), 3000);
    }
}

// Inicializacio
document.addEventListener('DOMContentLoaded', () => {
    console.log('⏱️ Timer oldal betöltése...');
    window.timerManager = new StudyTimerManager();
});

