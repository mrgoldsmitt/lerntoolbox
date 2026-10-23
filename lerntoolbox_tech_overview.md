---
title: "Lerntoolbox Tech Overview"
date: "2026-08-16"
tags: ["documentation", "architecture", "cloudflare", "frontend"]
---

# Lerntoolbox Tech Overview

## 1. Systemüberblick & Zielsetzung

Die **Lerntoolbox** (gehostet auf `https://lerntoolbox.mrgoldsmitt.work`) ist eine digitale Lernplattform, die als Single-Page Application (SPA) in Vanilla JS/HTML/CSS entwickelt wurde. Sie bietet Werkzeuge wie Mindmap, Kanban, Flashcards und einen Entschuldigungs-Generator.

Ursprünglich als reine Frontend-App ohne Serveranbindung konzipiert ("Offline First"), wurde sie nun um eine Cloud-Speicherung auf Basis von **Cloudflare Pages Functions** und **Cloudflare D1** (Serverless SQLite) erweitert. Diese Cloud-Anbindung ist ein zu 100 % optionales Opt-In-Feature für registrierte Benutzer.

---

## 2. Architektur

- **Frontend:** Vanilla HTML, CSS, JavaScript (`index.html`, `style.css`, `script.js`).
- **Backend (API):** Cloudflare Pages Functions (`functions/api/`).
- **Datenbank:** Cloudflare D1 (SQLite).
- **Hosting:** Cloudflare Pages.
- **Authentifizierung:** `HttpOnly`-Cookies mit serverseitig generierten Sessions. Passwörter werden per WebCrypto-API (SHA-256) gehasht.

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
├── index.html                     # Entry Point, Layout, Modals, Toolbars
├── style.css                      # Globales Styling
├── js/
│   ├── script.js                  # Lokale Logik der Werkzeuge (Mindmap, Kanban, XML-Export, PDF)
│   └── cloud-sync.js              # Cloudflare API-Integration, Auth-State, UI-Updates
├── css/                           # Spezifische Stylesheets
└── functions/
    └── api/                       # Cloudflare Pages Functions (Edge Backend)
        ├── auth/                  # Register, Login, Me, Logout Logik
        ├── projects/              # CRUD Endpunkte für Projekte
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
npx wrangler pages dev .
```
Dies startet einen lokalen Server, der die HTML/JS-Dateien ausliefert und die `/functions` als Backend simuliert (inklusive lokaler D1 Datenbank).

### 7.2 Deployment in die Cloud
```bash
npx wrangler pages deploy . --project-name lerntoolbox
```
Das Schema der D1-Datenbank auf Cloudflare wird aktualisiert über:
```bash
npx wrangler d1 execute lerntoolbox-db --file=./schema.sql --remote
```

---

## 8. 🤖 Richtlinien für KI-Assistenten (AI Maintenance Directives)

Wenn du als KI an diesem Repository arbeitest, halte dich an folgende Regeln:
1. **Offline First**: Die App muss auch ohne Backend-Verbindung nutzbar bleiben (reines Frontend).
2. **Datenschutz**: Die Auth-Cookies müssen `HttpOnly` und `Secure` sein.
3. **Dokumentationspflege**: Halte dieses Dokument (insbesondere API-Endpunkte und Datenbankschema) bei strukturellen Anpassungen stets aktuell.

---

## 9. Changelog

### Version 0.10.1
- **Bugfix**: Es wird nur noch nach dem Löschen des Projekts gefragt, wenn das auch wirklich angefordert wird (vermeidet versehentliche Lösch-Dialoge beim Speichern).
- **Bugfix**: Optimierung des mobilen Layouts der Toolbar (kompakte Darstellung mit reinen Icons für Geräte < 768px, Desktop-Layout ab 7 Zoll).

### Version 0.10.0
- **Neu**: Anmeldung mit eigenen Benutzerdaten mit Synchronisation in der Datenbank von Cloudflare hinzugefügt. Die ursprüngliche Methode mit dem Export und Import funktioniert noch immer.
