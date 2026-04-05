# Feature-Bewertung

## Inventar (Basis der Bewertung)

### `src/app/(app)/` — alle `page.tsx` (Dateiname + Kurzbeschreibung)
- `src/app/(app)/ki/page.tsx` - KI-Bereich mit Tabs Chat/Agenten/Automatisierungen, Tab per Query-Param.
- `src/app/(app)/notfall/page.tsx` - rendert den Notfallmodus.
- `src/app/(app)/planung/page.tsx` - rendert den Planungs-Kalender (dynamic + Suspense).
- `src/app/(app)/projekte/page.tsx` - rendert Projekte/Kunden-Bereich.
- `src/app/(app)/kunden/page.tsx` - Redirect auf `/projekte?tab=kunden`.
- `src/app/(app)/abwesenheiten/page.tsx` - rendert Abwesenheiten-Verwaltung.
- `src/app/(app)/dashboard/page.tsx` - lädt Dashboard-Daten serverseitig und rendert Übersicht/Realtime.
- `src/app/(app)/ki-assistent/page.tsx` - Redirect auf `/ki`.
- `src/app/(app)/dienstleister/page.tsx` - rendert Dienstleister-Verwaltung.
- `src/app/(app)/teams/page.tsx` - lädt Profil, schützt Zugang, rendert Teams-Bereich.
- `src/app/(app)/einstellungen/page.tsx` - rendert Einstellungen-Inhalt.
- `src/app/(app)/abteilungen/page.tsx` - Redirect auf `/teams?tab=abteilungen`.
- `src/app/(app)/mitarbeiter/page.tsx` - Redirect auf `/teams?tab=mitarbeiter`.
- `src/app/(app)/benachrichtigungen/page.tsx` - Benachrichtigungs-Seite (In-App-Mitteilungen).

### `src/app/api/` — alle `route.ts` (Dateiname + Kurzbeschreibung)
- `src/app/api/superadmin/stats/route.ts` - Superadmin-Statistiken cross-tenant.
- `src/app/api/integrationen/status/route.ts` - Statusflags (z. B. Twilio konfiguriert).
- `src/app/api/notifications/einsatz-neu/route.ts` - Benachrichtigung bei neuem Einsatz (aktuell Twilio-Stub-Flow).
- `src/app/api/integrationen/test/route.ts` - Test für `twilio|resend|gemini`.
- `src/app/api/einstellungen/env-flags/route.ts` - liefert Env-Flags (bool).
- `src/app/api/org/gruenden/route.ts` - Organisation gründen + initiales Employee/Settings.
- `src/app/api/agents/emergency/route.ts` - KI-Notfallvorschläge.
- `src/app/api/agents/learning/route.ts` - KI-Learning-Auswertung aus Logs/Daten.
- `src/app/api/agents/weather/route.ts` - Wetter-Agent (Open-Meteo + KI).
- `src/app/api/agents/weekly/route.ts` - Wochenreport-Agent.
- `src/app/api/agents/capacity/route.ts` - Kapazitäts-Agent.
- `src/app/api/agents/conflict/route.ts` - Konflikt-Agent.
- `src/app/api/agents/planning/route.ts` - Planungs-Agent.
- `src/app/api/agents/chat/route.ts` - Chat-Agent (Kontext + Stream).
- `src/app/api/notifications/koordinatoren/route.ts` - E-Mails an Koordinatoren.
- `src/app/api/profil/self-sync/route.ts` - Self-Sync/Org-Status.
- `src/app/api/org/invite/route.ts` - Org-Einladung erzeugen/versenden.
- `src/app/api/email/senden/route.ts` - E-Mail Versand inkl. optional ICS.
- `src/app/api/cron/weekly-report/route.ts` - Cron-Endpunkt Wochenreport (gesichert).
- `src/app/api/cron/weather-check/route.ts` - Cron Wetterprüfung + `weather_alerts`.
- `src/app/api/cron/reminders/route.ts` - Reminder-Cron (derzeit 501/Platzhalter).
- `src/app/api/ki-actions/route.ts` - validierte KI-Aktionen mit DB-Schreibzugriff.
- `src/app/api/subcontractors/notify/route.ts` - Dienstleister-Notify (Stub).
- `src/app/api/subcontractors/decline/route.ts` - Dienstleister-Decline (Stub/501).
- `src/app/api/subcontractors/confirm/route.ts` - Dienstleister-Confirm (Stub/501).
- `src/app/api/automations/trigger/route.ts` - Automation Trigger.
- `src/app/api/abwesenheit/ki-parse/route.ts` - KI-Parser für Abwesenheits-Freitext.
- `src/app/api/admin/mitarbeiter/[id]/route.ts` - Admin-Mitarbeiter update/sync.
- `src/app/api/profil/mitarbeiter-self/route.ts` - eigenes Mitarbeiterprofil lesen.
- `src/app/api/admin/mitarbeiter/einladen/route.ts` - Mitarbeiter per Invite einladen.

### `supabase/migrations/` — alle Dateien (nur Namen)
- `20260501120000_superadmin.sql`
- `20260331183000_tenant_isolation_customers_teams_departments.sql`
- `20260501110000_employees_email_not_unique.sql`
- `20260501105000_settings_org_unique.sql`
- `20260501104000_org_not_null.sql`
- `20260501103000_auth_trigger_fix.sql`
- `20260501102000_rls_tenant.sql`
- `20260501101000_org_functions.sql`
- `20260501100000_organizations.sql`
- `20260331180002_rls_phase2_hardening.sql`
- `20260331180000_rls_fix.sql`
- `20260331180001_indexes.sql`
- `20260331170000_settings_betrieb.sql`
- `20260331213000_absences_remove_fully_covered_ranges.sql`
- `20260331210000_absences_unique_constraint_guard.sql`
- `20260331200000_absences_unique_notfall_dedupe.sql`
- `20260430190000_relax_assignments_overlap_constraint.sql`
- `20260430153000_assignment_subcontractors_pivot.sql`
- `20260430120000_assignments_null_employee_partial_exclusion.sql`
- `20260327200000_employee_departments.sql`
- `20260429100000_ensure_departments_leader_id.sql`
- `20260428200000_customers_delete_rls.sql`
- `20260402120000_departments_leader_id.sql`
- `20260428120000_projects_farbe_adresse.sql`
- `20260427120000_settings_automations.sql`
- `20260402130000_service_providers_dienstleister_id.sql`
- `20260402125000_assignments_prioritaet.sql`
- `20260401130000_ensure_employees_qualifikationen_team_id.sql`
- `20260401120000_rls_employees_teamleiter.sql`
- `20260331190000_fix_auth_trigger_admin.sql`
- `20260331160000_teams_farbe.sql`
- `20260331140000_absences_personio.sql`
- `20260331123000_realtime_dashboard_tables.sql`
- `20260331120000_settings.sql`
- `20260327120001_rls_realtime.sql`
- `20260327000000_initial_schema.sql`
- `20260330120000_fokus_leitung.sql`
- `20260328120001_realtime_absences.sql`
- `20260330140000_assignments_team_id.sql`
- `20260328120000_rls_extended.sql`
- `20260329120000_agent_log_rls.sql`

### `package.json` — dependencies + devDependencies
- Dependencies: `@ai-sdk/google`, `@ai-sdk/react`, `@base-ui/react`, `@google/generative-ai`, `@hookform/resolvers`, `@supabase/ssr`, `@supabase/supabase-js`, `@syncfusion/*`, `ai`, `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `date-fns-tz`, `framer-motion`, `lucide-react`, `next`, `next-pwa`, `next-themes`, `react`, `react-day-picker`, `react-dom`, `react-hook-form`, `react-markdown`, `react-resizable-panels`, `recharts`, `remark-gfm`, `shadcn`, `sonner`, `tailwind-merge`, `tw-animate-css`, `zod`.
- DevDependencies: `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `eslint-config-next`, `postcss`, `tailwindcss`, `tailwindcss-animate`, `typescript`.

### `src/components/` — Unterordner
- `abteilungen`, `abwesenheiten`, `agenten`, `auth`, `dashboard`, `dienstleister`, `einstellungen`, `kalender`, `ki`, `landing`, `layout`, `mitarbeiter`, `notfall`, `projekte`, `stammdaten`, `teams`, `ui`, `wetter` (+ `providers.tsx` auf Root-Ebene unter `components`).

### `src/lib/` — Dateien
- `auth-check.ts`, `automatisierungen.ts`, `email.ts`, `email-templates.ts`, `fehler.ts`, `ics.ts`, `logger.ts`, `org.ts`, `projekt-status.ts`, `rollen.ts`, `stammdatenFarben.ts`, `utils.ts`.
- Unterordner-Dateien: `agents/*`, `auth/*`, `constants/*`, `data/*`, `hooks/*`, `microsoft/*`, `notfall/*`, `planung/*`, `supabase/*`, `syncfusion/*`, `utils/*`, `weather/*`, `whatsapp/*`.

---

## Zusammenfassung

| Feature | Projektstatus % | Aufwand | Empfehlung |
|---|---:|---|---|
| Feature 1 — Magic Link (Monteur) | 15% | L | Bald |
| Feature 2 — Arbeitszeiterfassung via Magic Link | 10% | L | Bald |
| Feature 3 — Baudoku/Fotos via Magic Link | 10% | L-XL | Später |
| Feature 4 — Kunden-Status-Link | 15% | L | Später |
| Feature 5 — Wetter-Agent (verbessert) | 70% | S-M | Sofort |
| Feature 6 — Skill-Match System | 45% | M | Bald |
| Feature 7 — Kalkulations-Tool | 20% | L | Später |
| Bonus — PDF-Export | 5% | M-L | Später |

---

## Detailbewertung

### Feature 1 — Magic Link (Monteur-Ansicht)
**Idee:** Login-freier Einsatzlink `/m/[token]` für Bestätigen/Ablehnen am Einsatztag.  
**Projektstatus:**  
  - Tabellen in DB? **Teilweise**: `assignments` existiert, aber **kein** `assignment_token`.  
  - API-Routen? **Nein** für `/m/[token]`-Flow.  
  - UI-Komponenten? **Nein** für öffentliche Monteur-Linkseite.  
  - Libraries installiert? **Ja** (Next/Supabase vorhanden), aber nichts Spezifisches nötig.  
**Umsetzbarkeit:** Mittel  
**Aufwand:** L (1-2 Wochen)  
**Abhängigkeiten:** Token-Feld + Gültigkeitslogik + anon-sichere RLS oder serverseitige Token-Proxy-Route.  
**Risiken:** Token-Leak, Replay, zu breite anon-Policies auf `assignments`.  
**Empfehlung:** Bald

Prüfresultate:
- Token-Feld in `assignments`: **Nein**
- `/m/` Route: **Nein**
- RLS-Policy für anon auf `assignments`: **Nein** (nur `authenticated`)
- Supabase anon-Key konfiguriert: **Ja** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Feature 2 — Arbeitszeiterfassung via Magic Link
**Idee:** Check-in/Check-out am Einsatz per Magic Link, inkl. Live-Aktivstatus.  
**Projektstatus:**  
  - Tabellen in DB? **Nein** für `checkin_at/checkout_at`; keine dedizierte Zeiterfassungs-Tabelle.  
  - API-Routen? **Nein** für start/stop-Zeiterfassung.  
  - UI-Komponenten? **Nein** für Live-Aktivstatus auf Dashboard.  
  - Libraries installiert? **Ja** (ausreichend Grundstack), aber Logik fehlt.  
**Umsetzbarkeit:** Mittel  
**Aufwand:** L (1-2 Wochen)  
**Abhängigkeiten:** Schemaerweiterung `assignments` oder neue `time_entries`, Mobile-UI, sichere Token-Autorisierung.  
**Risiken:** Doppelte Starts/Stops, Offline-Fälle, Manipulation von Zeiten.  
**Empfehlung:** Bald

Prüfresultate:
- `checkin_at/checkout_at` in `assignments`: **Nein**
- Zeiterfassungs-Tabelle: **Nein**
- Live-Status-UI im Dashboard: **Nein**

### Feature 3 — Baudoku / Foto-Upload via Magic Link
**Idee:** Foto-Upload + Notiz (+ optional Speech-to-Text) direkt am Einsatz.  
**Projektstatus:**  
  - Tabellen in DB? **Nein** (`assignment_photos` nicht vorhanden).  
  - API-Routen? **Nein** für Foto-Upload/Listing zu Assignments.  
  - UI-Komponenten? **Nein** dediziert für Einsatz-Fotodoku.  
  - Libraries installiert? Keine spezielle Upload-Lib nötig; Browser/File API reicht.  
**Umsetzbarkeit:** Mittel  
**Aufwand:** L-XL (1-3+ Wochen, je nach UX)  
**Abhängigkeiten:** Storage-Bucket + Policies, Foto-Metadaten-Tabelle, Public-Link-UI.  
**Risiken:** Datenschutz, Dateigrößen, Missbrauch öffentlicher Upload-Tokens, Storage-Kosten.  
**Empfehlung:** Später

Prüfresultate:
- Supabase Storage im Code konfiguriert/verwendet: **Nein sichtbar**
- `assignment_photos` Tabelle: **Nein**
- Upload-Komponenten in `src/components`: **Nein**
- File-Upload-Library installiert: **Nein**

### Feature 4 — Kunden-Status-Link
**Idee:** Öffentlicher Status-Link `/status/[token]` mit Fortschrittszustand.  
**Projektstatus:**  
  - Tabellen in DB? `customers` vorhanden, aber **kein** `customer_token` in `assignments`.  
  - API-Routen? **Nein** für Status-Token-Readmodel.  
  - UI-Komponenten? **Nein** für Kunden-Tracking-Seite.  
  - Libraries installiert? Ja, ausreichend für UI-Umsetzung.  
**Umsetzbarkeit:** Mittel  
**Aufwand:** L (1-2 Wochen)  
**Abhängigkeiten:** Tokenisierung, Statusmodell (`unterwegs/vor_ort/fertig`), öffentliches Read-API.  
**Risiken:** Datenschutz (Mitarbeiterinfos), Token-Sharing, fehlerhafte Statusableitung.  
**Empfehlung:** Später

Prüfresultate:
- `customer_token` in `assignments`: **Nein**
- `/status/` Route: **Nein**
- `employee.foto_url`: **Nein**
- `customers` mit Adresse: **Ja** (`address`, `city`, `postal_code`, `lat`, `lng`)

### Feature 5 — Wetter-Agent (verbessert)
**Idee:** Tägliche Wetterprüfung mit Warnungen + Planungsalternativen + Benachrichtigungen.  
**Projektstatus:**  
  - Tabellen in DB? **Ja**: `weather_alerts` vorhanden.  
  - API-Routen? **Ja**: `/api/agents/weather`, `/api/cron/weather-check`.  
  - UI-Komponenten? **Teilweise**: Wetter-Widget/Alerts vorhanden, ausbaufähig.  
  - Libraries installiert? **Ja**: bestehende Open-Meteo-Integration in `src/lib/weather/open-meteo.ts`.  
**Umsetzbarkeit:** Einfach bis Mittel  
**Aufwand:** S-M (1-5 Tage)  
**Abhängigkeiten:** Feinere Schwellwerte, bessere Adress-Geodaten, Eskalationsregeln.  
**Risiken:** Wetterdatenqualität, Alert-Fatigue, zu viele False Positives.  
**Empfehlung:** Sofort

Prüfresultate:
- `/api/agents/weather`: **Ja**
- `weather_alerts` Tabelle: **Ja**
- `OPENWEATHERMAP_API_KEY`: **Nein** (stattdessen Open-Meteo ohne Key)
- `project.adresse / lat_lng`: **Ja** (`address` über Kunde, `lat/lng` im Kundenmodell; `weather_sensitive` im Projekt)
- OpenWeatherMap integriert: **Nein**
- `/api/cron/weather-check`: **Ja**

### Feature 6 — Skill-Match System
**Idee:** Qualifikationsabgleich Mitarbeiter ↔ Projektanforderungen mit Warnindikatoren.  
**Projektstatus:**  
  - Tabellen in DB? **Teilweise**: `employees.qualifikationen` existiert; **kein** `projects.required_skills`.  
  - API-Routen? **Teilweise**: Skills werden in Agenten/Notfall bereits gelesen; kein formaler Skill-Mismatch-Endpoint.  
  - UI-Komponenten? **Teilweise**: Qualifikationen im Mitarbeiterkontext vorhanden; kein durchgängiger Skill-Mismatch-Indicator im Kalender.  
  - Libraries installiert? **Ja** (keine spezielle Extra-Lib nötig).  
**Umsetzbarkeit:** Mittel  
**Aufwand:** M (3-5 Tage)  
**Abhängigkeiten:** `required_skills` in Projekten, Match-Logik in Einsatz-Erstellung/Update, sichtbare Warn-UI.  
**Risiken:** uneinheitliche Skill-Bezeichnungen, zu viele Warnungen, Akzeptanzprobleme bei Disposition.  
**Empfehlung:** Bald

Prüfresultate:
- `employees.qualifikationen`: **Ja**
- `projects.required_skills`: **Nein**
- Skill-UI in Mitarbeiterprofil: **Teilweise/ja**
- Skill-Check in KI-Actions: **Nicht systematisch**
- `skills/qualifikationen` Tabelle: **Nein**

### Feature 7 — Kalkulations-Tool
**Idee:** Projekt-Margenübersicht aus Stundensätzen, Aufwand und Budget.  
**Projektstatus:**  
  - Tabellen in DB? **Nein** für `employees.stundensatz`, `projects.budget`, `assignments.geplante_stunden`.  
  - API-Routen? **Nein** dediziert für Kosten/Marge.  
  - UI-Komponenten? **Nein** dedizierte Kostenansicht.  
  - Libraries installiert? **Ja**: `recharts` bereits da.  
**Umsetzbarkeit:** Mittel bis Komplex  
**Aufwand:** L (1-2 Wochen)  
**Abhängigkeiten:** neues Kosten-Schema, Erfassungs-/Pflegeflächen, Validierungsregeln, rollensicherer Zugriff.  
**Risiken:** falsche Margen durch unvollständige Zeiterfassung, falsche Stammdaten, Vertrauensverlust bei Zahlen.  
**Empfehlung:** Später

Prüfresultate:
- `employees.stundensatz`: **Nein**
- `projects.budget`: **Nein**
- `assignments.geplante_stunden`: **Nein**
- Kosten-Übersicht im Dashboard: **Nein**
- `recharts`: **Ja**

### Bonus — PDF-Export
**Idee:** Einsatz als PDF-Dokument (Details, Zeiten, Fotos, Wetter, optional Unterschrift).  
**Projektstatus:**  
  - Tabellen in DB? Zeiten/Fotos fehlen teilweise (siehe Features 2+3).  
  - API-Routen? Kein dedizierter PDF-Export-Endpoint gefunden.  
  - UI-Komponenten? Kein Export-Flow sichtbar.  
  - Libraries installiert? `jspdf`, `@react-pdf/renderer`, `puppeteer` **nicht installiert**.  
**Umsetzbarkeit:** Mittel  
**Aufwand:** M-L (3-10 Tage, je nach Render-Anspruch)  
**Abhängigkeiten:** stabile Datenbasis (Zeiten/Fotos), PDF-Stack, Template.  
**Risiken:** Layout-Brüche, Browser-/Druck-Inkonsistenz, große Dateien.  
**Empfehlung:** Später

---

## Empfohlene Umsetzungsreihenfolge
1. **Feature 5 (Wetter-Agent verbessern)** - höchste Reife, geringer Aufwand, schneller Business-Impact.
2. **Feature 6 (Skill-Match)** - viele Grundlagen da (`qualifikationen`), hoher Compliance-Nutzen.
3. **Feature 1 (Magic Link Monteur)** - Schlüsselbaustein für mobile Feldprozesse.
4. **Feature 2 (Zeiterfassung via Magic Link)** - baut direkt auf Feature 1 auf.
5. **Feature 4 (Kunden-Status-Link)** - baut auf Token-/Statuslogik aus 1+2 auf.
6. **Feature 3 (Baudoku/Fotos)** - sinnvoll nach stabiler Magic-Link-Infrastruktur.
7. **Feature 7 (Kalkulation)** - erst wenn Zeiterfassung + Datenqualität belastbar sind.
8. **Bonus PDF** - zuletzt, wenn Daten vollständig vorliegen.

---

## Was sofort gebaut werden kann
- **Feature 5 — Wetter-Agent (verbessert)** (>50% vorhanden)

## Was von Grund auf neu ist
- **Feature 1 — Magic Link (Monteur-Ansicht)** (<20%)
- **Feature 2 — Arbeitszeiterfassung via Magic Link** (<20%)
- **Feature 3 — Baudoku/Foto-Upload via Magic Link** (<20%)
- **Feature 4 — Kunden-Status-Link** (<20%)
- **Bonus — PDF-Export** (<20%)

