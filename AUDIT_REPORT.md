# 🏗️ Ultimativer Projekt-Audit
> Erstellt: 2026-03-31 | Analysiert von: Cursor AI  
> Brutal ehrlich. Keine Beschönigung.

---

## 📊 Scorecard (0–10 je Kategorie)

| Kategorie | Score | Begründung |
|---|---:|---|
| Produktreife | 7.5/10 | Sehr breiter Funktionsumfang (Planung, KI, Abwesenheiten, Dienstleister), aber mehrere produktive Flows sind noch Platzhalter-APIs. |
| Code-Qualität | 6.5/10 | Gute TypeScript-Basis + Zod in vielen Kernformularen, aber sehr große Komponenten (1k+ Zeilen) und spürbare Duplizierung. |
| Sicherheit | 4.5/10 | Auth-Checks sind oft da, aber RLS ist global offen für alle Auth-User (`USING (true)`), also kaum tenant-/rollen-scharf. |
| UX & Design | 8/10 | Konsistentes Designsystem, moderne UI, gute leere Zustände in mehreren Bereichen; mobile bei Kalender/Sidebars eingeschränkt. |
| Performance | 6/10 | Realtime + viele DB-Reads gut integriert, aber potenzielle N+1/Mehrfach-Queries und sehr große Client-Komponenten. |
| Fehlerbehandlung | 5.5/10 | Viele toasts vorhanden, aber viele Fire-and-forget `.catch(() => {})` verschlucken Fehler vollständig. |
| Skalierbarkeit | 5/10 | Fehlende strikte Datenisolation + teils monolithische Komponenten sind Skalierungsbremsen. |
| Verkaufsbereitschaft | 6.5/10 | Für frühe Pilotkunden nutzbar, für breiten Rollout fehlen robuste Integrationen/Hardening. |
| Investoren-Attraktivität | 6/10 | Starkes AI- und Workflow-Narrativ; Risiken bei Security-Governance und Testabdeckung drücken. |
| **Gesamt** | **6.1/10** | Starkes Produktgerüst, aber Security/Robustheit vor aggressivem Wachstum nachziehen. |

---

## 🎯 Executive Summary (5 Sätze)
Das Produkt ist eine moderne Einsatzplanungs-Plattform mit Abwesenheiten, Notfall-Umplanung, Dienstleister-Handling und KI-Assistenz/Agenten. Funktional ist es überraschend weit und bietet echten operativen Nutzen. Die größte Stärke ist die tiefe Verzahnung von Planung, KI und Automatisierung im Tagesgeschäft. Das größte Risiko ist Sicherheits-/Mandantenhärte: aktuelle RLS-Policies sind größtenteils breit offen für alle authentifizierten Nutzer. Heute ist es für kontrollierte Pilotkunden verkaufbar, aber für skalierte, sicherheitskritische Kunden noch nicht “enterprise-safe”.

---

## ✅ Stärken — Was wirklich gut ist

### Durchgängige Prozesskette von Planung bis Notfall
- Was: Einsatzplanung, Konflikterkennung, Notfallersatz und KI-Empfehlungen sind integriert.
- Warum gut: reduziert operative Reibung, schnelleres Incident-Handling.
- Beweis: `src/components/kalender/PlanungsKalender.tsx`, `src/components/notfall/NotfallModus.tsx`, `src/app/api/agents/emergency/route.ts`.
- Marktrelevanz: Für Handwerks-/Servicebetriebe ist Reaktionszeit bei Ausfällen ein direktes Umsatzthema.

### Starker KI-Stack mit strukturierter Ausgabe + Actions
- Was: Chat/Agenten mit strukturierten JSON-Antworten und Action-Endpoint.
- Warum gut: nicht nur “Chat”, sondern operativer Assistent.
- Beweis: `src/types/ki-actions.ts`, `src/app/api/ki-actions/route.ts`, `src/components/ki/KiChat.tsx`, `src/components/ki/KiAgenten.tsx`.
- Marktrelevanz: Investorenseitig klarer Differenzierungshebel gegenüber statischen Planungstools.

### Gutes UI-System und konsistentes Design
- Was: einheitliche Komponentisierung und wiederkehrendes Styling.
- Warum gut: geringere UX-Fragmentierung, besser wartbar.
- Beweis: `src/components/ui/*`, `src/components/einstellungen/*`, `src/components/ki/*`.
- Marktrelevanz: professionelle UI reduziert Verkaufshürde im B2B-Demo-Prozess.

---

## 🔴 Kritische Risiken (sofort beheben)

### KRITISCH-1: RLS ist funktional “alle Auth-User sehen fast alles”
- **Was:** Viele Policies erlauben globalen Zugriff mit `USING (true)` / `WITH CHECK (true)`.
- **Wo:** `supabase/migrations/20260327120001_rls_realtime.sql:25-48`, `supabase/migrations/20260328120000_rls_extended.sql:26-41`, `:66-81`, `:124-135`, `supabase/migrations/20260331120000_settings.sql:13-28`.
- **Konsequenz:** Datenschutz-/Mandantenrisiko (falsche Einsicht/Manipulation), potenziell DSGVO-relevant.
- **Schwere:** 🔴 Kritisch | Kern-Sicherheitsmodell aktuell zu breit.
- **Fix:** Policies auf `auth.uid()` + Betriebs-/Rollenbezug umstellen (row ownership / department scope), `settings` pro Betrieb/tenant normieren statt globalem Singleton.

### KRITISCH-2: Mehrere API-Routen ohne Auth und als Platzhalter produktiv erreichbar
- **Was:** Mehrere Endpunkte prüfen keine Session und liefern Platzhalterantworten.
- **Wo:** `src/app/api/subcontractors/decline/route.ts:3-5`, `confirm/route.ts:3-5`, `notify/route.ts:3-15`, `outlook/create-event/route.ts:3-16`, `outlook/update-event/route.ts:3-11`, `outlook/delete-event/route.ts:3-11`, `teams/send-message/route.ts:3-9`, `integrationen/status/route.ts:6-10`.
- **Konsequenz:** Angriffsfläche + falsche Erwartung in UI (“Feature wirkt live, ist aber stub”).
- **Schwere:** 🔴 Kritisch | Security + Vertrauensrisiko.
- **Fix:** Einheitlicher Guard (`auth.getUser` + Rollencheck), Platzhalter per Feature-Flag hard-deaktivieren.

### KRITISCH-3: Zu viele kritische Operationen sind “silent fail”
- **Was:** Fire-and-forget mit leerem Catch verschluckt Fehler.
- **Wo (Beispiele):** `src/components/kalender/EinsatzNeuDialog.tsx:319,350,415,464`, `src/components/kalender/PlanungsKalender.tsx:592,640`, `src/components/dienstleister/DienstleisterVerwaltung.tsx:619,644`, `src/lib/automatisierungen.ts:60`, `src/app/api/agents/conflict/route.ts:106`, `src/app/api/agents/weather/route.ts:78`.
- **Konsequenz:** User sieht Erfolg, obwohl Notifications/Mails/Agent-Trigger scheitern.
- **Schwere:** 🔴 Kritisch | Betriebszuverlässigkeit leidet.
- **Fix:** Fehler zentral loggen + UI-Rückmeldung (z. B. “Teilweise erfolgreich: Mail fehlgeschlagen”).

---

## ⚠️ Mittlere Findings

### MITTEL-1: Monolithische Komponenten erschweren Wartung
- **Was:** mehrere zentrale Komponenten > 1100 Zeilen.
- **Wo:** `src/components/abwesenheiten/AbwesenheitenVerwaltung.tsx:1591`, `MitarbeiterVerwaltung.tsx:1466`, `PlanungsKalender.tsx:1396`, `DienstleisterVerwaltung.tsx:1374`, `EinsatzNeuDialog.tsx:1154`.
- **Konsequenz:** höhere Bugrate bei Änderungen, längere Einarbeitung.
- **Fix:** Feature-Slicing (Hooks + Subcomponents + service layer).

### MITTEL-2: Mobile-Nutzung in Kernplanung eingeschränkt
- **Was:** fixe Sidebar-Breiten + viewport-gekoppelte Höhe.
- **Wo:** `src/components/kalender/PlanungsKalender.tsx:1323-1353` (`w-56`, `w-64`, `h-[calc(100vh-60px)]`, `overflow-hidden`).
- **Konsequenz:** schlechte Nutzbarkeit auf kleineren Geräten/Tablet.
- **Fix:** collapsible/off-canvas sidebars, responsive stacking, adaptive density.

### MITTEL-3: Integrationsstatus teilweise “scheinbar live”, real aber Platzhalter
- **Was:** Outlook/Teams/Subcontractor APIs geben Placeholder zurück.
- **Wo:** `src/app/api/outlook/*`, `src/app/api/teams/send-message/route.ts:3-9`, `src/app/api/subcontractors/*`.
- **Konsequenz:** Sales-/Onboarding-Friktion bei Kundenerwartung.
- **Fix:** klarer Feature-Status im UI + progressive rollout.

### MITTEL-4: API-Design enthält viel Logik in Routen statt Domänen-Layern
- **Was:** komplexe Businesslogik direkt in UI/API-Dateien.
- **Wo:** z. B. `src/components/kalender/EinsatzNeuDialog.tsx`, `src/components/notfall/NotfallModus.tsx`, `src/app/api/ki-actions/route.ts`.
- **Konsequenz:** Testbarkeit und Wiederverwendbarkeit sinken.
- **Fix:** Domain-Services in `src/lib/*` extrahieren.

---

## 💛 Kleine Findings / Nitpicks

- `[src/app/api/email/senden/route.ts:63]` TODO-Kommentar widerspricht aktuellem Stand → Kommentar aktualisieren.  
- `[src/components/dienstleister/DienstleisterVerwaltung.tsx:575,600]` Text “TODO: Resend aktivieren” ist veraltet → entfernen.  
- `[src/components/kalender/PlanungsKalender.tsx]` Hook-Dependency-Warnungen im Build → Callback-Dependencies sauber ergänzen.  
- `[src/lib/supabase/server.ts:23-25]` Catch ignoriert Cookie-Set-Fehler still → optional Debug-Logging.  

---

## 🔒 Sicherheits-Audit (vollständig)

### Multi-Tenant / Datenisolierung

| Tabelle | RLS aktiv | Policies | Betrieb-Isolation | Risiko |
|---|---|---|---|---|
| departments | ja | select/insert/update/delete auth | nein | hoch |
| employees | ja | select auth, update/insert/delete leitung | teilweise | mittel |
| customers | ja | select/insert/update (+delete extra) auth | nein | hoch |
| projects | ja | select/insert/update/delete auth | nein | hoch |
| assignments | ja | select/insert/update/delete auth | nein | hoch |
| absences | ja | select/insert/update/delete auth | nein | hoch |
| subcontractors | ja | select/insert/update/delete auth | nein | hoch |
| booking_rules | ja | select/insert/update/delete auth | nein | mittel |
| subcontractor_bookings | ja | select/insert/update/delete auth | nein | mittel |
| weather_alerts | ja | select/insert/update/delete auth | nein | mittel |
| notifications | ja | select/insert/update auth | nein | hoch |
| settings | ja | select/insert/update/delete auth | nein (global) | hoch |
| employee_departments | ja | select/insert/update/delete auth | nein | mittel |
| assignment_subcontractors | ja | select/insert/update/delete auth | nein | mittel |
| agent_log | ja | select/insert auth | nein | mittel |

**Belege:** `supabase/migrations/20260327120001_rls_realtime.sql`, `20260328120000_rls_extended.sql`, `20260331120000_settings.sql`, `20260329120000_agent_log_rls.sql`, `20260327200000_employee_departments.sql`, `20260430153000_assignment_subcontractors_pivot.sql`.

### API-Routen Sicherheits-Check

| Route | Method | Auth-Check | Ungeschützt | Risiko |
|---|---|---:|---:|---|
| `/api/agents/*` (chat/planning/capacity/weekly/learning/weather/conflict/emergency) | POST | ja | nein | mittel |
| `/api/ki-actions` | POST | ja | nein | mittel |
| `/api/email/senden` | POST | ja | nein | mittel |
| `/api/notifications/einsatz-neu` | POST | ja | nein | mittel |
| `/api/notifications/koordinatoren` | POST | ja | nein | mittel |
| `/api/integrationen/test` | POST | ja | nein | mittel |
| `/api/einstellungen/env-flags` | GET | ja | nein | niedrig |
| `/api/personio/sync` | POST | ja | nein | mittel |
| `/api/automations/trigger` | POST | ja | nein | mittel |
| `/api/admin/mitarbeiter/[id]` | PATCH | ja | nein | mittel |
| `/api/admin/mitarbeiter/einladen` | POST | ja | nein | mittel |
| `/api/profil/*` | GET/POST | ja | nein | niedrig |
| `/api/subcontractors/confirm` | POST | nein | ja | hoch |
| `/api/subcontractors/decline` | POST | nein | ja | hoch |
| `/api/subcontractors/notify` | POST | nein | ja | mittel |
| `/api/outlook/create-event` | POST | nein | ja | mittel |
| `/api/outlook/update-event` | POST | nein | ja | mittel |
| `/api/outlook/delete-event` | POST | nein | ja | mittel |
| `/api/teams/send-message` | POST | nein | ja | mittel |
| `/api/integrationen/status` | GET | nein | ja | niedrig |
| `/api/cron/weather-check` | GET | Bearer optional | bedingt | mittel |
| `/api/cron/weekly-report` | GET | Bearer optional | bedingt | mittel |
| `/api/cron/reminders` | GET | nein | ja | niedrig |

### Secrets & Client-Leaks
- `NEXT_PUBLIC_SYNCFUSION_KEY` ist absichtlich public im Client (`src/lib/syncfusion/register.ts:9`).
- Server-seitige Secrets korrekt in APIs genutzt (`GEMINI_API_KEY`, `RESEND_*`, `SUPABASE_SERVICE_ROLE_KEY`).
- **Risikopunkt:** `NEXT_PUBLIC_APP_URL` wird serverseitig als interne Callback-Basis verwendet (`src/lib/automatisierungen.ts:26`, `src/app/api/agents/conflict/route.ts:80`, `weather/route.ts:57`). Falsch gesetzter Wert kann Trigger ins Leere schicken.

---

## 🛡️ Fehlerbehandlung — Vollständige Liste

### Stille Fehler (catch ohne Handling)

| Datei | Zeile | Was wird ignoriert | Konsequenz |
|---|---:|---|---|
| `src/components/kalender/EinsatzNeuDialog.tsx` | 319,350,415,464 | Notification/Mail/Automation-Fetches | fehlende Nachvollziehbarkeit |
| `src/components/kalender/PlanungsKalender.tsx` | 592,640 | Mail-Update/Storno-Calls | inkonsistente Kommunikation |
| `src/components/dienstleister/DienstleisterVerwaltung.tsx` | 619,644 | Koordinatoren-Notify | stiller Ausfall |
| `src/lib/automatisierungen.ts` | 60 | Koordinatoren-Notify bei krank | Audit-Lücke |
| `src/app/api/agents/conflict/route.ts` | 106 | Koordinatoren-Notify | Warnungen verschwinden |
| `src/app/api/agents/weather/route.ts` | 78 | Koordinatoren-Notify | Warnungen verschwinden |

### Supabase ohne Error-Check (repräsentative Befunde)

| Datei | Zeile | Operation | Was passiert bei Fehler |
|---|---:|---|---|
| `src/components/kalender/PlanungsKalender.tsx` | 554-557 | `settings`-Load | Mail-Inhalt degradiert still |
| `src/components/kalender/EinsatzNeuDialog.tsx` | 376-379 | `settings`-Load | betrieb_name ggf. leer |
| `src/lib/automatisierungen.ts` | 46-52,54-59 | `agent_log` inserts | Logging-Fehler werden nicht surfaced |

### KI/Gemini Fehlerszenarien
- **429/Rate-Limit:** kein zentrales Retry/Backoff erkennbar, meist Direktfehler.
- **Invalid JSON:** vorhanden (Fallbacks in Agent-Routen), z. B. `src/app/api/agents/conflict/route.ts:68-78`, `weather/route.ts:45-55`.
- **Timeout/API down:** meist Catch + generische Meldung; kein standardisiertes Circuit-Breaking.

### Flows ohne klares User-Feedback (wichtig)
- Hintergrund-Notifications (Mail/Koordinatoren/Automations) laufen oft ohne sichtbares Ergebnis für User.
- Teilweise “Erfolg” trotz Nebenfehlern (z. B. Einsatz gespeichert, Mail fehlgeschlagen).

---

## 🗄️ Datenintegrität

### DB-Schema Bewertung (Kern)

| Tabelle | FK mit ON DELETE | NOT NULL | Unique | Indexes | Bewertung |
|---|---|---|---|---|---|
| employees | ja | teilweise | email/auth_user_id unique | department partial index | gut |
| projects | ja | gut | - | status/start idx | gut |
| assignments | ja | gut, aber employee inzwischen nullable | overlap-constraint geändert | employee/project/team/dienstleister idx | mittel |
| absences | ja | gut | unique `(employee_id,start_date,absence_type)` | employee/status idx | gut |
| settings | n/a | key not null | key unique | key idx | mittel (singleton/tenant) |
| subcontractors | n/a | mittel | - | via relation indexes | mittel |

### Validierung

| Flow | Client-Validierung | Server-Validierung | Schema (Zod?) | Lücken |
|---|---|---|---|---|
| Mitarbeiter erstellen | ja | teilweise | ja | API-seitig begrenzt |
| Einsatz erstellen | ja | DB-checks | ja | Nebenaktionen ohne harte Validierung |
| Abwesenheit | ja | teilweise | ja | unterschiedliche Eintragspfade |
| Integrationen speichern | ja | teilweise | ja | Secret-/Formatchecks begrenzt |
| KI-Aktionen | nein (direkt API) | teilweise | nein | Payload-Schema fehlt serverseitig |

### Gefährliche Szenarien
- Mitarbeiter löschen mit Einsätzen: `assignments.employee_id` war historisch `ON DELETE CASCADE`; bei Schemaänderung auf nullable besteht Migrationskonsistenz-Risiko.
- Projekt löschen: `assignments`/`subcontractor_bookings`/`weather_alerts` hängen via `ON DELETE CASCADE` → massiver Datenverlust möglich.
- `end_time < start_time`: durch Check-Constraint in Initialschema geschützt (`20260327000000_initial_schema.sql:82`), aber durch spätere Constraint-Änderungen prüfen.
- Doppelte Einsätze: absences dedupliziert, assignments-Duplikate weiterhin möglich je nach Flow.

---

## 📱 UX & Mobile-Audit

### Seiten-für-Seiten Mobile-Check

| Seite/Komponente | Mobile-Klassen | Nutzbar auf Handy | Kritische Probleme |
|---|---|---|---|
| Dashboard | ja | überwiegend | viele Karten, aber ok |
| Kalender | eingeschränkt | eingeschränkt | fixe Sidebars + feste Höhe (`PlanungsKalender.tsx:1323-1353`) |
| Mitarbeiter | ja | mittel | große Dialoge/Tabellen |
| KI-Chat | ja | gut | min-height 560 (`KiChat.tsx:230`) |
| Einstellungen | ja | gut | viele Felder, aber strukturiert |
| Notfall | ja | mittel | dichte Informationsdarstellung |

### Onboarding
- Kein dedizierter Onboarding-Wizard erkennbar.
- Nach Login: AppShell + Modulnavigation, aber kein expliziter “First-run guide”.
- Empty States vorhanden in mehreren Bereichen, aber inkonsistent.

### Loading & Feedback

| Seite | Skeleton/Spinner | Fehler-Toast | Erfolg-Toast |
|---|---|---|---|
| Planung | ja | ja | ja |
| Mitarbeiter | ja | ja | ja |
| Abwesenheiten | ja | ja | ja |
| KI | ja | ja | teilweise |
| Einstellungen | ja | ja | ja |

---

## ⚡ Performance-Audit

### N+1 / Mehrfachabfragen (repräsentativ)

| Datei | Zeile | Problem | Fix |
|---|---:|---|---|
| `src/components/kalender/EinsatzNeuDialog.tsx` | 470-530 | Insert in verschachtelten Loops (Tage x Teams/DL) + Zusatzcalls | Batch-Insert + queue Nebenaktionen |
| `src/components/kalender/PlanungsKalender.tsx` | 846-873 | pro ID einzelnes Update | bulk update pipeline |
| `src/lib/data/dashboard.ts` | mehrere | viele count/head Abfragen | materialisierte Übersicht/aggregates |

### Fehlende Indexes (wahrscheinliche Kandidaten)

| Tabelle | Spalte | Query in Datei | Impact |
|---|---|---|---|
| absences | `(employee_id,start_date,end_date)` | Konflikt-/Abwesenheitschecks in Planung/Notfall | mittel |
| assignments | `(date,team_id)` | Kalender-/Teamansicht | mittel |
| agent_log | `(agent_type,created_at)` | KI-Automatisierungen Verlauf | mittel |

### Große Komponenten
- Top-10 größte Dateien siehe `Code-Qualität`-Sektion; mehrere >1000 Zeilen.

### Bundle / Dependencies

| Library | Größe (geschätzt) | Notwendig | Alternative |
|---|---|---|---|
| `@syncfusion/ej2-*` | hoch | aktuell ja (Kalenderfunktionen) | FullCalendar + custom UI |
| `framer-motion` | mittel | UX nice-to-have | CSS transitions |
| `recharts` | mittel | für Dashboards sinnvoll | visx/lightweight custom |
| `react-markdown` + `remark-gfm` | mittel | für KI-Text sehr sinnvoll | begrenzter Markdown-Renderer |

---

## 🧹 Code-Qualität

### TypeScript-Probleme

| Datei | Zeile | Problem |
|---|---:|---|
| `src/components/notfall/NotfallModus.tsx` | 605 | `as unknown as Record<string, unknown>` |
| `src/components/projekte/ProjekteVerwaltung.tsx` | 234 | `as unknown as ProjektZeile` |
| `src/components/abteilungen/AbteilungenVerwaltung.tsx` | 84,109 | doppelte unknown-casts |
| `src/app/api/cron/weather-check/route.ts` | 127 | `as unknown as Record<string, unknown>` |

### TODOs / Platzhalter

| Datei | Zeile | Inhalt | Priorität |
|---|---:|---|---|
| `src/app/api/email/senden/route.ts` | 63 | TODO Resend-Hinweis (veraltet) | mittel |
| `src/components/dienstleister/DienstleisterVerwaltung.tsx` | 575,600 | TODO Resend aktivieren | mittel |
| `src/app/api/notifications/einsatz-neu/route.ts` | 55-63 | Twilio/Teams Stub | hoch |
| `src/app/api/automations/trigger/route.ts` | 82 | Typ noch nicht implementiert | hoch |

### Fake/Stub Features

| Feature | Datei | Was fehlt |
|---|---|---|
| Outlook Sync | `src/app/api/outlook/*` | echte Graph-Anbindung |
| Teams Send Message | `src/app/api/teams/send-message/route.ts` | reale Zustellung |
| Subcontractor confirm/decline | `src/app/api/subcontractors/confirm|decline` | echte Statusverarbeitung |
| Cron reminders/weekly | `src/app/api/cron/reminders|weekly-report` | produktive Inhalte |

### Größte Komponenten (Top 10)
1. `src/components/abwesenheiten/AbwesenheitenVerwaltung.tsx` (1591)  
2. `src/components/mitarbeiter/MitarbeiterVerwaltung.tsx` (1466)  
3. `src/components/kalender/PlanungsKalender.tsx` (1396)  
4. `src/components/dienstleister/DienstleisterVerwaltung.tsx` (1374)  
5. `src/components/projekte/ProjekteVerwaltung.tsx` (1184)  
6. `src/components/notfall/NotfallModus.tsx` (1165)  
7. `src/components/kalender/EinsatzNeuDialog.tsx` (1154)  
8. `src/components/teams/TeamsVerwaltung.tsx` (921)  
9. `src/components/abteilungen/AbteilungenVerwaltung.tsx` (665)  
10. `src/components/notfall/NotfallSteuerung.tsx` (645)  

### Duplizierte Logik

| Logik | Vorkommt in | Lösung |
|---|---|---|
| Mailversand-Trigger in UI | Kalender + Dienstleister + API | zentrale Event-Queue/Domain service |
| Konflikt-/Abwesenheitsprüfungen | Kalender + Notfall + KI-Kontext | shared service mit einheitlicher Semantik |
| Settings-Ladevorgänge | viele Komponenten/APIs | zentraler settings repository/cache |

---

## 📋 Feature-Vollständigkeit

| Feature | Status | Qualität 1-10 | Was fehlt für 10/10 |
|---|---|---:|---|
| Mitarbeiterverwaltung | ✅ | 8 | feinere Rollenrechte + mehr Tests |
| Kalender / Einsatzplanung | ✅⚠️ | 7 | mobile/scale + robustere Nebenaktionen |
| Drag & Drop Planung | ✅ | 8 | Undo/History |
| Projektverwaltung | ✅ | 7 | API-Hardening, kleinere Komponenten |
| Abwesenheiten (Urlaub/Krank) | ✅ | 8 | serverseitige End-to-end Validierung |
| Dienstleister-Modul | ✅⚠️ | 7 | echte confirm/decline routes |
| KI-Chat mit DB-Actions | ✅⚠️ | 7 | guardrails/approval policy |
| KI-Agenten (alle 5+) | ✅⚠️ | 7 | Retry/observability |
| Automatisierungen | ✅⚠️ | 6 | idempotency + queueing |
| E-Mail (Resend) | ✅⚠️ | 7 | Delivery-Status/Retry |
| ICS / Outlook-Kalender | ✅⚠️ | 6 | echte Outlook API flows |
| WhatsApp (Twilio) | ⚠️ | 5 | produktiver Versand statt Stub |
| Teams Webhook | ⚠️ | 5 | robustes Error Handling |
| Personio-Sync | ⚠️ | 4 | echter bidirektionaler Sync |
| Einstellungen (Betrieb) | ✅ | 8 | audit-log + validation |
| Rollen & Rechte | ⚠️ | 5 | strikte RLS + permission matrix |
| Reporting / Analytics | ⚠️ | 5 | KPI-Tracking und Historien |
| Mobile-Nutzung | ⚠️ | 6 | Planung auf kleinen Screens |
| Onboarding neuer Betrieb | ❌ | 3 | Setup wizard + Checklisten |
| Datenschutz / DSGVO | ⚠️ | 4 | Datenisolation + Lösch-/Exportprozesse |
| Audit-Log / Nachvollziehbarkeit | ⚠️ | 5 | konsistente Eventlogs |
| CSV-Import Mitarbeiter | ❌ | 2 | fehlt |
| Tests (Unit/Integration) | ❌ | 2 | kaum formale Tests sichtbar |
| Dokumentation | ⚠️ | 5 | technische + Admin-Doku ausbauen |

---

## 💡 Verbesserungsideen & Quick Wins

### Tenant-sichere RLS-Matrix
- Was genau: Policies pro Rolle + Betriebseinheit statt `true`.
- Warum Mehrwert: Security/Compliance + Enterprise-Vertrauen.
- Aufwand: L
- Priorität: Hoch

### Zentrales Notification-Delivery-Layer
- Was genau: Queue + retry + dead-letter + sichtbarer Delivery-Status.
- Warum Mehrwert: weniger stille Ausfälle.
- Aufwand: M
- Priorität: Hoch

### Kalender-Mobile-Refactor
- Was genau: Responsive Sidebars + adaptive layout.
- Warum Mehrwert: Einsatzleiter nutzen unterwegs.
- Aufwand: M
- Priorität: Mittel

### Komponenten-Zerlegung Top-5
- Was genau: 5 größte Komponenten in modulare Hooks/Views splitten.
- Warum Mehrwert: schnellere Entwicklung, weniger Regressionen.
- Aufwand: L
- Priorität: Hoch

---

## 💰 Markt & Business-Einschätzung

### Produkt-Market-Fit Hypothese
- Heute gut genug: mittelgroße Handwerks-/Servicebetriebe mit Dispatcher-Bedarf und hoher Ausfall-Volatilität.
- Noch nicht gut genug: stark regulierte Enterprise-Umfelder mit strikten Security-/Audit-Anforderungen.

### Stärkstes Alleinstellungsmerkmal (USP)
- Operative KI direkt in Planung + Notfall + Aktionen (nicht nur “Chat”): `src/app/api/ki-actions/route.ts`, `src/components/notfall/*`, `src/components/ki/*`.

### Schwächste Stelle vs. Wettbewerb
- Reife Integrationen und Governance (Rollen/RLS, Auditability, formale Reliability) sind schwächer.

### Pricing-Empfehlung

| Tier | Preis/Mo | Enthaltene Features | Zielgruppe |
|---|---:|---|---|
| Starter | €99 | Planung, Projekte, Abwesenheit, Basis-KI | kleine Teams |
| Wachstum | €249 | + Notfall, Automatisierungen, Dienstleister, Mail/ICS | wachsende Betriebe |
| Professional | €599 | + erweiterte Rollen, SLA, API/Integrationen, erweitertes Reporting | größere Organisationen |

### Go-to-Market: erste 5 zahlende Kunden
- Kanal: direkte Demos über lokale SHK-/Bau-Netzwerke.
- Botschaft: “Weniger Planungschaos bei Ausfällen, schneller Ersatz, klare Kommunikation.”
- Einwände: “Ist das sicher/stabil?” → Antwort mit Security-Roadmap + Pilot-SLA + klaren Integrationsgrenzen.

### Investoren-Sicht
- **Stärke:** starker Workflow-Fit + KI nicht als Gimmick, sondern als Prozessmotor.
- **Abschreckend:** breite RLS-Policies und fehlende Testhärte.
- **Top-3 Fragen:** (1) Churn/Retention in Pilotkunden? (2) Security-Hardening-Zeitplan? (3) Integrations-Roadmap vs. Wettbewerb?

---

## 🚀 Priorisierte Roadmap

### 🔴 Diese Woche (Blocker für erste Kunden)
1. RLS-Hardening für Kern-Tabellen (`supabase/migrations/*rls*.sql`) — 3-5 Tage  
2. Auth + Feature-Flag für stub APIs (`src/app/api/subcontractors/*`, `outlook/*`, `teams/send-message`) — 1-2 Tage  
3. Silent-Fail-Tracking (Sentry/structured logs + UI partial failures) — 1-2 Tage

### ⚠️ Nächste 2 Wochen (für verkaufbares MVP)
1. Kalender-Mobile Verbesserungen (`PlanungsKalender.tsx`) — 3-4 Tage  
2. Komponenten-Zerlegung Top-3 (Kalender, Abwesenheiten, Mitarbeiter) — 1-2 Wochen  
3. Delivery-Status für E-Mail/Automationen — 2-3 Tage

### 💛 Monat 2 (für Wachstum)
1. Echte Outlook-/Teams-/Subcontractor-Integrationen  
2. Test-Suite (kritische Flows: Einsatz/Abwesenheit/Notfall/KI-Actions)

### 💚 Monat 3+ (für Skalierung)
1. Event-driven Backend (Queue, retries, idempotency keys)  
2. Vollständiges Audit-Logging + Compliance-Features (Export/Löschung)

---

## 🏁 Fazit
Das Produkt ist funktionsstark und in mehreren Bereichen bereits über MVP-Niveau. Es ist heute für kontrollierte Piloten verkaufbar, aber noch nicht robust genug für sicherheitskritisches breites Rollout. Der wichtigste nächste Schritt ist nicht “mehr Features”, sondern Security-/Reliability-Hardening (RLS, Auth, Fehlertransparenz).

---
_Ende des Reports — generiert von Cursor AI_

