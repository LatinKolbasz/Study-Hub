# 📚 Study Hub

> Magyar nyelvű tanulási platform gamifikációval, prémium vizuális témákkal és teljes körű adatkezeléssel.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-orange)

---

## 🔎 Áttekintés

A Study Hub egy webes tanulási platform, amely segít a diákoknak a feladatok nyomon követésében, az órarend kezelésében, a tanulási idő mérésében, a jegyek gamifikált követésében és a vizsgákra való felkészülésben — mindezt egy igényes, animált felületen.

---

## ✨ Funkciók

| Modul | Leírás |
|---|---|
| **Dashboard** | Központi kezdőlap funkció-kártyákkal |
| **Órarend** | Heti órarend (H–P), sablon rendszerrel |
| **Study Timer** | Pomodoro időzítő SVG körkörös progress-szel |
| **Jegy Tracker** | Gamifikált jegykövetés — XP, szintek, avatár (RPG-stílus) |
| **Quiz & Dolgozat** | Kvízek létrehozása, mentése és kitöltése |
| **Beadandók** | Feladat és határidő nyilvántartás |
| **Ágazati Képzések** | Tananyagok szektoronként (CCNA, Cisco, Python, Web Dev) |
| **Study Analytics** | Elemzési dashboard *(fejlesztés alatt)* |
| **Beállítások** | Témák, színek, értesítések, egyéb beállítások |
| **Adatkezelés** | JSON import/export, biztonsági mentés/visszaállítás |

---

## 🎨 8 Prémium Vizuális Téma

Minden téma animált háttér-effektekkel rendelkezik, amelyek az összes oldalon konzisztensen megjelennek:

| Téma | Stílus |
|---|---|
| **Alapértelmezett** | Mély sötétkék gradiens |
| **Óceán 🌊** | Víz alatti világ — fénysugarak, buborékok, korallok, halak |
| **Naplemente 🌅** | Synthwave/retrowave — neon rács, hegyek, cyberhullámok |
| **Erdő** | Sötét erdő zöld gradiens |
| **Cukorka** | Rózsaszín/magenta gradiens |
| **Cyberpunk** | Neon csillagok, lila/cián akcentusok |
| **Pasztell** | Világos, halvány rózsaszín (egyetlen light téma) |
| **Sötét Űr ** | Void effekt — köd, digitális eső, részecskék, horizont vonal |

---

## 🏗️ Projekt Struktúra

```
Study-Hub/
├── index.html / .css / .js          # Főoldal / Dashboard
├── schedule.html / .css / .js       # Órarend
├── study-timer.html / .css / .js    # Pomodoro időzítő
├── grade-tracker.html / .css / .js  # Jegy Tracker (RPG)
├── quiz-creator.html / .css / .js   # Kvíz készítő
├── analytics.html / .css / .js      # Elemzések
├── assignments.html / .css / .js    # Beadandók
├── sector.html / .css / .js         # Ágazati képzések
├── sector-page.css / .js            # Szektor aloldalak stílus
├── ccna.html / cisco.html /         # Szakmai tananyag oldalak
│   python.html / webdev.html
├── settings.html                    # Beállítások
├── login.html                       # Bejelentkezés / Regisztráció
├── data-manager.html                # Adat import/export
├── server.js                        # Express backend (API + static)
│
├── components/
│   ├── navbar.js / .css              # Navigáció
│   └── modal.js / .css               # Modális ablak
│
├── utils/
│   ├── theme.js                      # Témarendszer (8 téma + animációk)
│   ├── auth.js                       # Firebase Auth kezelő
│   ├── storage.js                    # localStorage segédfüggvények
│   ├── userStorage.js                # Felhasználónkénti tárolás
│   └── animations.js                 # UI animációk
│
├── assets/data/
│   └── topics.json                   # Szektorok témáinak adatai
│
├── data/
│   ├── assignments.json              # Feladatok (server-side)
│   └── telemetry.json                # Telemetria adatok
│
└── .github/workflows/
    └── static.yml                    # GitHub Pages auto-deploy
```

---

## ⚙️ Technológiák

- **Frontend:** HTML5, CSS3 (animációk, glassmorphism, gradiens), Vanilla JavaScript
- **Backend:** Express 5.x (REST API, statikus fájlszolgáltatás)
- **Auth:** Firebase Authentication (email/jelszó, persistent sessions)
- **Adattárolás:** localStorage (kliens) + JSON fájlok (szerver, `data/users/{user}/`)
- **Deploy:** GitHub Pages (auto-deploy push-ra)
- **LAN hozzáférés:** Auto IP-felismerés + mDNS (`studyhub.local`)

---

## 🔌 Backend API

| Végpont | Metódus | Leírás |
|---|---|---|
| `/api/save-assignments` | POST | Feladatok mentése |
| `/api/get-assignments` | GET | Feladatok lekérése |
| `/api/save-grades` | POST | Jegyek mentése |
| `/api/get-grades` | GET | Jegyek lekérése |
| `/api/save-quizzes` | POST | Kvízek mentése |
| `/api/get-quizzes` | GET | Kvízek lekérése |
| `/api/save-materials/:sector` | POST | Tananyag mentése |
| `/api/get-materials/:sector` | GET | Tananyag lekérése |
| `/api/telemetry` | POST | Hiba/használati telemetria |

Minden adat felhasználónként külön JSON fájlban tárolódik a `data/users/` mappában.

---

## 🚀 Telepítés

```bash
# Klónozás
git clone https://github.com/LatinKolbasz/Study-Hub.git
cd Study-Hub

# Függőségek telepítése
npm install

# Szerver indítása (port 3000)
node server.js
```

A szerver induláskor kiírja a helyi IP-címet — mobilról is elérhető a LAN-on.

**Vagy:** Közvetlenül megnyitható a `index.html` böngészőben (szerver nélkül, kliens-oldali tárolással).

---

## 📱 Mobil Hozzáférés

A szerver automatikusan felismeri a helyi hálózati IP-t, és a konzolon megjeleníti:
```
🌐 LAN: http://192.168.x.x:3000
```
Telefonról is elérhető ugyanazon a Wi-Fi hálózaton.

---

## 🤝 Közreműködés

Hozzájárulások szívesen fogadva! Nyiss egy issue-t vagy küldj pull request-et. Előre is köszönöm!

## 📄 Licensz

MIT License
