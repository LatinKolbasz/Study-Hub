/**
 * Terms of Service (Felhasználási Feltételek) - Egyszer megjelenő modal
 * localStorage-ban tároljuk, hogy elfogadta-e a felhasználó
 */

class TOSManager {
    constructor() {
        this.storageKey = 'studyhub_tos_accepted';
        this.tosVersion = '1.0'; // Ha változik a verzió, újra megjelenik
    }

    /**
     * Elfogadta-e már a felhasználó?
     */
    isAccepted() {
        const accepted = localStorage.getItem(this.storageKey);
        return accepted === this.tosVersion;
    }

    /**
     * Elfogadás mentése
     */
    accept() {
        localStorage.setItem(this.storageKey, this.tosVersion);
    }

    /**
     * Megjelenítés ha még nem fogadta el
     */
    showIfNeeded() {
        // Login oldalon ne jelenjen meg
        if (window.location.pathname.endsWith('/login.html')) return;

        if (!this.isAccepted()) {
            this.show();
        }
    }

    /**
     * Modal megjelenítése
     */
    show() {
        // Ha már létezik, ne csináljunk újat
        if (document.getElementById('tos-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'tos-overlay';
        overlay.className = 'tos-overlay';

        overlay.innerHTML = `
            <div class="tos-modal">
                <div class="tos-header">
                    <span class="tos-icon">📜</span>
                    <h2 class="tos-title">Felhasználási Feltételek</h2>
                    <p class="tos-subtitle">Kérjük, olvasd el és fogadd el a feltételeket a folytatáshoz</p>
                </div>

                <div class="tos-content">
                    <div class="tos-section">
                        <h3>1. Általános Feltételek</h3>
                        <p>
                            <!-- IDE ÍRD A SAJÁT SZÖVEGED -->
                            A Study Hub használatával elfogadod az alábbi felhasználási feltételeket. 
                            A platform kizárólag tanulási célokat szolgál.
                        </p>
                    </div>

                    <div class="tos-section">
                        <h3>2. Fiók és Adatok</h3>
                        <p>
                            <!-- IDE ÍRD A SAJÁT SZÖVEGED -->
                            A regisztráció során megadott adataidat bizalmasan kezeljük. 
                            A felhasználói adatok Firebase-en keresztül kerülnek tárolásra.
                        </p>
                    </div>

                    <div class="tos-section">
                        <h3>3. Felhasználói Magatartás</h3>
                        <p>
                            <!-- IDE ÍRD A SAJÁT SZÖVEGED -->
                            A platform használata során köteles vagy betartani az általános 
                            magatartási szabályokat. Tilos a rendszer visszaélésszerű használata.
                        </p>
                    </div>

                    <div class="tos-section">
                        <h3>4. Adatvédelem</h3>
                        <p>
                            <!-- IDE ÍRD A SAJÁT SZÖVEGED -->
                            Az adataid védelme fontos számunkra. Személyes adatokat harmadik 
                            félnek nem adunk ki. Az adatkezelésről bővebben a Beállításokban olvashatsz.
                        </p>
                    </div>

                    <div class="tos-section">
                        <h3>5. Felelősség Korlátozása</h3>
                        <p>
                            <!-- IDE ÍRD A SAJÁT SZÖVEGED -->
                            A Study Hub semmilyen felelősséget nem vállal az esetleges adatvesztésért 
                            vagy a szolgáltatás kieséséért.
                        </p>
                    </div>

                    <div class="tos-section">
                        <h3>6. Módosítások</h3>
                        <p>
                            <!-- IDE ÍRD A SAJÁT SZÖVEGED -->
                            Fenntartjuk a jogot a feltételek módosítására. Jelentős változás 
                            esetén újra elfogadást kérünk.
                        </p>
                    </div>
                </div>

                <div class="tos-footer">
                    <label class="tos-checkbox-label">
                        <input type="checkbox" id="tos-agree-checkbox" class="tos-checkbox">
                        <span class="tos-checkmark"></span>
                        <span>Elolvastam és elfogadom a Felhasználási Feltételeket</span>
                    </label>
                    <button id="tos-accept-btn" class="tos-accept-btn" disabled>
                        ✅ Elfogadom
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Checkbox → gomb aktiválás
        const checkbox = document.getElementById('tos-agree-checkbox');
        const acceptBtn = document.getElementById('tos-accept-btn');

        checkbox.addEventListener('change', () => {
            acceptBtn.disabled = !checkbox.checked;
        });

        // Elfogadás gomb
        acceptBtn.addEventListener('click', () => {
            if (!checkbox.checked) return;
            this.accept();
            overlay.classList.add('tos-closing');
            setTimeout(() => {
                overlay.remove();
                this.showSlukk();
            }, 400);
        });

        // Animáció belépéskor
        requestAnimationFrame(() => {
            overlay.classList.add('tos-visible');
        });
    }

    /**
     * "Szünetben adsz egy slukkot?" modal - ToS elfogadása után jelenik meg
     */
    showSlukk() {
        const overlay = document.createElement('div');
        overlay.id = 'slukk-overlay';
        overlay.className = 'tos-overlay';

        overlay.innerHTML = `
            <div class="tos-modal slukk-modal">
                <div class="tos-header">
                    <span class="tos-icon">🚬</span>
                    <h2 class="tos-title">Még egy fontos kérdés...</h2>
                </div>

                <div class="tos-content" style="text-align: center; padding: 30px;">
                    <p style="font-size: 1.3rem; color: #e2e8f0; margin: 20px 0;">
                        Szünetben adsz egy slukkot?
                    </p>
                </div>

                <div class="tos-footer" style="flex-direction: row; gap: 12px;">
                    <button class="tos-accept-btn slukk-btn" style="flex: 1;">
                        ✅ Igen
                    </button>
                    <button class="tos-accept-btn slukk-btn" style="flex: 1;">
                        ✅ Igen
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Mindkét gomb bezárja
        overlay.querySelectorAll('.slukk-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.classList.add('tos-closing');
                setTimeout(() => overlay.remove(), 400);
            });
        });

        requestAnimationFrame(() => {
            overlay.classList.add('tos-visible');
        });
    }
}

// Globális példány
window.tosManager = new TOSManager();

// DOM kész → megjelenítés ha kell
document.addEventListener('DOMContentLoaded', () => {
    // Kis késleltetés, hogy a theme és auth előbb betöltődjön
    setTimeout(() => {
        window.tosManager.showIfNeeded();
    }, 500);
});
