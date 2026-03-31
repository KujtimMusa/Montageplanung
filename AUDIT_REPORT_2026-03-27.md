# MVP AUDIT REPORT — 2026-03-27

**Codebasis:** `monteur-app` (Next.js 14, Supabase, Gemini/AI SDK)  
**Methodik:** Vollständige Lesung aller in der Spezifikation genannten App-Pages; rekursives Inventar `src/components/**/*.tsx` (104 Dateien), `src/app/api/**/route.ts` (36 Routen), alle SQL-Migrationen, `src/lib/**`, `src/types/**`, `package.json`, `.env.example`, `src/middleware.ts`. Stichproben und `grep` über Platzhalter/TODO/Phase-Kommentare.  
**Einschränkung:** Nicht jede der 104 Komponenten-Dateien wurde Zeile für Zeile vollständig gelesen; Aussagen zu Einzelfeatures sind dort, wo nicht anders vermerkt, durch Architektur-Patterns und stichprobenartige Dateien belegt.

---

## 1. EXECUTIVE SUMMARY (5 Sätze)

**Produkt in einem Satz:** Web-App zur **Einsatz- und Teamplanung** für Handwerk/Montage mit Supabase-Backend, Ressourcen-Timeline (FullCalendar), Stammdaten (Projekte, Teams, Dienstleister), Abwesenheiten, Notfallplan mit KI und einem KI-Bereich (Chat, Agenten, Automation-Toggles).

**MVP-Fortschritt (subjektiv):** ca. **58 %** — Kernplanung und Datenmodell sind da; Integrationen (Outlook/Teams/Twilio/Personio) sind größtenteils **Platzhalter oder Stub**; Automatisierungen sind **persistiert**, aber **ohne echte Trigger-Pipeline**; Tests fehlen.

**Stärkste Seite:** **Planung** (`planung/page.tsx` + `PlanungsKalender.tsx`) — fokussiertes UX-Konzept, schwerer Implementierungsanteil; plus **Dashboard** mit berechneten KPIs (`lib/data/dashboard.ts`).

**Kritischste Schwäche:** **Vertriebsexterne Integrationsversprechen** (E-Mail, Teams, WhatsApp, Personio-Sync, Outlook) sind im Code mehrfach als **Phase X / Platzhalter / 501** markiert — ein zahlender Kunde erwartet sonst Funktionen, die nicht produktionsreif sind.

**Verkaufbar heute?** **Nein** als vollständiges SaaS ohne Vorbehalt — **Ja** nur als **Early-Access / Pilot** mit klarer Scope-Liste und fehlenden Integrationen in Schriftform; sonst Reputations- und Supportrisiko.

---

## 2. FEATURE-MATRIX

| Feature | Implementiert | Funktionsfähig | Produktionsreif | Mehrwert (1–10) | Kritisch für MVP |
|--------|---------------|----------------|-----------------|------------------|------------------|
| Dashboard | Ja | Ja | Teilweise | 7 | Ja |
| Planungskalender | Ja | Ja | Teilweise | 9 | Ja |
| Projekte | Ja | Ja | Ja | 7 | Ja |
| Teams | Ja | Ja | Ja | 8 | Ja |
| Mitarbeiter | Redirect zu `/teams?tab=mitarbeiter` | Ja | Ja | 6 | Mittel |
| Abwesenheiten | Ja | Ja | Teilweise | 7 | Ja |
| Dienstleister | Ja | Ja | Teilweise | 7 | Mittel |
| Notfallplan | Ja | Ja | Teilweise | 8 | Ja |
| KI-Chat | Ja | Ja (mit `GEMINI_API_KEY`) | Teilweise | 7 | Mittel |
| KI-Agenten | Ja | Ja (Stream) | Teilweise | 6 | Mittel |
| Automatisierungen | UI + DB-Spalten | Toggles speichern | **Nein** (keine Server-Trigger) | 4 | Niedrig bis Mittel |
| Auth/Login | Ja | Ja | Ja | 8 | Ja |
| Einstellungen | Ja | Ja | Teilweise | 7 | Ja |
| Personio-Sync | Route + UI | **Stub** (`imported: 0`, nur Timestamp) | **Nein** | 3 | Mittel (wenn verkauft) |

*Legende „Produktionsreif“: ohne bekannte Platzhalter in kritischen Pfaden.*

---

## 3. KRITISCHE BUGS & BLOCKER

🔴 **Integrations-Versprechen vs. Realität**  
**Wo:** u. a. `src/app/api/outlook/create-event/route.ts`, `update-event`, `delete-event`, `src/app/api/teams/send-message/route.ts`, `src/app/api/subcontractors/notify/route.ts`, `src/lib/whatsapp/twilio.ts`, `src/lib/microsoft/graph.ts`  
**Was passiert:** Platzhalter-Responses, `501`, oder `throw` „noch nicht konfiguriert“.  
**Impact:** Kunde konfiguriert Einstellungen und erwartet Kalender/Teams/WhatsApp — **es passiert faktisch nichts Sinnvolles**.  
**Fix-Aufwand:** **Groß** (pro Integration Tage bis Wochen).

🔴 **Personio „Sync“ ohne Import**  
**Wo:** `src/app/api/personio/sync/route.ts` (Zeilen 39–45: `imported: 0`, Hinweis „in Arbeit“)  
**Was passiert:** Nur `personio_last_sync` wird gesetzt.  
**Impact:** **Schein-Funktion** — HR-Teams verlassen sich auf falsche Erwartung.  
**Fix-Aufwand:** **Groß**.

🔴 **KI-Seite: „Gemini verbunden“ ohne Live-Check**  
**Wo:** `src/app/(app)/ki/page.tsx` Zeilen 22–25  
**Was passiert:** Statisches UI-Badge, **kein** Health-Check auf `GEMINI_API_KEY` oder API.  
**Impact:** Vertrauensbruch in Demos.  
**Fix-Aufwand:** **Klein** (Env-Check Server-Action oder `/api/einstellungen/env-flags`).

🔴 **`emergency_log` ohne RLS in Migrationen**  
**Wo:** `supabase/migrations/20260327000000_initial_schema.sql` (Tabelle), **keine** `ENABLE ROW LEVEL SECURITY` / Policy für `emergency_log` in `grep` über `migrations/`  
**Was passiert:** Potenziell **kein oder Default-Supabase-Verhalten** — je nach Deployment **Datenleck oder Insert-Fail** (Client-Insert in `NotfallModus` bereits mit `console.warn` abgefangen).  
**Impact:** **Sicherheit / Compliance** bei Due Diligence.  
**Fix-Aufwand:** **Mittel**.

🔴 **Doppelte/legacy Komponenten-Pfade**  
**Wo:** z. B. `KiAgentenPlatzhalter.tsx` / `KiAssistentSeite.tsx` unter `agenten/` vs. neue `components/ki/*`  
**Was passiert:** Wartungs- und Navigationsverwirrung (teilweise durch Redirect `/ki-assistent` → `/ki` entschärft).  
**Impact:** Onboarding neuer Entwickler, tote UI-Pfade.  
**Fix-Aufwand:** **Mittel** (Aufräumen).

---

## 4. CODE-QUALITÄT & TECHNISCHE SCHULDEN

| Kriterium | Note (1–6) | Kurzbegründung |
|-----------|------------|----------------|
| TypeScript-Typisierung | **4** | Viele `Record<string, unknown>`, API-Bodies teils unscharf; wo genutzt solide (`dashboard.ts`, `notfall-ki.ts`). |
| Error-Handling | **3** | `ladeDashboardDaten`: `catch { return leer }` — **schluckt Fehler** (`src/lib/data/dashboard.ts` ~256–258). Viele Toasts, aber wenig strukturiertes Logging. |
| Loading-States | **4** | Planung: `Suspense` + dynamic loading; Dashboard: ok; nicht überall konsistent. |
| Konsistenz (Stil, Naming) | **4** | Mix Deutsch/Englisch in Routen/Keys; „Phase“-Kommentare überall. |
| Performance (100+ MA) | **3** | Dashboard lädt **alle** `assignments` für Konflikt-Count (`select` ohne Limit, `dashboard.ts` ~114–116) — **O(n²)** Gruppenvergleich — bei großen Daten **riskant**. |
| Sicherheit | **3–4** | API-Routen nutzen überwiegend `getUser()`; **Cron-Routen** müssen separat geprüft sein (nicht alle hier im Detail gelesen). `settings` RLS ja; `emergency_log` siehe oben. |
| Tests | **1** | **Keine** `*.test.*` / `*.spec.*` im Repo (Glob 0 Treffer). |

**Top 5 technische Schulden (konkret):**

1. **Keine automatisierten Tests** — Regression bei Refactors (Kalender, Konflikte, Notfall) hochriskant.  
2. **Dashboard-Performance & stille Fehler** — volle Assignment-Tabelle + `catch` ohne Monitoring.  
3. **Parallele KI-Stacks** — `@google/generative-ai` (`gemini.ts`) + `ai` + `@ai-sdk/google` (`ki-client.ts`); Legacy-Hilfen `lib/agents/planning.ts` etc. noch `rufeGeminiFlashAuf`.  
4. **Integrations-Inseln** — Microsoft/Twilio/Resend nur Gerüste (`graph.ts`, `twilio.ts`, Outlook-Routen).  
5. **Automatisierungen** — DB-Flags ohne **Database Webhooks / Edge Functions / Queue**, die bei `INSERT absences` o. Ä. reagieren (`KiAutomatisierungen.tsx` beschreibt Trigger nur textlich).

---

## 5. USP-ANALYSE

**✅ ECHTER USP — Ressourcen-Timeline + deutschsprachige Handwerks-Planung**  
**Warum:** Kombination FullCalendar Resource Timeline + eigene Geschäftslogik (Teams, Konflikt-Hinweise, Einsatzdialog) ist **nicht Standard-Excel**.  
**Umsetzung:** Hoch in `PlanungsKalender`/Hooks; abhängig von Datenqualität.  
**Potenzial:** Drag-Drop-Stabilität, Mobile, Performance.

**✅ ECHTER USP — Notfallplan mit strukturierter KI-Ausgabe (JSON) + UI**  
**Warum:** Branchenspezifisch (Ersatz, Abteilung, WhatsApp-Text).  
**Umsetzung:** `NotfallModus`, `/api/agents/emergency`, `parse-ki-antwort.ts`.  
**Potenzial:** Zuverlässigkeit JSON vs. Modell-Drift; `emergency_log` Governance.

**⚠️ POTENTIELLER USP — KI-Chat mit DB-Kontext**  
**Fehlt für USP:** Gedächtnis über Sessions, Tool-Calling (echte DB-Schreibvorschläge mit Bestätigung), Rate-Limits, Audit.

**❌ KEIN USP — „WhatsApp/Teams-Benachrichtigung“**  
**Warum:** Wettbewerber und generische Field-Service-Tools haben echte Kanäle; hier **Twilio/Graph größtenteils nicht fertig** (`notifications/einsatz-neu` loggt nur Stub wenn kein SID).

---

## 6. INVESTOR-PERSPEKTIVE

**WOW-MOMente:**  
- Visuelle Planung (Timeline) wirkt in Demos **sofort verständlich**.  
- Notfall + KI wirkt **innovativ** — wenn `GEMINI_API_KEY` live funktioniert.  
- Dashboard-KPIs wirken „Enterprise-light“.

**Kritische Investor-Fragen:**  
1. „Wie unterscheidet ihr euch von **Fieldwire / PlanGrid / Assignar / ToolTime**?“ — Antwort muss **DACH-Handwerk + Einsatzplanung** sein, nicht generisch.  
2. „Wo ist eure **defensible IP** — Datenmodell, Workflow, KI, Integrationen?“  
3. „**Wie groß** ist der technische Schuldenberg bei Integrationen?“ — Code belegt: **hoch**.  
4. „**Wie messt ihr** Produktnutzung und ROI beim Kunden?“ — Im Code **kein** Analytics-Layer sichtbar.  
5. „**Multi-Tenant / Mandantenfähigkeit**?“ — Schema wirkt **single-tenant pro Supabase-Projekt**; kein `org_id` in allen Tabellen explizit für dieses Audit verifiziert.

**Rote Flags:**  
- Viele „Phase X“-Kommentare im **Produktions-Code**.  
- Personio-Sync **täuscht** Funktion vor.  
- **Keine Tests.**

**Due-Diligence-Schwachstellen:**  
- RLS-Lücken prüfen (`emergency_log`).  
- API-Oberfläche für Cron/Webhooks ohne zentrale Auth-Doku in diesem Audit.

---

## 7. KUNDEN-PERSPEKTIVE — ZAHLUNGSBEREITSCHAFT

**Zielgruppe (aus Code):** deutschsprachige **Montage-/Handwerksplanung**, Teamleitung, Disposition (Rollen in `employees`, Bereiche, Teams).

**Onboarding bis erster Wert:** realistisch **2–5 Tage** (Stammdaten, erste Projekte/Einsätze, ggf. Integrationen — letztere oft enttäuschend).

**Sofort positiv:**  
1. Klare Navigation und **Planungsansicht**.  
2. **Dashboard** mit Zahlen.  
3. **Notfallplan** wirkt professionell (wenn KI konfiguriert).

**Sofort störend:**  
1. **Fehlende oder halbe Integrationen** nach Erwartung „alles in Einstellungen“.  
2. **Personio** suggeriert HR-Sync — trifft nicht zu.  
3. **Automatisierungen** — Schalter ohne spürbare Automatik.

**Zahlungsbereitschaft:**  
- **Aktuell:** **Vielleicht** für **Pilot 500–1.500 €/Monat** (kleines Team), wenn Scope schriftlich begrenzt.  
- **Nach Fixes (Integrationen ehrlich oder fertig):** **1.500–4.000 €/Monat** je nach Nutzerzahl (Schätzung).  
- **Vollständiges MVP** (stabile Integrationen, Tests, Monitoring): **4.000–12.000 €/Monat** je Positionierung — **nicht aus Code ableitbar**, Marktabhängig.

**ROI:** Ohne Zeiterfassungs-Export und belastbare Benachrichtigungen **schwer quantifizierbar**; theoretisch **Stunden Disposition/Woche** bei aktivem Kalender — real **nur mit Nutzungsdaten** belegbar.

---

## 8. WETTBEWERBS-ANALYSE (kurz)

| Gegenüber | Was die oft haben | Was diese App (noch) schwächer hat |
|-----------|-------------------|-------------------------------------|
| Field Service / Dispatch-Suiten | Reife Mobile Apps, Routen, Telematik | Kein Fokus auf Routing/GPS in diesem Audit |
| Microsoft-first Betriebe | Tiefe **365/Teams**-Integration | Graph/Teams **Platzhalter** |
| Einfache Tools (Excel/Outlook) | Null Kosten | **Höherer Setup** — dafür zentrale Daten |

**Marktlücke:** **DACH-Handwerk**, **mittelständische** Betriebe, die **kein** US-Enterprise-FSM wollen, aber mehr als Excel brauchen — **wenn** Produkt **ehrlich** verkauft und Integrationen nachgeliefert werden.

---

## 9. PRIORISIERTE ROADMAP

### 🔴 SOFORT (diese Woche) — ohne das kein Verkauf
1. **Integrations-Truth-Page** in UI: was geht / was nicht (`IntegrationenTab` + Docs) — **Mittel**.  
2. **Personio-Route:** UI-Text „Beta / nur Zeitstempel“ oder Feature-Flag ausblenden — **Klein**.  
3. **`emergency_log` RLS + Policy** — Migration — **Mittel**.  
4. **KI-Badge:** echten Status aus Server — **Klein** (`ki/page.tsx`).

### 🟡 KURZFRISTIG (2 Wochen)
1. **Dashboard:** Assignment-Query limitieren/aggregieren + Fehler loggen statt schlucken — **Mittel**.  
2. **Eine** Integration **fertig** (z. B. Resend **oder** Twilio WhatsApp) end-to-end — **Groß**.  
3. **Legacy-KI-Hilfen** (`lib/agents/planning.ts` etc.) konsolidieren oder löschen — **Mittel**.

### 🟢 MITTELFRISTIG (1 Monat)
1. **Automatisierungen:** Supabase **Database Webhooks** oder **Edge Function** bei `absences`/`assignments` — **Groß**.  
2. **Test-Suite** kritische Pfade (Konflikt, Notfall-Parsing) — **Groß**.  
3. **Observability** (Sentry o. Ä.) — **Mittel**.

### ⬜ NICE-TO-HAVE
- Microsoft SSO (`login/page.tsx` erwähnt Phase 4).  
- Vollständiger Outlook-Zweiwege-Sync.

---

## 10. GESAMTBEWERTUNG

| Dimension | Balken | Note |
|-----------|--------|------|
| MVP-Reife | ■■■■■□□□□□ | **5/10** |
| Code-Qualität | ■■■■□□□□□□ | **4/10** |
| UX/Design | ■■■■■□□□□□ | **5/10** |
| KI-Integration | ■■■■□□□□□□ | **4/10** |
| Produktionsreife | ■■■□□□□□□□ | **3/10** |
| Verkaufbarkeit | ■■■□□□□□□□ | **3/10** |

**GESAMT: 4/10** (gewichtet: Produktkern stark, Integrations-Story schwach)

**Top 3 Stärken:**  
1. Planung + Datenmodell + UI-Fokus.  
2. Notfall + KI als differenzierendes Narrativ.  
3. Supabase + Next — moderner Stack, gute Basis.

**Top 3 Schwächen:**  
1. **Integrations-Realität** vs. UI.  
2. **Keine Tests**.  
3. **Performance/Error-Handling** an strategischen Stellen (Dashboard).

**Ein-Satz-Urteil:**  
„**Starkes Planungs-Fundament und überzeugende KI-Oberflächen, aber die halbfertigen Integrationen und fehlenden Tests würden einen professionellen B2B-Kaufprozess ohne klaren Pilot-Scope derzeit torpedieren.**“

---

## 11. QUICK-WINS (< 2 h, hoher Wahrnehmungsgewinn)

1. **`ki/page.tsx`:** Badge „Gemini“ nur bei erfolgreichem Check (`/api/einstellungen/env-flags` oder kurzer HEAD) → **weniger Demo-Lügen**.  
2. **Personio-Panel:** Text „Sync speichert nur Zeitstempel — Import folgt“ (`personio/sync/route.ts` konsistent) → **Vertrauen**.  
3. **Outlook/Teams API-Routen:** HTTP-Status und Body einheitlich **503 + klare JSON-Meldung** statt gemischter Platzhalter → **weniger Verwirrung**.  
4. **`ladeDashboardDaten`:** `console.error` oder strukturiertes Log im `catch` statt stillem `leer` → **Supportability**.  
5. **Navigation:** Legacy-Link-Aufräumen oder README „Source of Truth: `/ki`“ → **Onboarding Devs**.

---

## ANHANG A — Inventar (Auszug)

- **App-Pages (alle gelesen):** `dashboard`, `planung`, `projekte`, `teams`, `mitarbeiter` (Redirect), `abwesenheiten`, `dienstleister`, `notfall`, `ki`, `einstellungen` — plus im Repo existierend: `abteilungen`, `benachrichtigungen`, `kunden`, `ki-assistent` (Redirect).  
- **Komponenten:** 104× `*.tsx` unter `src/components/` (vollständige Liste im Repo-`glob`).  
- **API:** 36× `route.ts` unter `src/app/api/`.  
- **Migrationen:** 17× `.sql` unter `supabase/migrations/`.  
- **Tests:** 0.

---

*ENDE AUDIT REPORT*
