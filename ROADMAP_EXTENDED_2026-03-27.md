# 🗺️ PRODUKT-FAHRPLAN — MONTEUR-APP (ERWEITERT)

**Ziel:** Erster zahlender Kunde in 4 Wochen  
**Stand:** 2026-03-27  
**Methodik:** Codebasis stichprobenartig vollständig inventarisiert (`page.tsx`, `api/**/route.ts`, `lib/**`, `migrations/**`, `package.json`); Kernmodule und kritische Pfade gelesen. **Nicht** jede der 100+ Komponenten-Zeilen einzeln — Evidenz für ✅ TEIL aus konkreten Dateien.

---

## Interne Antworten (Code-basiert)

**Halb fertig → schneller Mehrwert:**  
- **`/api/einstellungen/env-flags`** liefert bereits Booleans für Gemini/Twilio/Resend/Teams — nur **kein** Test-Ping, kein UI-Badge (→ F1/F2 schnell).  
- **Personio:** UI + API speichern Timestamp; Text „Import folgt“ existiert teilweise (`PersonioSyncPanel.tsx`) — F3 ist Feinschliff.  
- **Benachrichtigungen:** Tabelle + RLS existieren; **Seite** ist Platzhalter (`benachrichtigungen/page.tsx`).  
- **KI:** `ki-client` + Agenten-Routen; **Badge** auf `/ki` statisch.

**Als Entwickler täglich vermisst:** Globale Suche, echte Fehler-Transparenz (Dashboard `catch` schluckt), Tests, konsistente Integrations-Wahrheit, Audit wer was geändert hat.

**3 Demo-WOWs (wenn umgesetzt):**  
1. **Onboarding + Demo-Daten** — nie leere UI.  
2. **Echte E-Mail** (Resend) bei neuem Einsatz — greifbarer „Wow“ als nur KI-Text.  
3. **PDF-Wochenplan** — Bauleitung nimmt Papier mit.

**B2B-Verkauf fehlt:** Rollen hart in API, RLS pro Rolle, SLA/Support-Story, Monitoring, **ehrliche** Integrationsmatrix, Verträge/Pilot-Scope, ggf. Multi-Tenant später.

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ TEIL | Bereits teilweise im Code vorhanden |
| 💡 NEU | Zusätzliche Idee (Produkt/Engineering) |
| Aufwand | **Klein** \< 4h · **Mittel** 4–16h · **Groß** \> 16h |

---

════════════════════════════════════════════════  
🗺️ PRODUKT-FAHRPLAN — MONTEUR-APP  
Ziel: Erster zahlender Kunde in 4 Wochen  
════════════════════════════════════════════════  

---

## Sprint-Priorität neu (Kurz)

**In Sprint 1 unbedingt priorisieren (höchster Demo-ROI):**  
1. **[N1] Onboarding + [N2] Demo-Daten** — ohne leere Demo kein Verkauf.  
2. **[F1]/[F2]** auf Basis von **✅ TEIL `env-flags`** — schnell, hohes Vertrauen.  
3. **[F3] Personio** — Text/Label (bereits teils da) finalisieren.  
4. **[F4]/[F5] Dashboard** — Vertrauen + Performance.

**Aus Sprint 1 in „Sprint 1b“ oder Sprint 2 schieben, wenn Zeit knapp:**  
- **[N3] Cmd+K** — **Groß**, stark, aber nicht vor leerer Demo.  
- **[F6] RLS komplett** — kritisch für Verkauf, kann **parallel** als kleiner PR; `emergency_log` ohne Policy ist Show-Stopper bei DD.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
SPRINT 1 — DEMO-READY  
Ziel: App kann einem echten Kunden gezeigt werden  
Zeitaufwand: 3–4 Tage (rein Dev; +0,5 Tag QA)  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  

### FIXES (Vertrauen & Ehrlichkeit)

**[F1] Integrations-Status-Dashboard** — Aufwand: **Mittel**  
Wo: `src/app/(app)/einstellungen/page.tsx` + neue Komponente  
Was: Pro Kanal (Gemini, Twilio/WhatsApp, Resend/E-Mail, Graph/Teams, Personio) ein Status-Badge: 🟢 Verbunden | 🟡 Konfiguriert (nicht getestet) | 🔴 Nicht eingerichtet  
Wie: Server-seitig ENV prüfen + optional Test-Ping; Ergebnis 5 Min cachen  
Dateien: `src/app/api/einstellungen/status/route.ts` (neu) **oder** Erweiterung von `env-flags`  
✅ **TEIL:** `src/app/api/einstellungen/env-flags/route.ts` liefert bereits Key-Präsenz (ohne Testcall, ohne UI-Bündelung).

**[F2] KI Health-Check echter Testcall** — Aufwand: **Mittel**  
Wo: `src/app/(app)/ki/page.tsx`  
Was: Badge nur grün bei Key + Mini-`streamText`/Ping  
✅ **TEIL:** KI läuft über `ki-client`; Badge aktuell **statisch** (kein Check).

**[F3] Personio ehrlich labeln** — Aufwand: **Klein**  
Wo: `src/components/abwesenheiten/PersonioSyncPanel.tsx`, `src/app/api/personio/sync/route.ts`  
✅ **TEIL:** Panel sagt bereits „Vollständiger Datenimport folgt…“; API: `imported: 0`, Message „in Arbeit“ — F3 = Button-Labels + Banner verschärfen.

**[F4] Dashboard Fehler sichtbar** — Aufwand: **Mittel**  
Wo: `src/lib/data/dashboard.ts`  
Was: `catch` nicht still; Toast + Log/Sentry  
✅ **TEIL:** Robustes Fallback-Objekt `leer` existiert — Problem ist **stilles Verschlucken**.

**[F5] Dashboard Performance** — Aufwand: **Mittel** bis **Groß**  
Wo: `src/lib/data/dashboard.ts`  
Was: Zeitraum begrenzen / DB-Aggregation  
✅ **TEIL:** Logik für Konflikte clientseitig über große Assignment-Menge — skalierungsgefährdet.

**[F6] RLS-Audit & Fix** — Aufwand: **Groß** (einmalig)  
Wo: neue Migration  
Was: `emergency_log` + Tabellen ohne Policy  
✅ **TEIL:** `notifications`, `settings`, Kern-Tabellen haben RLS; **`emergency_log` ohne RLS in Migrationen sichtbar** (Audit-Report).

### NEUE FEATURES Sprint 1

**[N1] Onboarding-Flow** — Aufwand: **Groß**  
✅ **TEIL:** Rollen/Navigation existieren; **kein** geführtes Onboarding-Widget.

**[N2] Demo-Daten Seed-Script** — Aufwand: **Groß** (Daten + Safety)  
Wo: `supabase/seed/demo_data.sql` + sicherer Trigger nur auf leerer DB / Admin.

**[N3] Globale Suche (Cmd+K)** — Aufwand: **Groß**  
💡 **NEU (Ergänzung):** Debounce-Queries auf `employees`/`projects`/`assignments` mit **RLS-sicheren** Limits; Shortcut ohne `react-hotkeys-hook` erst mit `useEffect` + `keydown` möglich (Dependency sparen) oder Package bewusst hinzufügen.

---

### 💡 NEU — Sprint 1 (optional, wenn Kapazität)

| ID | Idee | Warum passend | Aufwand |
|----|------|----------------|---------|
| 💡 **S1-A** | **„Leere Zustände“-Killswitch:** Dashboard zeigt CTA „Demo laden“ / „Ersten Einsatz anlegen“ statt Nullen überall | Gleicher Effekt wie Onboarding, minimal-invasive UI | Klein |
| 💡 **S1-B** | **Integrations-„Wahrheits-PDF“** (1 Seite): aus `env-flags` generierter Report für Sales („Was geht live“) | B2B-Verkauf ohne Marketing-Lügen | Klein |
| 💡 **S1-C** | **Feature-Flag-Datei** `src/lib/config/features.ts` (nur Konstanten, noch keine UI) | Grundlage Pilot-Scope | Klein |

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
SPRINT 2 — PRODUKT-QUALITÄT  
Ziel: Täglich nutzbar, mobile-tauglich, testbar  
Zeitaufwand: 4–5 Tage  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  

**[S2-1] Kalender PDF-Export** — Aufwand: **Groß**

**[S2-2] Mobile-Ansicht** — Aufwand: **Groß**  
✅ **TEIL:** `Planung` nutzt `PlanungsKalender` (dynamic ssr:false); responsives zweites Layout fehlt.

**[S2-3] Tests** — Aufwand: **Groß** (Setup + erste Tests)  
✅ **TEIL:** `package.json` hat **kein** Jest/Vitest — von Null.

**[S2-4] Sentry** — Aufwand: **Mittel**  
✅ **TEIL:** keine Sentry-Dependency.

**[S2-5] KI-Stack vereinheitlichen** — Aufwand: **Mittel**  
✅ **TEIL:** API-Routen nutzen `ki-client`; `src/lib/agents/gemini.ts` + `planning.ts`/`conflict.ts`/`weather.ts` noch Legacy.

**[S2-6] Benachrichtigungs-Center** — Aufwand: **Groß**  
✅ **TEIL:** `notifications`-Tabelle + RLS; **Seite** fast leer; **kein** Bell in `layout` (grep).

### 💡 NEU — Sprint 2

| ID | Idee | Aufwand |
|----|------|---------|
| 💡 **S2-D** | **Einsatz-Änderungsprotokoll** (wer hat `assignments` geändert): Tabelle `assignment_audit` oder `agent_log` erweitern | Mittel |
| 💡 **S2-E** | **„Woche kopieren“** (Template): letzte Woche Einsätze auf neue Woche duplizieren (mit Konfliktcheck) | Groß |
| 💡 **S2-F** | **Baustellen-Link:** `projects`/Einsatz mit `lat`/`lng` oder Adresse → „In Maps öffnen“ (externer Link) | Klein–Mittel |
| 💡 **S2-G** | **Wetter-Badge** auf Einsatz: `weather_sensitive` + Open-Meteo schon in `lib/weather` — nur UI-Konsequenz | Mittel |

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
SPRINT 3 — ERSTE ECHTE INTEGRATION  
Ziel: Mindestens 1 Kanal sendet wirklich  
Zeitaufwand: 4–5 Tage  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  

**[S3-1] Resend E-Mail end-to-end** — Aufwand: **Groß**  
✅ **TEIL:** `env-flags` kennt `resend_api_key`; `einsatz-neu` loggt nur Stub ohne `RESEND_API_KEY`.

**[S3-2] Automatisierungen ausführen** — Aufwand: **Groß** (Infra)  
✅ **TEIL:** `KiAutomatisierungen.tsx` + DB-Spalten `settings`; **keine** Edge Functions im Repo.

**[S3-3] Kapazität/Heatmap** — Aufwand: **Mittel** (UI) + **Mittel** (API)  
✅ **TEIL:** `/api/agents/capacity` streamt Text; Darstellung als Heatmap fehlt.

**[S3-4] Wochenbericht** — Aufwand: **Mittel**  
✅ **TEIL:** `/api/agents/weekly` existiert; Cron-`weekly-report` Platzhalter.

### 💡 NEU — Sprint 3

| ID | Idee | Aufwand |
|----|------|---------|
| 💡 **S3-H** | **Zusage-Deadline Subunternehmer:** Buchung + Erinnerung 24h vorher (E-Mail wenn Resend da) | Groß |
| 💡 **S3-I** | **„Notfall-SLA“-Anzeige:** Zeit von Ausfall bis bestätigtem Ersatz aus `emergency_log` | Mittel |

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
SPRINT 4 — SALES-READY  
Ziel: Erster zahlender Pilot-Kunde  
Zeitaufwand: 3–4 Tage  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  

**[S4-1] Rollen in UI durchsetzen** — Aufwand: **Groß**  
✅ **TEIL:** `src/lib/auth/angestellter.ts` definiert Rollen + `darf*`; **nicht** überall konsistent in API/UI erzwungen.

**[S4-2] ROI-Rechner** — Aufwand: **Mittel**

**[S4-3] Pilot Feature-Flags** — Aufwand: **Klein**–**Mittel**

**[S4-4] RLS komplett** — Aufwand: **Groß** (Überlappung mit F6)

### 💡 NEU — Sprint 4

| ID | Idee | Aufwand |
|----|------|---------|
| 💡 **S4-J** | **Pilot-Vertragstext** in App (Markdown) + „Akzeptierte Module“ | Klein |
| 💡 **S4-K** | **Admin-Export** aller Settings (ohne Secrets) für Support-Tickets | Klein |

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
NACH SPRINT 4 — WACHSTUM  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  

(W1–W8 wie im Originalplan)  

### 💡 NEU — Wachstum / Differenzierung

| ID | Idee | Aufwand |
|----|------|---------|
| 💡 **W1b** | **Monteur-Tagescheckliste** (Material, Sicherheit, Zugang) pro Einsatz | Mittel |
| 💡 **W2b** | **QR am Einsatz** (PWA): „Angekommen“ bestätigt → `assignments.status` / Zeitstempel | Groß |
| 💡 **W3b** | **KI: „Was ist diese Woche riskant?“** — Wetter + Abwesenheit + Kapazität kombinieren (eine Agent-Route) | Mittel |
| 💡 **W4b** | **Kundenportal light (tokenisierter Link)** ohne Voll-Portal | Groß |

---

## Zusammenfassung Aufwand (nur neue/erweiterte Punkte)

| Bereich | Klein | Mittel | Groß |
|---------|-------|--------|------|
| Sprint 1 Zusatz (S1-A–C) | 3 | 0 | 0 |
| Sprint 2 Zusatz (S2-D–G) | 1 | 2 | 1 |
| Sprint 3 Zusatz (S3-H–I) | 0 | 0 | 0 |
| Sprint 4 Zusatz (S4-J–K) | 2 | 0 | 0 |
| Wachstum (W1b–W4b) | 0 | 2 | 2 |

---

## FINALER PLAN — Reihenfolge für „4 Wochen / erster Kunde“

1. **Woche 1:** Sprint 1 (F1–F6 priorisiert, N1+N2 zuerst; N3 wenn Zeit).  
2. **Woche 2:** Sprint 2 (Tests + Sentry + Mobile/PDF nach Priorität; Benachrichtigungs-Center).  
3. **Woche 3:** Sprint 3 (Resend Pflicht; Automatisierung minimal ein Trigger).  
4. **Woche 4:** Sprint 4 (Rollen + ROI + Flags + RLS-Abschluss).

**Nicht implementiert** — nur Planung (diese Datei).

---

*ENDE ROADMAP_EXTENDED*
