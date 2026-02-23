const sectorTopics = [
    { id: 1, name: "NetAcad CCNA", materials: [] },
    { id: 2, name: "Python", materials: [] },
    { id: 3, name: "Web Development", materials: [] },
    { id: 4, name: "Cisco Packet Tracer", materials: [] },
];

document.addEventListener("DOMContentLoaded", () => {
    const sectorContainer = document.getElementById("sector-container");
    const uploadForm = document.getElementById("upload-form");
    const topicSelect = document.getElementById("topic-select");
    const materialInput = document.getElementById("material-input");

    // Populate topic select options
    sectorTopics.forEach(topic => {
        const option = document.createElement("option");
        option.value = topic.id;
        option.textContent = topic.name;
        topicSelect.appendChild(option);
    });

    // Handle form submission
    uploadForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const selectedTopicId = parseInt(topicSelect.value);
        const material = materialInput.value.trim();

        if (material) {
            const topic = sectorTopics.find(t => t.id === selectedTopicId);
            topic.materials.push(material);
            materialInput.value = "";
            displayMaterials(topic);
        }
    });

    // Display materials for the selected topic
    topicSelect.addEventListener("change", () => {
        const selectedTopicId = parseInt(topicSelect.value);
        const topic = sectorTopics.find(t => t.id === selectedTopicId);
        displayMaterials(topic);
    });

    function displayMaterials(topic) {
        const materialsList = document.getElementById("materials-list");
        materialsList.innerHTML = "";
        topic.materials.forEach(material => {
            const listItem = document.createElement("li");
            listItem.textContent = material;
            materialsList.appendChild(listItem);
        });
    }
});

class SectorManager {
    constructor() {
        this.materials = this.loadMaterials();
        this.init();
    }

    init() {
        this.setupFileUploads();
        this.renderMaterials();
    }

    setupFileUploads() {
        const fileInputs = document.querySelectorAll('.file-input');
        
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const sector = input.id.replace('-file', '');
                this.handleFileUpload(e, sector);
            });
        });
    }

    handleFileUpload(e, sector) {
        const file = e.target.files[0];
        if (!file) return;

        // Validáció
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!validTypes.includes(file.type)) {
            alert('Kérjük, csak PDF, DOC, DOCX vagy TXT fájlokat tölts fel!');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('A fájl mérete nem lehet nagyobb 5MB-nál!');
            return;
        }

        // Fájl hozzáadása
        const reader = new FileReader();
        reader.onload = (event) => {
            const material = {
                id: Date.now(),
                sector: sector,
                name: file.name,
                size: this.formatFileSize(file.size),
                data: event.target.result,
                uploadedAt: new Date().toISOString()
            };

            if (!this.materials[sector]) {
                this.materials[sector] = [];
            }

            this.materials[sector].push(material);
            this.saveMaterials();
            this.renderMaterials();
            e.target.value = '';
        };

        reader.readAsArrayBuffer(file);
    }

    deleteMaterial(sector, id) {
        if (this.materials[sector]) {
            this.materials[sector] = this.materials[sector].filter(m => m.id !== id);
            this.saveMaterials();
            this.renderMaterials();
        }
    }

    renderMaterials() {
        const sectors = ['ccna', 'python', 'webdev', 'cisco'];
        
        sectors.forEach(sector => {
            const container = document.getElementById(`${sector}-materials`);
            container.innerHTML = '';

            if (this.materials[sector] && this.materials[sector].length > 0) {
                this.materials[sector].forEach(material => {
                    const item = this.createMaterialElement(material, sector);
                    container.appendChild(item);
                });
            }
        });
    }

    createMaterialElement(material, sector) {
        const div = document.createElement('div');
        div.className = 'uploaded-item';

        div.innerHTML = `
            <div class="uploaded-item-info">
                <span>📎</span>
                <div>
                    <div class="uploaded-item-name">${material.name}</div>
                </div>
            </div>
            <button class="uploaded-item-delete">Törlés</button>
        `;

        div.querySelector('.uploaded-item-delete').addEventListener('click', () => {
            this.deleteMaterial(sector, material.id);
        });

        return div;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    saveMaterials() {
        localStorage.setItem('sectorMaterials', JSON.stringify(this.materials));
    }

    loadMaterials() {
        const saved = localStorage.getItem('sectorMaterials');
        return saved ? JSON.parse(saved) : {};
    }
}

// Initialize
const sectorManager = new SectorManager();