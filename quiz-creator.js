/**
 * ============================================
 * QuizManager - Kvíz Készítő és Megoldó
 * ============================================
 * Kezeli a kvízek létrehozását és megoldását:
 * - Kvíz létrehozás kérdésekkel és válaszokkal
 * - Helyes válasz kijelölése
 * - Kvíz megoldása
 * - Eredmények megjelenítése
 * - localStorage mentés
 */

class QuizManager {
    constructor() {
        this.quizzes = [];
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.questionCount = 0;
        this.userPrefix = 'quizzes'; // Alapértelmezett, felülírásra kerül
        
        this.init();
    }

    /**
     * Inicializáció
     */
    init() {
        console.log('📝 QuizManager inicializálása...');
        
        // Bejelentkezés ellenőrzése
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            // Login átirányítás kikapcsolva
            // window.location.href = '../login.html';
            return;
        }

        // Felhasználó prefix beállítása
        this.setUserPrefix();
        
        this.loadQuizzes();
        this.renderQuizList();

        // URL paraméterek ellenőrzése (megosztott kvíz importálása)
        this.checkUrlParams();

        // Telemetria
        if (window.authManager && window.authManager.logPageView) {
            window.authManager.logPageView('quiz-creator');
        }
    }

    /**
     * Felhasználó prefix beállítása
     */
    setUserPrefix() {
        if (window.authManager && window.authManager.currentUser) {
            const username = window.authManager.currentUser.username;
            const hash = this.simpleHash(username);
            this.userPrefix = `studyhub_${hash}_quizzes`;
            console.log('📁 Felhasználói prefix:', this.userPrefix);
        } else {
            this.userPrefix = 'quizzes';
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
     * Kvízek betöltése localStorage-ból + Firestore-ból
     */
    loadQuizzes() {
        const saved = localStorage.getItem(this.userPrefix);
        this.quizzes = saved ? JSON.parse(saved) : [];
        
        // Firestore-ból is betöltés (aszinkron)
        this.loadQuizzesFromFirestore();
    }

    /**
     * Kvízek mentése localStorage-ba + Firestore-ba
     */
    saveQuizzes() {
        localStorage.setItem(this.userPrefix, JSON.stringify(this.quizzes));
        this.syncQuizzesToFirestore();
    }

    /**
     * Kvízek szinkronizálása Firestore-ba
     */
    syncQuizzesToFirestore() {
        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) return;
            const user = firebase.auth().currentUser;
            if (!user) return;

            const db = firebase.firestore();
            db.collection('quizzes').doc(user.uid).set({
                quizzes: this.quizzes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                userEmail: user.email || ''
            }).then(() => {
                console.log('☁️ Kvízek szinkronizálva a felhőbe');
            }).catch(error => {
                console.warn('⚠️ Firestore quiz sync hiba:', error.message);
            });
        } catch (e) {
            console.warn('⚠️ Quiz sync hiba:', e.message);
        }
    }

    /**
     * Kvízek betöltése Firestore-ból
     */
    async loadQuizzesFromFirestore() {
        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) return;
            
            // Várjuk meg a Firebase user-t
            const checkUser = () => {
                return new Promise((resolve) => {
                    const check = setInterval(() => {
                        const user = firebase.auth().currentUser;
                        if (user) {
                            clearInterval(check);
                            resolve(user);
                        }
                    }, 500);
                    setTimeout(() => { clearInterval(check); resolve(null); }, 10000);
                });
            };

            const user = firebase.auth().currentUser || await checkUser();
            if (!user) return;

            const db = firebase.firestore();
            const doc = await db.collection('quizzes').doc(user.uid).get();
            
            if (!doc.exists) {
                console.log('📭 Nincs mentett kvíz a felhőben');
                // Ha van helyi adat, töltsük fel
                if (this.quizzes.length > 0) {
                    this.syncQuizzesToFirestore();
                }
                return;
            }

            const cloudData = doc.data();
            if (!cloudData.quizzes || !Array.isArray(cloudData.quizzes)) return;

            // Ha a felhőben több kvíz van, használjuk azt
            if (cloudData.quizzes.length > this.quizzes.length || 
                (cloudData.quizzes.length > 0 && this.quizzes.length === 0)) {
                this.quizzes = cloudData.quizzes;
                localStorage.setItem(this.userPrefix, JSON.stringify(this.quizzes));
                this.renderQuizList();
                console.log('☁️ Kvízek betöltve a felhőből:', this.quizzes.length, 'db');
            } else if (this.quizzes.length > cloudData.quizzes.length) {
                // Ha helyi több van, szinkronizáljuk fel
                this.syncQuizzesToFirestore();
            }
        } catch (error) {
            console.warn('⚠️ Firestore quiz betöltés hiba:', error.message);
        }
    }

    /**
     * Kvíz lista megjelenítése
     */
    renderQuizList() {
        const list = document.getElementById('quizList');
        
        if (this.quizzes.length === 0) {
            list.innerHTML = '<div class="empty-message"><p>📭 Még nincs kvízed. Készíts egy újat!</p></div>';
            return;
        }

        list.innerHTML = this.quizzes.map((quiz, index) => `
            <div class="quiz-item">
                <div class="quiz-item-info">
                    <h3>${this.escapeHtml(quiz.title)}</h3>
                    <p>${quiz.description || 'Nincs leírás'}</p>
                </div>
                <div class="quiz-item-meta">
                    <span class="quiz-item-stats">${quiz.questions.length} kérdés</span>
                    <div class="quiz-item-actions">
                        <button class="btn-quiz-action play" onclick="quizManager.startQuiz(${index})">
                            ▶️ Indítás
                        </button>
                        <button class="btn-quiz-action share" onclick="quizManager.shareQuiz(${index})">
                            🔗
                        </button>
                        <button class="btn-quiz-action delete" onclick="quizManager.deleteQuiz(${index})">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Új kvíz létrehozása szekció megjelenítése
     */
    showCreateSection() {
        document.getElementById('quizListSection').style.display = 'none';
        document.getElementById('createSection').style.display = 'block';
        document.getElementById('takeSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        
        // Alapértelmezett 2 kérdés hozzáadása
        document.getElementById('questionsContainer').innerHTML = '';
        this.addQuestion();
        this.addQuestion();
    }

    /**
     * Lista szekció megjelenítése
     */
    showListSection() {
        document.getElementById('quizListSection').style.display = 'block';
        document.getElementById('createSection').style.display = 'none';
        document.getElementById('takeSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        this.renderQuizList();
    }

    /**
     * Kérdés hozzáadása
     */
    addQuestion() {
        this.questionCount++;
        const container = document.getElementById('questionsContainer');
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-card-create';
        questionDiv.dataset.questionId = this.questionCount;
        
        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-number-badge">Kérdés ${this.questionCount}</span>
                <button class="btn-remove-question" onclick="quizManager.removeQuestion(${this.questionCount})">×</button>
            </div>
            <input type="text" class="question-input" placeholder="Írd be a kérdést..." data-question="${this.questionCount}">
            <div class="answers-section">
                <h4>Válaszlehetőségek</h4>
                <div class="answer-row">
                    <input type="radio" name="correct-${this.questionCount}" value="0" class="answer-checkbox">
                    <input type="text" class="answer-input" placeholder="1. válasz" data-answer="${this.questionCount}-0">
                </div>
                <div class="answer-row">
                    <input type="radio" name="correct-${this.questionCount}" value="1" class="answer-checkbox">
                    <input type="text" class="answer-input" placeholder="2. válasz" data-answer="${this.questionCount}-1">
                </div>
                <div class="answer-row">
                    <input type="radio" name="correct-${this.questionCount}" value="2" class="answer-checkbox">
                    <input type="text" class="answer-input" placeholder="3. válasz" data-answer="${this.questionCount}-2">
                </div>
                <div class="answer-row">
                    <input type="radio" name="correct-${this.questionCount}" value="3" class="answer-checkbox">
                    <input type="text" class="answer-input" placeholder="4. válasz" data-answer="${this.questionCount}-3">
                </div>
                <p class="correct-label">○ jelöld be a helyes választ</p>
            </div>
        `;
        
        container.appendChild(questionDiv);
    }

    /**
     * Kérdés eltávolítása
     */
    removeQuestion(id) {
        const question = document.querySelector(`[data-question-id="${id}"]`);
        if (question) {
            question.remove();
            // Újraszámozás
            this.renumberQuestions();
        }
    }

    /**
     * Kérdések újraszámozása
     */
    renumberQuestions() {
        const questions = document.querySelectorAll('.question-card-create');
        this.questionCount = 0;
        
        questions.forEach((q, index) => {
            this.questionCount++;
            q.dataset.questionId = this.questionCount;
            q.querySelector('.question-number-badge').textContent = `Kérdés ${this.questionCount}`;
            q.querySelector('.question-input').dataset.question = this.questionCount;
            
            // Radio button name és answer data actualización
            const radios = q.querySelectorAll('.answer-checkbox');
            radios.forEach((radio, i) => {
                radio.name = `correct-${this.questionCount}`;
                radio.dataset.answerId = `${this.questionCount}-${i}`;
            });
            
            const inputs = q.querySelectorAll('.answer-input');
            inputs.forEach((input, i) => {
                input.dataset.answer = `${this.questionCount}-${i}`;
            });
        });
    }

    /**
     * Kvíz mentése
     */
    saveQuiz() {
        const title = document.getElementById('quizTitle').value.trim();
        const description = document.getElementById('quizDescription').value.trim();
        
        if (!title) {
            this.showNotification('❌ Adj nevet a kvíznek!');
            return;
        }

        const questions = [];
        const questionElements = document.querySelectorAll('.question-card-create');
        
        if (questionElements.length === 0) {
            this.showNotification('❌ Adj hozzá legalább egy kérdést!');
            return;
        }

        questionElements.forEach((q) => {
            const questionId = q.dataset.questionId;
            const questionText = q.querySelector('.question-input').value.trim();
            
            if (!questionText) return;

            const answers = [];
            let correctAnswer = -1;
            
            const answerInputs = q.querySelectorAll('.answer-input');
            answerInputs.forEach((input, index) => {
                const text = input.value.trim();
                if (text) {
                    answers.push(text);
                }
            });

            // Helyes válasz kikeresése
            const correctRadio = q.querySelector(`input[name="correct-${questionId}"]:checked`);
            if (correctRadio) {
                correctAnswer = parseInt(correctRadio.value);
            }

            if (answers.length >= 2 && correctAnswer >= 0) {
                questions.push({
                    question: questionText,
                    answers: answers,
                    correctAnswer: correctAnswer
                });
            }
        });

        if (questions.length === 0) {
            this.showNotification('❌ Tölts ki legalább egy teljes kérdést (kérdés + 2 válasz + helyes válasz)!');
            return;
        }

        const quiz = {
            id: Date.now(),
            title: title,
            description: description,
            questions: questions,
            createdAt: new Date().toISOString()
        };

        this.quizzes.push(quiz);
        this.saveQuizzes();
        
        // Űrlap reset
        document.getElementById('quizTitle').value = '';
        document.getElementById('quizDescription').value = '';
        document.getElementById('questionsContainer').innerHTML = '';
        this.questionCount = 0;
        
        this.showNotification('✅ Kvíz elmentve!');
        this.showListSection();
    }

    /**
     * Kvíz törlése
     */
    deleteQuiz(index) {
        if (confirm('Biztosan törölni szeretnéd ezt a kvízt?')) {
            this.quizzes.splice(index, 1);
            this.saveQuizzes();
            this.renderQuizList();
            this.showNotification('🗑️ Kvíz törölve!');
        }
    }

    /**
     * Kvíz indítása
     */
    startQuiz(index) {
        this.currentQuiz = this.quizzes[index];
        this.currentQuestionIndex = 0;
        this.userAnswers = new Array(this.currentQuiz.questions.length).fill(-1);
        
        document.getElementById('quizListSection').style.display = 'none';
        document.getElementById('createSection').style.display = 'none';
        document.getElementById('takeSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        
        document.getElementById('takeQuizTitle').textContent = this.currentQuiz.title;
        document.getElementById('totalQuestions').textContent = this.currentQuiz.questions.length;
        
        this.renderQuestion();
    }

    /**
     * Kérdés megjelenítése
     */
    renderQuestion() {
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        
        document.getElementById('questionNumber').textContent = this.currentQuestionIndex + 1;
        document.getElementById('currentQuestionNum').textContent = this.currentQuestionIndex + 1;
        document.getElementById('questionText').textContent = question.question;
        
        const answersContainer = document.getElementById('answersContainer');
        answersContainer.innerHTML = question.answers.map((answer, index) => `
            <label class="answer-option ${this.userAnswers[this.currentQuestionIndex] === index ? 'selected' : ''}">
                <input type="radio" name="answer" value="${index}" 
                    ${this.userAnswers[this.currentQuestionIndex] === index ? 'checked' : ''}>
                <span>${this.escapeHtml(answer)}</span>
            </label>
        `).join('');
        
        // Válasz kiválasztás esemény
        answersContainer.querySelectorAll('.answer-option').forEach(option => {
            option.addEventListener('click', () => {
                const radio = option.querySelector('input');
                this.userAnswers[this.currentQuestionIndex] = parseInt(radio.value);
                this.renderQuestion();
            });
        });
        
        // Navigációs gombok
        document.getElementById('prevBtn').style.display = this.currentQuestionIndex > 0 ? 'block' : 'none';
        
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            document.getElementById('nextBtn').style.display = 'block';
            document.getElementById('finishBtn').style.display = 'none';
        } else {
            document.getElementById('nextBtn').style.display = 'none';
            document.getElementById('finishBtn').style.display = 'block';
        }
    }

    /**
     * Előző kérdés
     */
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderQuestion();
        }
    }

    /**
     * Következő kérdés
     */
    nextQuestion() {
        if (this.userAnswers[this.currentQuestionIndex] === -1) {
            this.showNotification('⚠️ Válaszolj a kérdésre!');
            return;
        }
        
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
        }
    }

    /**
     * Kvíz befejezése
     */
    finishQuiz() {
        if (this.userAnswers[this.currentQuestionIndex] === -1) {
            this.showNotification('⚠️ Válaszolj a kérdésre!');
            return;
        }
        
        this.showResults();
    }

    /**
     * Eredmények megjelenítése
     */
    showResults() {
        document.getElementById('quizListSection').style.display = 'none';
        document.getElementById('createSection').style.display = 'none';
        document.getElementById('takeSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        
        let correctCount = 0;
        const results = this.currentQuiz.questions.map((question, index) => {
            const userAnswer = this.userAnswers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            if (isCorrect) correctCount++;
            
            return {
                question: question.question,
                answers: question.answers,
                userAnswer: userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: isCorrect
            };
        });
        
        const totalQuestions = this.currentQuiz.questions.length;
        const percentage = Math.round((correctCount / totalQuestions) * 100);
        
        // Eredmény összefoglaló
        document.getElementById('scorePercent').textContent = `${percentage}%`;
        document.getElementById('correctCount').textContent = correctCount;
        document.getElementById('wrongCount').textContent = totalQuestions - correctCount;
        document.getElementById('totalCount').textContent = totalQuestions;
        
        // Százalék szín beállítása
        const scoreCircle = document.getElementById('scoreCircle');
        if (percentage >= 70) {
            scoreCircle.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else if (percentage >= 50) {
            scoreCircle.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        } else {
            scoreCircle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
        
        // Részletes eredmények
        const breakdown = document.getElementById('resultsBreakdown');
        breakdown.innerHTML = results.map((result, index) => `
            <div class="result-item ${result.isCorrect ? 'correct' : 'wrong'}">
                <div class="result-question">${this.escapeHtml(result.question)}</div>
                <div class="result-answers">
                    ${result.answers.map((answer, i) => `
                        <div ${i === result.correctAnswer ? 'class="correct-answer"' : ''} 
                             ${i === result.userAnswer && !result.isCorrect ? 'class="your-answer"' : ''}>
                            ${i === result.userAnswer ? '• ' : ''}${this.escapeHtml(answer)}
                            ${i === result.correctAnswer ? ' ✓ (helyes)' : ''}
                            ${i === result.userAnswer && !result.isCorrect ? ' (te választottad)' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // Eredmény üzenet
        let message = '';
        if (percentage >= 90) {
            message = '🎉 Nagyszerű! Tökéletes munka!';
        } else if (percentage >= 70) {
            message = '👏 Jó munka! Folytasd így!';
        } else if (percentage >= 50) {
            message = '💪 Nem rossz, de van még mit tanulni!';
        } else {
            message = '📚 Gyakorolj még egy kicsit!';
        }
        
        this.showNotification(message);
    }

    // ============================================
    // MEGOSZTÁS / SHARING
    // ============================================

    /**
     * Rövid megosztási kód generálása
     */
    generateShareCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Kvíz megosztása
     */
    async shareQuiz(index) {
        const quiz = this.quizzes[index];
        if (!quiz) {
            this.showNotification('❌ Kvíz nem található!');
            return;
        }

        const shareCode = this.generateShareCode();
        
        // Megosztandó kvíz adat (helyes válaszok nélkül a biztonság kedvéért - de megtartjuk, mert kiértékeléshez kell)
        const sharedQuiz = {
            title: quiz.title,
            description: quiz.description || '',
            questions: quiz.questions,
            sharedAt: new Date().toISOString(),
            shareCode: shareCode
        };

        let shared = false;

        // 1. Próba: Firestore
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const db = firebase.firestore();
                await db.collection('shared_quizzes').doc(shareCode).set(sharedQuiz);
                shared = true;
                console.log('☁️ Kvíz megosztva Firestore-on:', shareCode);
            }
        } catch (e) {
            console.warn('⚠️ Firestore share hiba:', e.message);
        }

        // 2. Próba: Szerver API
        if (!shared) {
            try {
                const response = await fetch('/api/share-quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quiz: sharedQuiz, shareCode: shareCode })
                });
                const result = await response.json();
                if (result.success) {
                    shared = true;
                    console.log('🖥️ Kvíz megosztva szerveren:', shareCode);
                }
            } catch (e) {
                console.warn('⚠️ Server share hiba:', e.message);
            }
        }

        if (shared) {
            this.showShareModal(shareCode);
        } else {
            // Utolsó mentsvár: Base64 kódolás linkbe
            this.showShareModal(shareCode, sharedQuiz);
        }
    }

    /**
     * Megosztás modal megjelenítése
     */
    showShareModal(shareCode, fallbackQuiz = null) {
        const overlay = document.getElementById('shareModalOverlay');
        const codeEl = document.getElementById('shareCodeValue');
        const linkInput = document.getElementById('shareLinkInput');

        codeEl.textContent = shareCode;

        // Link generálása
        const baseUrl = window.location.origin + window.location.pathname;
        if (fallbackQuiz) {
            // Ha sem Firestore sem szerver nem működik, base64 kódolás a linkbe
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(fallbackQuiz))));
            linkInput.value = `${baseUrl}?import=${encoded}`;
        } else {
            linkInput.value = `${baseUrl}?code=${shareCode}`;
        }

        overlay.style.display = 'flex';
    }

    /**
     * Megosztás modal bezárása
     */
    closeShareModal() {
        document.getElementById('shareModalOverlay').style.display = 'none';
    }

    /**
     * Link másolása vágólapra
     */
    async copyShareLink() {
        const linkInput = document.getElementById('shareLinkInput');
        try {
            await navigator.clipboard.writeText(linkInput.value);
            this.showNotification('✅ Link másolva a vágólapra!');
        } catch (e) {
            // Fallback
            linkInput.select();
            document.execCommand('copy');
            this.showNotification('✅ Link másolva!');
        }
    }

    /**
     * Import modal megjelenítése
     */
    showImportModal() {
        document.getElementById('importModalOverlay').style.display = 'flex';
        document.getElementById('importCodeInput').value = '';
        document.getElementById('importStatus').textContent = '';
    }

    /**
     * Import modal bezárása
     */
    closeImportModal() {
        document.getElementById('importModalOverlay').style.display = 'none';
    }

    /**
     * Kvíz importálása kód vagy link alapján
     */
    async importQuiz() {
        const input = document.getElementById('importCodeInput').value.trim();
        const statusEl = document.getElementById('importStatus');
        
        if (!input) {
            statusEl.textContent = '❌ Adj meg egy kódot vagy linket!';
            statusEl.className = 'import-status error';
            return;
        }

        statusEl.textContent = '⏳ Betöltés...';
        statusEl.className = 'import-status loading';

        let shareCode = input;
        let importedQuiz = null;

        // Ha link, kiolvassuk a kódot vagy a base64 adatot
        if (input.includes('?code=')) {
            const url = new URL(input);
            shareCode = url.searchParams.get('code');
        } else if (input.includes('?import=')) {
            try {
                const url = new URL(input);
                const encoded = url.searchParams.get('import');
                importedQuiz = JSON.parse(decodeURIComponent(escape(atob(encoded))));
            } catch (e) {
                statusEl.textContent = '❌ Érvénytelen link!';
                statusEl.className = 'import-status error';
                return;
            }
        }

        // Ha nincs base64-ből betöltött kvíz, próbáljuk Firestore-ból vagy szerverről
        if (!importedQuiz && shareCode) {
            // 1. Próba: Firestore
            try {
                if (typeof firebase !== 'undefined' && firebase.firestore) {
                    const db = firebase.firestore();
                    const doc = await db.collection('shared_quizzes').doc(shareCode).get();
                    if (doc.exists) {
                        importedQuiz = doc.data();
                        console.log('☁️ Kvíz betöltve Firestore-ból:', shareCode);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Firestore import hiba:', e.message);
            }

            // 2. Próba: Szerver API
            if (!importedQuiz) {
                try {
                    const response = await fetch(`/api/shared-quiz/${shareCode}`);
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.quiz) {
                            importedQuiz = result.quiz;
                            console.log('🖥️ Kvíz betöltve szerverről:', shareCode);
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Server import hiba:', e.message);
                }
            }
        }

        if (!importedQuiz) {
            statusEl.textContent = '❌ Kvíz nem található ezzel a kóddal!';
            statusEl.className = 'import-status error';
            return;
        }

        // Ellenőrizzük, hogy nem duplikátum-e
        const isDuplicate = this.quizzes.some(q => 
            q.title === importedQuiz.title && 
            q.questions.length === importedQuiz.questions.length
        );

        if (isDuplicate) {
            statusEl.textContent = '⚠️ Ez a kvíz már megvan a listádban!';
            statusEl.className = 'import-status error';
            return;
        }

        // Kvíz hozzáadása
        const newQuiz = {
            id: Date.now(),
            title: importedQuiz.title,
            description: importedQuiz.description || '',
            questions: importedQuiz.questions,
            createdAt: new Date().toISOString(),
            importedFrom: shareCode || 'link'
        };

        this.quizzes.push(newQuiz);
        this.saveQuizzes();
        this.renderQuizList();

        statusEl.textContent = '✅ Kvíz sikeresen importálva!';
        statusEl.className = 'import-status success';

        this.showNotification(`✅ "${newQuiz.title}" kvíz importálva!`);

        // 1 mp múlva bezárjuk a modalt
        setTimeout(() => {
            this.closeImportModal();
        }, 1200);
    }

    /**
     * URL paraméterek ellenőrzése (automatikus import)
     */
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('code')) {
            const code = params.get('code');
            document.getElementById('importCodeInput').value = code;
            this.showImportModal();
            // Automatikusan indítjuk az importot
            setTimeout(() => this.importQuiz(), 500);
            // Töröljük az URL paramétert
            window.history.replaceState({}, '', window.location.pathname);
        } else if (params.has('import')) {
            const importData = params.get('import');
            document.getElementById('importCodeInput').value = window.location.href;
            this.showImportModal();
            setTimeout(() => this.importQuiz(), 500);
            window.history.replaceState({}, '', window.location.pathname);
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

// Inicializáció
document.addEventListener('DOMContentLoaded', () => {
    console.log('📝 Quiz oldal betöltése...');
    window.quizManager = new QuizManager();
});

