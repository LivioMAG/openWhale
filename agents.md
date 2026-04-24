## Ziel

Erstelle eine standardisierte, saubere und skalierbare Projektstruktur für Webprojekte mit:

- HTML (Struktur)  
- CSS (Design)  
- JavaScript (Logik)  
- Supabase als Backend  
- JSON für Konfiguration (Credentials & Webhooks)  
- SQL + Functions (TypeScript) für Datenbank & Backend-Logik  

---

## Grundprinzipien
```text

HTML = Struktur
CSS = Design
JavaScript = Logik (Frontend)
Supabase = Backend
SQL = Datenbankstruktur
TypeScript (Functions) = Backend-Logik (Server)
JSON = Konfiguration
## Standard-Projektstruktur
project-root/
│
├── index.html
│
├── pages/
│   ├── dashboard.html
│   ├── profile.html
│   ├── settings.html
│   └── admin.html
│
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── utilities.css
│   │   └── pages/
│   │       ├── dashboard.css
│   │       ├── profile.css
│   │       ├── settings.css
│   │       └── admin.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   │
│   │   ├── config/
│   │   │   ├── supabase.credentials.json
│   │   │   └── webhooks.json
│   │   │
│   │   ├── core/
│   │   │   ├── supabaseClient.js
│   │   │   ├── state.js
│   │   │   └── helpers.js
│   │   │
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── databaseService.js
│   │   │   └── webhookService.js
│   │   │
│   │   ├── ui/
│   │   │   ├── render.js
│   │   │   ├── events.js
│   │   │   └── components.js
│   │   │
│   │   ├── modules/
│   │   │   ├── dashboardModule.js
│   │   │   ├── userModule.js
│   │   │   └── adminModule.js
│   │   │
│   │   └── pages/
│   │       ├── dashboard.js
│   │       ├── profile.js
│   │       ├── settings.js
│   │       └── admin.js
│   │
│   └── img/
│       └── .gitkeep
│
├── backend/
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_create_tables.sql
│   │   │   ├── 002_create_policies.sql
│   │   │   ├── 003_create_functions.sql
│   │   │   ├── 004_create_triggers.sql
│   │   │   ├── 005_seed_data.sql
│   │   │   └── XXX_full_setup.sql
│   │   │
│   │   └── schema/
│   │       └── schema.sql
│   │
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── supabaseClient.ts
│   │   │   ├── helpers.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── user-created/
│   │   │   └── index.ts
│   │   │
│   │   ├── send-email/
│   │   │   └── index.ts
│   │   │
│   │   └── webhook-handler/
│   │       └── index.ts
│   │
│   └── config/
│       └── supabase.config.json
│
├── docs/
│   └── setup.md
│
└── README.md

### Backend-Struktur

Alle Supabase-relevanten Dinge liegen IMMER in:

backend/
SQL (Migrationen)

Pfad:

backend/database/migrations/

Dateien:

001_create_tables.sql
002_create_policies.sql
003_create_functions.sql
004_create_triggers.sql
005_seed_data.sql
XXX_full_setup.sql
SQL-Regeln
001 = Tabellen
002 = Security (RLS / Policies)
003 = SQL-Funktionen
004 = Trigger
005 = Seed Daten
XXX = Komplettes Setup für neue Supabase
TypeScript Functions (Supabase Edge Functions)

Pfad:

backend/functions/

Hier liegt ALLE Server-Logik.

Struktur der Functions
backend/functions/
│
├── _shared/
│   ├── supabaseClient.ts
│   ├── helpers.ts
│   └── types.ts
│
├── function-name/
│   └── index.ts
Regeln für Functions
1. Jede Function hat einen eigenen Ordner
2. Einstiegspunkt ist IMMER index.ts
3. Shared Code kommt in _shared/
4. Keine Duplikate
5. Business-Logik gehört ins Backend (Functions)
##Beispiel Function
backend/functions/send-email/index.ts
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const body = await req.json();

  // Logik hier

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
});
Beispiel Shared Supabase Client
backend/functions/_shared/supabaseClient.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js";

export function getClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}
Unterschied Frontend vs Backend
Frontend:
- assets/js/
- nutzt anon key
- keine sensiblen Daten

Backend:
- backend/functions/
- nutzt Service Role Key
- enthält sichere Logik
##WICHTIG
Frontend darf niemals:
- Service Role Keys enthalten
- direkte DB Admin Operationen machen

Backend darf:
- sichere DB Operationen machen
- Emails senden
- Webhooks verarbeiten
- externe APIs nutzen
##Erweiterte SQL-Struktur
backend/database/
│
├── migrations/
│   ├── 001_create_tables.sql
│   ├── 002_create_policies.sql
│   ├── 003_create_functions.sql
│   ├── 004_create_triggers.sql
│   ├── 005_seed_data.sql
│   └── XXX_full_setup.sql
│
└── schema/
    └── schema.sql
schema.sql
Optional:
Vollständiger Export der aktuellen DB-Struktur
Nur zur Referenz
Nicht für Migrationen
Reihenfolge SQL
Normales Setup:
001 → 002 → 003 → 004 → 005

Neues Projekt:
XXX_full_setup.sql
##WICHTIGE REGEL
SQL = Struktur
Functions (TypeScript) = Logik
NICHT mischen
Webhooks + Functions
Webhooks triggern IMMER Functions

Flow:

Frontend → Webhook → Function → Database
Beispiel Architektur
User klickt Button
→ Frontend JS
→ ruft Webhook
→ Webhook ruft Supabase Function
→ Function schreibt in DB
##Pflichtregeln Backend
1. SQL nur in migrations/
2. Functions nur in backend/functions/
3. Jede Function eigener Ordner
4. index.ts ist Pflicht
5. Shared Code in _shared/
6. Keine Secrets im Frontend
7. Service Keys nur im Backend
Ziel
- klar getrennt (Frontend / Backend)
- sicher (keine Secrets im Frontend)
- skalierbar
- reproduzierbar
- Supabase-ready
