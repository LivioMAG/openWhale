# Project Structure & Architecture

## Overview

Dieses Projekt ist eine modulare Frontend-Webanwendung mit:

- HTML
- CSS
- JavaScript

Backend- und Infrastruktur-Integrationen:

- Supabase (Auth, Database, Storage)
- n8n (Webhooks für Hintergrund-Workflows)

Ziel der Architektur ist eine einfache, skalierbare und wartbare Codebasis.

---

## Main Concept

Nach dem Login besteht die App aus vier funktionalen Hauptbereichen (Tabs):

1. **Pool** (User Media Library)
2. **Vorlagen** (Content Templates: Post & Carousel)
3. **Bildbearbeitung** (Image Editing Templates)
4. **Videobearbeitung** (Platzhalter für spätere Erweiterungen)

Jeder Bereich wird als eigene Seite bzw. eigenes Modul umgesetzt.

---

## Folder Structure

```text
/app
├── index.html
├── app.js
├── router.js
├── /assets
│   ├── /icons
│   ├── /images
│   └── /styles
│       ├── main.css
│       ├── layout.css
│       ├── components.css
│       └── tabs.css
├── /js
│   ├── app.js
│   ├── router.js
│   ├── supabaseClient.js
│   ├── /auth
│   │   ├── login.js
│   │   └── session.js
│   ├── /components
│   │   ├── navbar.js
│   │   ├── tabs.js
│   │   ├── modal.js
│   │   ├── table.js
│   │   ├── uploader.js
│   │   ├── dragdrop.js
│   │   ├── loader.js
│   │   └── toast.js
│   ├── /pages
│   │   ├── dashboard.js
│   │   ├── meinPool.js
│   │   ├── vorlagen.js
│   │   ├── bildbearbeitung.js
│   │   └── videobearbeitung.js
│   ├── /services
│   │   ├── authService.js
│   │   ├── poolService.js
│   │   ├── templateService.js
│   │   ├── imageEditingService.js
│   │   ├── storageService.js
│   │   ├── webhookService.js
│   │   └── pollingService.js
│   ├── /state
│   │   ├── appState.js
│   │   └── userState.js
│   ├── /utils
│   │   ├── helpers.js
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── constants.js
│   └── /templates
│       ├── loginTemplate.js
│       ├── poolTemplate.js
│       ├── vorlagenTemplate.js
│       ├── bildbearbeitungTemplate.js
│       └── videobearbeitungTemplate.js
├── /config
│   ├── supabase.json
│   └── webhooks.json
└── /config-example
    ├── supabase.example.json
    └── webhooks.example.json
```

---

## Configuration Handling

Alle Konfigurationswerte werden ausschließlich in JSON-Dateien gepflegt.

### Supabase-Konfiguration

Pfad: `/config/supabase.json`

```json
{
  "url": "YOUR_SUPABASE_URL",
  "anonKey": "YOUR_SUPABASE_ANON_KEY"
}
```

### Webhook-Konfiguration

Pfad: `/config/webhooks.json`

```json
{
  "imageTemplateUpload": "YOUR_WEBHOOK_URL",
  "imageTemplateFinalize": "YOUR_WEBHOOK_URL",
  "postTemplateGenerate": "YOUR_WEBHOOK_URL",
  "carouselTemplateGenerate": "YOUR_WEBHOOK_URL"
}
```

### Wichtige Regeln

- Keine Hardcodierung von Supabase-URL oder Keys in JavaScript-Dateien
- Keine Hardcodierung von Webhook-URLs in Services oder Pages
- Zentrale Konfigurationsladung aus JSON-Dateien
- `/config-example/` für repository-sichere Beispielwerte
- Reale Konfigurationen können über `.gitignore` ausgeschlossen werden

---

## Architekturprinzipien

### 1. Separation of Concerns

- **Pages**: UI-Logik und Orchestrierung
- **Services**: Backend-Kommunikation (Supabase, Webhooks)
- **Components**: Wiederverwendbare UI-Bausteine
- **Templates**: HTML-Struktur/Rendering
- **State**: Globale Datenhaltung

### 2. Pages (Core Modules)

- `meinPool.js` → Medien-Upload, Drag & Drop, Post-Erstellung
- `vorlagen.js` → Post- und Carousel-Templates
- `bildbearbeitung.js` → Bildbearbeitungs-Templates (Kernlogik)
- `videobearbeitung.js` → Platzhalter

### 3. Services (Business Logic Layer)

Externe Interaktionen laufen ausschließlich über Services:

- Supabase-Queries
- Storage-Uploads
- Webhook-Trigger (n8n)
- Polling-Logik (5-Sekunden-Intervall)

**Regeln:**

- Niemals Supabase direkt in UI-Components oder Pages aufrufen
- Niemals Config-Werte direkt in Service-Dateien definieren

### 4. Components (Reusable UI)

Wiederverwendbare Bausteine:

- Tabellen
- Modals
- Uploaders
- Drag & Drop
- Loader (für asynchrone Prozesse)
- Toast/Notifications

### 5. Templates (UI Rendering)

Templates erzeugen dynamisch strukturierte HTML-Ausgaben und trennen Rendering von Business-Logik.

### 6. State Management

Globale Zustände in `/js/state/`:

- Aktueller User
- Ausgewählte Templates
- Ausgewählte Bilder
- UI-Zustände (aktiver Tab, Loading-Zustände)

Kein externes State-Management-Framework erforderlich.

### 7. Polling Strategy

- Keine Realtime-Subscriptions
- Polling alle 5 Sekunden bei laufender Hintergrundverarbeitung
- Polling stoppen, sobald Daten verfügbar sind

### 8. Webhook Usage

Webhooks triggern n8n-Workflows:

- nach Template-Upload
- nach Template-Abschluss
- nach Content-Template-Erstellung

Webhook-URLs müssen immer aus `/config/webhooks.json` geladen werden.

---

## Key Rules for Development

1. UI- und Backend-Logik nicht mischen
2. Datenoperationen immer über Services
3. Components wiederverwendbar halten
4. Pages auf Orchestrierung fokussieren
5. Keine Overengineering-Muster – einfach und modular bleiben
6. Supabase-Config und Webhook-URLs nur in JSON-Konfigurationsdateien
7. Niemals Keys, URLs oder Webhook-Endpunkte in Anwendungscode hardcoden

---

## Goal

Die Struktur soll:

- schnelle Entwicklung ermöglichen
- asynchrone Workflows (AI + n8n) unterstützen
- leicht skalierbar sein (z. B. Video-Features später)
- Klarheit und Wartbarkeit über Module hinweg sichern

---

## Referenz-Hinweis

Diese Datei dient als zentrale Referenz für Architektur- und Strukturentscheidungen im Repository.
