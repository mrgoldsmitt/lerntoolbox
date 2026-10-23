---
title: "Lerntoolbox - Digitale Lernplattform für Schule & Unterricht"
aliases: ["Lerntoolbox", "LTB", "LTB Screen", "Lern-Toolbox"]
tags:
  - project/active
  - tech/vanilla-js
  - tech/html5
  - tech/css
  - tech/pwa
  - tech/cloudflare-pages
  - tech/cloudflare-d1
  - domain/education
  - license/cc-by-nc-4.0
type: web-application-architecture
version: "0.10.2"
status: production-ready
stack:
  frontend: "Vanilla HTML5, CSS3, JavaScript (SPA, PWA Offline-First)"
  backend: "Cloudflare Pages Functions (Serverless Edge Workers)"
  database: "Cloudflare D1 (Serverless SQLite)"
  hosting: "Cloudflare Pages (https://lerntoolbox.mrgoldsmitt.work)"
  license: "Creative Commons Namensnennung - Nicht-kommerziell 4.0 International (CC BY-NC 4.0)"
repository_path: "/Users/mrgoldsmitt/Projekte/Lerntoolbox/lerntoolbox"
github: "https://github.com/mrgoldsmitt/lerntoolbox"
created_date: 2026-08-16
last_updated: 2026-10-23
---

# 📖 Lerntoolbox: Technische Gesamtdokumentation & Architektur

> **Hinweis für KI-Assistenten & Entwickler**:
> Dieses Dokument ist die **Single Source of Truth** für alle technischen, architektonischen und betrieblichen Details des Projekts *Lerntoolbox*.
> Jede KI, die an diesem Projekt arbeitet, **muss** diese Spezifikation beachten und bei Code-, Architektur- oder Feature-Änderungen dieses Dokument im Obsidian Vault **automatisch aktualisieren**.

---

## 1. Systemüberblick & Zielsetzung

Die **Lerntoolbox** (gehostet auf `https://lerntoolbox.mrgoldsmitt.work`, Quellcode auf [GitHub](https://github.com/mrgoldsmitt/lerntoolbox)) ist eine digitale Lernplattform, die als Single-Page Application (SPA) in Vanilla JS/HTML/CSS entwickelt wurde. Sie bietet Werkzeuge wie Mindmap, Kanban, Flashcards, Entschuldigungs-Generator und ein interaktives Klassenzimmer-Dashboard (Digiboard).

Ursprünglich als reine Frontend-App ohne Serveranbindung konzipiert ("Offline First"), wurde sie um eine Cloud-Speicherung auf Basis von **Cloudflare Pages Functions** und **Cloudflare D1** (Serverless SQLite) erweitert. Diese Cloud-Anbindung ist ein zu 100 % optionales Opt-In-Feature für registrierte Benutzer.

---

## 2. Architektur & Tech-Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (`index.html`, `style.css`, `script.js`).
- **Backend (API):** Cloudflare Pages Functions (`functions/api/`).
- **Datenbank:** Cloudflare D1 (SQLite, `schema.sql`).
- **Hosting & CDN:** Cloudflare Pages.
- **Offline & PWA:** Service Worker (`sw.js`) mit Cache-Storage API (`lerntoolbox-v22`).
- **Authentifizierung:** `HttpOnly`- und `Secure`-Cookies mit serverseitig generierten Sessions. Passwörter werden per WebCrypto-API (SHA-256) gehasht.
- **Lizenz:** [Creative Commons Namensnennung - Nicht-kommerziell 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

---

## 3. Datenbankschema (Cloudflare D1)

Das Schema befindet sich in `schema.sql` und umfasst:

| Tabelle | Beschreibung | Wichtige Spalten |
| :--- | :--- | :--- |
| `users` | Registrierte Benutzer | `id` (UUID), `email`, `password_hash`, `birth_date`, `created_at` |
| `sessions` | Aktive Login-Sitzungen | `id`, `user_id`, `expires_at` |
| `projects` | Cloud-Gespeicherte Werkzeug-Daten | `id`, `user_id`, `tool_name`, `project_name`, `data_json`, `created_at`, `updated_at` |

---

## 4. API Endpunkte (Cloudflare Pages Functions)

Die Backend-Logik liegt unter `/functions/api/`:

| Methode | Endpunkt | Rechte | Beschreibung |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Alle | Neuen Account anlegen |
| `POST` | `/api/auth/login` | Alle | Login (setzt `HttpOnly`-Cookie) |
| `POST` | `/api/auth/logout` | Authentifiziert | Session löschen |
| `POST` | `/api/auth/reset-password`| Alle | Passwort zurücksetzen (via E-Mail & Geburtsdatum) |
| `GET`  | `/api/auth/me` | Authentifiziert | Aktuellen Benutzer abrufen |
| `PUT`  | `/api/auth/me` | Authentifiziert | E-Mail-Adresse des Benutzers ändern |
| `GET`  | `/api/projects` | Authentifiziert | Alle Projekte des Benutzers auflisten (optional: `?tool=name`) |
| `POST` | `/api/projects` | Authentifiziert | Neues Projekt anlegen (JSON-Daten) |
| `GET`  | `/api/projects/:id` | Eigentümer | Ein spezifisches Projekt laden |
| `PUT`  | `/api/projects/:id` | Eigentümer | Ein Projekt aktualisieren (Speichern) |
| `DELETE`| `/api/projects/:id` | Eigentümer | Ein Projekt löschen |

---

## 5. Frontend-Komponentenstruktur

```
lerntoolbox/
├── index.html                     # Entry Point, Layout, Modals, Toolbars, Impressum & Disclaimer
├── style.css                      # Globales Styling (Dark/Light Mode, Responsive Design)
├── script.js                      # Lokale Logik der Werkzeuge (Mindmap, Kanban, XML-Export, PDF)
├── deploy_release.sh              # Automatisches Deployment- & Release-Skript für Cloudflare
├── sw.js                          # Service Worker mit PWA Cache-Strategie (Cache: lerntoolbox-v22)
├── manifest.json                  # PWA Manifest & App-Metadaten
├── schema.sql                     # D1 SQLite Datenbankschema
├── wrangler.toml                  # Cloudflare Pages & D1 Konfiguration
├── js/
│   ├── cloud-sync.js              # Cloudflare API-Integration, Auth-State, UI-Updates
│   ├── qrcode.min.js              # QR-Code Rendering Library
│   ├── qrcode_tool.js             # QR-Code Werkzeug Logik
│   └── digiboard/                 # Digiboard Tafel-Widgets (Uhr, Timer, Ampel, Notizen, etc.)
├── css/
│   └── digiboard.css              # Digiboard Widget Styling
├── kibildpromptimages/            # Thumbnails für KI-Prompt Stile
└── functions/
    └── api/                       # Cloudflare Pages Functions (Edge Backend)
        ├── auth/                  # Register, Login, Me, Logout Logik
        ├── projects/              # CRUD Endpunkte für Cloud-Projekte
        └── utils.js               # Hilfsfunktionen (Hashing, UUIDs, Session-Check)
```

---

## 6. Workflows & Datenflüsse

### 6.1 Cloud-Speicherung & Dropdowns
- Wenn sich der Nutzer anmeldet (`cloud-sync.js` -> `updateAuthUI(true)`), wird `fetchAllCloudProjects()` ausgeführt.
- Dies ruft alle Projekte vom Backend ab und befüllt in der Toolbar jedes Tools (`Mindmap`, `Kanban`, `Flashcards`, `Entschuldigungen`) das entsprechende Dropdown-Menü.
- Ein Klick auf "Speichern" löst je nach Dropdown-Zustand einen `POST` (neu) oder `PUT` (überschreiben) Request aus.

### 6.2 Entschuldigungs-Tool (Besonderheit)
Da Entschuldigungen eine digitale Unterschrift erfordern:
1. Beim Speichern in die Cloud (`saveToCloud`) wird der aktuelle Formularinhalt ausgelesen, aber die Unterschrift (`signature`) explizit auf `null` gesetzt.
2. Beim Laden des Entwurfs aus der Cloud sind alle Textfelder vorausgefüllt, die Unterschrift muss jedoch zwingend neu geleistet werden, bevor eine gültige PDF erzeugt werden kann.

---

## 7. Lokale Entwicklung & Deployment

### 7.1 Lokale Umgebung starten
Im Projektverzeichnis:
```bash
npm run dev
# oder
npx wrangler pages dev .
```
Dies startet einen lokalen Server, der die HTML/JS-Dateien ausliefert und die `/functions` als Backend simuliert (inklusive lokaler D1 Datenbank).

### 7.2 Deployment in die Cloud
Automatisiert über das Release-Skript:
```bash
./deploy_release.sh
```
Oder manuell via npm / Wrangler:
```bash
npm run deploy
npm run db:migrate
```

---

## 8. 🤖 Richtlinien für KI-Assistenten (AI Maintenance Directives)

Wenn du als KI an diesem Repository arbeitest, halte dich an folgende Regeln:
1. **Offline First**: Die App muss auch ohne Backend-Verbindung nutzbar bleiben (reines Frontend).
2. **Datenschutz**: Die Auth-Cookies müssen `HttpOnly` und `Secure` sein. Keine personenbezogenen Daten (Klarnamen, Adressen) in den Quellcode aufnehmen.
3. **Dokumentationspflege**: Halte dieses Dokument (insbesondere API-Endpunkte und Datenbankschema) bei strukturellen Anpassungen stets aktuell und synchronisiere es in den Obsidian Vault.

---

## 9. Changelog

### Version 0.10.2 (2026-10-23)
- **Lizenzierung**: Offizielle Umstellung auf die freie [Creative Commons Namensnennung - Nicht-kommerziell 4.0 International Lizenz (CC BY-NC 4.0)](LICENSE) im Projekt, auf GitHub und in den Webseiten-Footern/Disclaimern.
- **Datenschutz & Anonymisierung**: Umfassende Bereinigung und Anonymisierung aller personenbezogenen Daten im Impressum und in der Datenschutzerklärung für die Veröffentlichung als Open-Source-Projekt.
- **Open Source & Deployment**: Bereitstellung des öffentlichen GitHub-Repositories (`mrgoldsmitt/lerntoolbox`), Erstellung des automatisierten Release-Skripts `deploy_release.sh` und Erneuerung des Service-Worker-Caches auf `lerntoolbox-v22`.

### Version 0.10.1 (2026-08-16)
- **Bugfix**: Es wird nur noch nach dem Löschen des Projekts gefragt, wenn das auch wirklich angefordert wird (vermeidet versehentliche Lösch-Dialoge beim Speichern).
- **Bugfix**: Optimierung des mobilen Layouts der Toolbar (kompakte Darstellung mit reinen Icons für Geräte < 768px, Desktop-Layout ab 7 Zoll).

### Version 0.10.0 (2026-08-16)
- **Neu**: Anmeldung mit eigenen Benutzerdaten mit Synchronisation in der Datenbank von Cloudflare hinzugefügt. Die ursprüngliche Methode mit dem Export und Import funktioniert noch immer.
