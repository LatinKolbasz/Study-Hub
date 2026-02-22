const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;

// IP cím automatikus lekérése
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIP();
const HOSTNAME = 'studyhub';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'src')));

// API - Telemetria (hibák és használati adatok)
app.post('/api/telemetry', (req, res) => {
    const { type, data, timestamp, url, userAgent } = req.body;
    const dataDir = path.join(__dirname, 'data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    
    const telemetryFile = path.join(dataDir, 'telemetry.json');
    let telemetry = [];
    
    if (fs.existsSync(telemetryFile)) {
        try {
            telemetry = JSON.parse(fs.readFileSync(telemetryFile));
        } catch (e) {
            telemetry = [];
        }
    }
    
    telemetry.push({
        type,
        data,
        timestamp,
        url,
        userAgent,
        receivedAt: new Date().toISOString()
    });
    
    // Csak az utolsó 500 bejegyzés marad
    if (telemetry.length > 500) {
        telemetry = telemetry.slice(-500);
    }
    
    fs.writeFileSync(telemetryFile, JSON.stringify(telemetry, null, 2));
    
    res.json({ success: true });
});

// API - Beadandók mentése (felhasználónként)
app.post('/api/save-assignments', (req, res) => {
    const { username, assignments } = req.body;
    const dataDir = path.join(__dirname, 'data', 'users', username);
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(dataDir, 'assignments.json'),
        JSON.stringify(assignments, null, 2)
    );
    
    res.json({ success: true, message: '✅ Beadandók mentve!' });
});

// API - Beadandók betöltése
app.get('/api/get-assignments', (req, res) => {
    const { username } = req.query;
    const assignmentsFile = path.join(__dirname, 'data', 'users', username, 'assignments.json');
    
    if (fs.existsSync(assignmentsFile)) {
        const data = JSON.parse(fs.readFileSync(assignmentsFile));
        res.json(data);
    } else {
        res.json([]);
    }
});

// API - Jegyek mentése (felhasználónként)
app.post('/api/save-grades', (req, res) => {
    const { username, grades } = req.body;
    const dataDir = path.join(__dirname, 'data', 'users', username);
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(dataDir, 'grades.json'),
        JSON.stringify(grades, null, 2)
    );
    
    res.json({ success: true, message: '✅ Jegyek mentve!' });
});

// API - Jegyek betöltése
app.get('/api/get-grades', (req, res) => {
    const { username } = req.query;
    const gradesFile = path.join(__dirname, 'data', 'users', username, 'grades.json');
    
    if (fs.existsSync(gradesFile)) {
        const data = JSON.parse(fs.readFileSync(gradesFile));
        res.json(data);
    } else {
        res.json([]);
    }
});

// API - Szektoros anyagok
app.post('/api/save-materials/:sector', (req, res) => {
    const { sector } = req.params;
    const { username, materials } = req.body;
    const dataDir = path.join(__dirname, 'data', 'users', username);
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(dataDir, `materials_${sector}.json`),
        JSON.stringify(materials, null, 2)
    );
    
    res.json({ success: true, message: '✅ Anyagok mentve!' });
});

// API - Szektoros anyagok betöltése
app.get('/api/get-materials/:sector', (req, res) => {
    const { sector } = req.params;
    const { username } = req.query;
    const materialsFile = path.join(__dirname, 'data', 'users', username, `materials_${sector}.json`);
    
    if (fs.existsSync(materialsFile)) {
        const data = JSON.parse(fs.readFileSync(materialsFile));
        res.json(data);
    } else {
        res.json([]);
    }
});

// API - Quiz-ek mentése
app.post('/api/save-quizzes', (req, res) => {
    const { username, quizzes } = req.body;
    const dataDir = path.join(__dirname, 'data', 'users', username);
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(dataDir, 'quizzes.json'),
        JSON.stringify(quizzes, null, 2)
    );
    
    res.json({ success: true, message: '✅ Kvízek mentve!' });
});

// API - Quiz-ek betöltése
app.get('/api/get-quizzes', (req, res) => {
    const { username } = req.query;
    const quizzesFile = path.join(__dirname, 'data', 'users', username, 'quizzes.json');
    
    if (fs.existsSync(quizzesFile)) {
        const data = JSON.parse(fs.readFileSync(quizzesFile));
        res.json(data);
    } else {
        res.json([]);
    }
});

// SPA fallback
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Server indítás
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════╗
║       🚀 STUDY HUB ELINDULT 🚀            ║
╠═══════════════════════════════════════════╣
║  💻 PC-ről:                               ║
║     http://localhost:${PORT}              ║
║  📱 Telefonon (IP-vel):                   ║
║     http://${LOCAL_IP}:${PORT}            ║
║  🌐 Bárhonnan (mDNS - AJÁNLOTT!):         ║
║     http://${HOSTNAME}.local:${PORT}      ║
╠═══════════════════════════════════════════╣
║  ✨ Bejelentkezés: /login.html            ║
║  🔐 Auth: Kliens oldali (Web Crypto API)  ║
╚═══════════════════════════════════════════╝
    `);
});
 
