/**
 * ============================================
 * SectorPageManager - Fájlkezelő osztály
 * ============================================
 * Kezeli a sector oldalak fájlkezelését:
 * - Fájl feltöltés (PDF, DOC, DOCX, TXT, ZIP)
 * - Fájl előnézet modal ablakban
 * - Fájl letöltés
 * - Fájl törlés
 * 
 * Adattárolás: localStorage (Base64 encoded)
 */

class SectorPageManager {
    /**
     * Konstruktor - inicializálja a sectort
     * @param {string} sectorName - A sector neve (pl: 'python', 'ccna', 'cisco', 'webdev')
     */
    constructor(sectorName) {
        this.sector = sectorName;
        this.materials = this.loadMaterials(); // Betöltés localStorage-ból
        this.init();
    }

    /**
     * Inicializálja az eseményhallgatókat
     */
    init() {
        const fileInput = document.getElementById('file-input');
        fileInput.addEventListener('change', (event) => {
            this.handleFileUpload(event.target.files);
        });

        this.renderMaterials();
    }

    /**
     * ============================================
     * FÁJL FELTÖLTÉS
     * ============================================
     * Kezeli a fájl feltöltését:
     * 1. Ellenőrzi a fájl típusát (PDF, DOC, DOCX, TXT, ZIP)
     * 2. Ellenőrzi a fájl méretét (max 10MB)
     * 3. Base64 encode-olja a fájlt (localStorage tároláshoz)
     * 4. Elmenti a localStorage-ba
     * 
     * @param {FileList} files - A feltöltendő fájlok
     */
    handleFileUpload(files) {
        if (files.length > 0) {
            const file = files[0];

            // Engedélyezett fájltípusok
            const validTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/zip'
            ];

            // Típus ellenőrzés
            if (!validTypes.includes(file.type)) {
                this.showNotification('❌ Csak PDF, DOC, DOCX, TXT vagy ZIP!', 'error');
                return;
            }

            // Méret ellenőrzés (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                this.showNotification('❌ Max 10MB lehet!', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                // Base64 encoding a localStorage-hoz (ArrayBuffer nem tárolható)
                const base64 = this.arrayBufferToBase64(e.target.result);
                
                const material = {
                    id: Date.now(),
                    name: file.name,
                    size: this.formatFileSize(file.size),
                    type: file.type,
                    data: base64, // Base64 stringként tároljuk
                    uploadedAt: new Date().toISOString()
                };

                this.materials.push(material);
                this.saveMaterials();
                this.renderMaterials();

                document.getElementById('file-input').value = '';
                this.showNotification('✅ Fájl sikeresen feltöltve!');
            };

            reader.readAsArrayBuffer(file);
        }
    }

    /**
     * ArrayBuffer → Base64 konverzió
     * A localStorage csak stringeket tud tárolni, ezért konvertálni kell
     * @param {ArrayBuffer} buffer - A konvertálandó buffer
     * @returns {string} - Base64 string
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Base64 → ArrayBuffer konverzió
     * Vissza kell konvertálni használat előtt
     * @param {string} base64 - A Base64 string
     * @returns {ArrayBuffer} - ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * ============================================
     * FÁJL TÖRLÉS
     * ============================================
     * @param {number} id - A törlendő fájl ID-ja
     */
    deleteMaterial(id) {
        if (confirm('Biztosan törölni szeretnéd?')) {
            this.materials = this.materials.filter(m => m.id !== id);
            this.saveMaterials();
            this.renderMaterials();
            this.showNotification('🗑️ Fájl törölve!');
        }
    }

    /**
     * ============================================
     * FÁJL LETÖLTÉS
     * ============================================
     * Letölti a fájlt a böngészőn keresztül
     * @param {number} id - A letöltendő fájl ID-ja
     */
    downloadMaterial(id) {
        const material = this.materials.find(m => m.id === id);
        if (!material) return;

        // Base64 → ArrayBuffer → Blob → Letöltés
        const arrayBuffer = this.base64ToArrayBuffer(material.data);
        const blob = new Blob([arrayBuffer], { 
            type: material.type 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = material.name;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * ============================================
     * FÁJL ELŐNÉZET
     * ============================================
     * Megjeleníti a fájlt modal ablakban
     * - PDF: iframeben
     * - TXT: szöveges tartalomként
     * - DOC/DOCX/ZIP: csak letöltés gomb
     * 
     * @param {number} id - A megtekintendő fájl ID-ja
     */
    previewMaterial(id) {
        const material = this.materials.find(m => m.id === id);
        const previewBody = document.getElementById('preview-body');
        const previewTitle = document.getElementById('preview-title');

        if (material) {
            previewTitle.textContent = material.name;

            // Base64 → ArrayBuffer
            const arrayBuffer = this.base64ToArrayBuffer(material.data);

            if (material.type === 'application/pdf') {
                // PDF megjelenítés iframe-ben
                const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                previewBody.innerHTML = `<iframe class="pdf-body" src="${url}" frameborder="0"></iframe>`;
            } else if (material.type === 'text/plain') {
                // Szöveg megjelenítés
                const decoder = new TextDecoder('utf-8');
                const text = decoder.decode(arrayBuffer);
                previewBody.innerHTML = `<pre class="text-preview">${this.escapeHtml(text)}</pre>`;
            } else {
                // DOC, DOCX, ZIP - csak letöltés gomb
                previewBody.innerHTML = `
                    <div class="preview-only-download">
                        <div class="file-icon-large">📄</div>
                        <p class="file-name">${material.name}</p>
                        <p class="file-size">${material.size}</p>
                        <button class="btn-download btn-large" onclick="sectorPage.downloadMaterial(${material.id})">
                            <span>⬇️</span> Letöltés
                        </button>
                    </div>
                `;
            }

            document.getElementById('preview-modal').style.display = 'flex';
        }
    }

    // Modal bezárása (osztályon belül)
    closePreview() {
        document.getElementById('preview-modal').style.display = 'none';
    }

    /**
     * DOCX fájl tartalom kinyerése (JSZip kell hozzá)
     * @param {Object} material - A DOCX fájl adatai
     */
    extractDocxContent(material) {
        const uint8Array = new Uint8Array(material.data);
        
        JSZip.loadAsync(uint8Array).then((zip) => {
            return zip.file('word/document.xml').async('string');
        }).then((content) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');
            
            // Szöveg kinyerése az XML-ből
            const textElements = xmlDoc.querySelectorAll('w\\:t');
            let extractedText = '';
            
            textElements.forEach(el => {
                extractedText += el.textContent + ' ';
            });

            this.showPreviewModal(material.name, extractedText || 'Üres dokumentum', 'docx');
        }).catch((error) => {
            console.error('DOCX olvasási hiba:', error);
            this.showNotification('❌ Nem sikerült a DOCX megnyitása', 'error');
        });
    }

    /**
     * PDF előnézet modalban
     * @param {Object} material - A PDF fájl adatai
     */
    previewPDF(material) {
        const uint8Array = new Uint8Array(material.data);
        const blob = new Blob([uint8Array], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        this.showPdfModal(url, material.name);
    }

    /**
     * Általános előnézeti modal megjelenítése
     * @param {string} title - A modal címe
     * @param {string} content - A tartalom
     * @param {string} type - A tartalom típusa
     */
    showPreviewModal(title, content, type) {
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <h3>${title}</h3>
                    <button class="close-btn">✕</button>
                </div>
                <div class="preview-body">
                    ${type === 'text' || type === 'docx' ? 
                        `<pre class="text-preview">${this.escapeHtml(content)}</pre>` :
                        `<div class="pdf-preview">${content}</div>`
                    }
                </div>
            </div>
        `;

        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    }

    /**
     * PDF modal megjelenítése
     * @param {string} pdfUrl - A PDF URL-je
     * @param {string} title - A modal címe
     */
    showPdfModal(pdfUrl, title) {
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="preview-content pdf-modal">
                <div class="preview-header">
                    <h3>${title}</h3>
                    <a href="${pdfUrl}" download="${title}" class="download-link">⬇️ Letöltés</a>
                    <button class="close-btn">✕</button>
                </div>
                <div class="preview-body pdf-body">
                    <iframe src="${pdfUrl}" type="application/pdf"></iframe>
                </div>
            </div>
        `;

        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    }

    /**
     * HTML escape - XSS védelem
     * Megakadályozza a cross-site scripting támadásokat
     * @param {string} text - A szöveg amit escape-elni kell
     * @returns {string} - Az escapeelt szöveg
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
     * ============================================
     * ANYAGOK MEGJELENÍTÉSE
     * ============================================
     * Megjeleníti a feltöltött fájlokat a listában
     * Szép, modern megjelenítés ikonokkal és gombokkal
     */
    renderMaterials() {
        const list = document.getElementById('material-list');
        list.innerHTML = '';

        if (this.materials.length === 0) {
            list.innerHTML = '<div class="empty-message"><p>📭 Még nincs feltöltött anyag</p></div>';
            return;
        }

        this.materials.forEach(material => {
            const item = document.createElement('div');
            item.className = 'material-item';
            
            // Fájl ikon meghatározása típus alapján
            let icon = '📄';
            if (material.type === 'application/pdf') icon = '📕';
            else if (material.type.includes('word')) icon = '📝';
            else if (material.type === 'text/plain') icon = '📃';
            else if (material.type.includes('zip')) icon = '📦';
            
            item.innerHTML = `
                <div class="material-info">
                    <span class="material-icon">${icon}</span>
                    <div class="material-details">
                        <h4>${material.name}</h4>
                        <p>${material.size} • ${new Date(material.uploadedAt).toLocaleDateString('hu-HU')}</p>
                    </div>
                </div>
                <div class="material-actions">
                    <button class="btn-action btn-preview" onclick="sectorPage.previewMaterial(${material.id})">
                        <span class="btn-icon">👁️</span> Előnézet
                    </button>
                    <button class="btn-action btn-download" onclick="sectorPage.downloadMaterial(${material.id})">
                        <span class="btn-icon">⬇️</span> Letöltés
                    </button>
                    <button class="btn-action btn-delete" onclick="sectorPage.deleteMaterial(${material.id})">
                        <span class="btn-icon">🗑️</span> Törlés
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    /**
     * ============================================
     * ÉRTESÍTÉSEK
     * ============================================
     * Megjeleníti az értesítéseket (siker/hiba)
     * @param {string} message - Az üzenet
     * @param {string} type - Az üzenet típusa (success/error)
     */
    showNotification(message, type = 'success') {
        const notif = document.createElement('div');
        notif.className = 'notification';
        if (type === 'error') {
            notif.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.remove(), 3000);
    }

    /**
     * Mentés localStorage-ba
     */
    saveMaterials() {
        localStorage.setItem(`sector_${this.sector}`, JSON.stringify(this.materials));
    }

    /**
     * ============================================
     * BETÖLTÉS LOCALSTORAGE-BÓL
     * ============================================
     * Betölti a fájlokat a localStorage-ból
     * Hibakezelés: ha a formátum nem megfelelő, üres tömböt ad vissza
     * 
     * @returns {Array} - A betöltött anyagok tömbje
     */
    loadMaterials() {
        try {
            const saved = localStorage.getItem(`sector_${this.sector}`);
            if (!saved) return [];
            
            const parsed = JSON.parse(saved);
            // Ellenőrizzük, hogy a data string-e (Base64) - régi formátum kezelése
            if (parsed.length > 0 && typeof parsed[0].data === 'string') {
                return parsed;
            }
            return [];
        } catch (e) {
            console.error('Hiba a betöltéskor:', e);
            return [];
        }
    }

    /**
     * Fájl méret formázása
     * @param {number} bytes - Bájtok száma
     * @returns {string} - Formázott méret (pl: "1.5 MB")
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

/**
 * ============================================
 * GLOBÁLIS FÜGGVÉNYEK
 * ============================================
 */

// Modal bezárása (HTML onclick-hez)
function closePreview() {
    document.getElementById('preview-modal').style.display = 'none';
}

