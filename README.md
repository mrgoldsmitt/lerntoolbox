# Lerntoolbox

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Release](https://img.shields.io/badge/Release-v0.10.1-green.svg)](https://github.com/mrgoldsmitt/lerntoolbox/releases)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA-orange.svg)](https://lerntoolbox.mrgoldsmitt.work)

Die **Lerntoolbox** ist eine webbasierte Lern- und Produktivitätsplattform, die speziell für den Einsatz im Schulunterricht, für Lehrkräfte sowie für Lernende entwickelt wurde. Sie bietet interaktive Werkzeuge zur Strukturierung, Visualisierung und Organisation von Lerninhalten – komplett responsiv, datensparsam und mit voller Offline-Unterstützung (Progressive Web App).

---

## 🛠️ Enthaltene Werkzeuge

- **🧠 Mindmap:** Visuelles Brainstorming und Wissensstrukturierung mit Knoten, Verknüpfungen und XML-Export.
- **📋 Kanban-Board:** Aufgaben- und Projektmanagement mit flexiblen Spalten und Drag-and-Drop.
- **🃏 Flashcards (Karteikarten):** Interaktives Vokabel- und Begriffslernen mit Selbsteinschätzung und Exportfunktion.
- **📝 Entschuldigungs-Generator:** Automatisierte Erstellung formgerechter Entschuldigungsschreiben mit digitalem Unterschriften-Feld und PDF-Export.
- **📟 Digiboard (Klassenzimmer-Dashboard):** Interaktive Tafel-Widgets (Ampel, Timer, Würfel, Zufallsgenerator, Uhr, Textnotizen, Zeichenfeld).
- **🤖 KI-Prompt-Helfer:** Strukturierter Baukasten für didaktische Text- und Bild-Prompts.
- **🔗 QR-Code Generator:** Schnelles Erstellen und Herunterladen von QR-Codes für Unterrichtsmaterialien.

---

## ✨ Features

- **Offline First (PWA):** Kann als Progressive Web App (PWA) auf Mobilgeräten, Tablets und Desktop-Browsern installiert werden und funktioniert auch komplett ohne Internetverbindung.
- **Optionale Cloud-Synchronisation:** Nahtlose Synchronisation von Projekten über Cloudflare Pages Functions und Cloudflare D1 (Serverless SQLite).
- **Datenschutz & Datensparsamkeit:** Die Nutzung ist standardmäßig lokal und anonym möglich. Keine Werbetracker, keine Analyse-Cookies. Cloud-Nutzung ist rein optional.
- **Modernes Design:** Übersichtliche Oberfläche mit Dark- & Light-Mode sowie responsivem Layout für Smartphone, Tablet und Großbildschirm.

---

## 🏗️ Architektur & Tech-Stack

- **Frontend:** Vanilla JavaScript, modernes CSS (`style.css`), HTML5 Single-Page Application (SPA).
- **Backend (API):** Cloudflare Pages Functions (`/functions/api/`).
- **Datenbank:** Cloudflare D1 (Serverless SQLite, `schema.sql`).
- **Service Worker:** Offline-Caching via Cache-Storage-API (`sw.js`).
- **Hosting:** Cloudflare Pages (`https://lerntoolbox.mrgoldsmitt.work`).

Weitere Details zur Architektur findest du in [`lerntoolbox_tech_overview.md`](lerntoolbox_tech_overview.md).

---

## 🚀 Lokale Entwicklung

### Voraussetzungen
- Node.js (v18+)
- npm oder npx

### Starten der lokalen Umgebung

1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```

2. Lokalen Server mit Cloudflare Pages & D1 Emulation starten:
   ```bash
   npm run dev
   # oder
   npx wrangler pages dev .
   ```

3. Browser öffnen unter: `http://localhost:8788`

---

## 📦 Deployment & Release

Zum automatisierten Deployment auf Cloudflare Pages steht das Skript [`deploy_release.sh`](deploy_release.sh) bereit:

```bash
# Nur Frontend & Functions deployen:
./deploy_release.sh

# Deployment inklusive Ausführung der D1-Datenbankmigrationen:
./deploy_release.sh --migrate-db
```

Alternativ über npm:
```bash
npm run deploy
npm run db:migrate
```

---

## 📄 Lizenz

Dieses Projekt steht unter der [Creative Commons Namensnennung - Nicht-kommerziell 4.0 International Lizenz (CC BY-NC 4.0)](LICENSE).
- **Namensnennung:** Der Urheber (`mrgoldsmitt`) muss stets genannt werden.
- **Nicht-kommerziell:** Das Projekt bzw. das Material darf nicht zu kommerziellen Zwecken verwendet werden.
