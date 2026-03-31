# Ultimativer Audit Report (V3)

Erstellt: 2026-03-31  
Scope: aktueller `main` nach Multi-Tenant-Umstellung, inkl. DB-Migrationen, RLS, Auth, API, Integrationen, UI-Hotspots.

## Executive Summary

Das Projekt ist funktional weit entwickelt und produktnah, hat aber noch mehrere harte Risiken in der Mandantenfähigkeit und Betriebsstabilität.  
Die größte Stärke ist die breite Feature-Tiefe (Planung, Notfall, KI-Agenten, Benachrichtigungen, Integrationen) bei bereits gutem UI-Niveau.  
Das größte Risiko ist aktuell nicht fehlende Funktionalität, sondern inkonsistente Tenant-Isolation und Settings-/Insert-Pfade, die unter Last oder in Mehrmandantenbetrieb brechen können.  
Technisch ist das Produkt für Pilotkunden nutzbar, für skalierte SaaS-Rollouts aber noch nicht „hart“ genug.  
Mit einem fokussierten 2-4 Wochen Stabilitätsprogramm ist ein deutlich robusteres Verkaufsniveau erreichbar.

---

## Scorecard (0-10)

| Kategorie | Score | Kurzbegründung |
|---|---:|---|
| Produktreife | 7.5 | Breiter Funktionsumfang, viele reale Flows vorhanden |
| Code-Qualität | 6.8 | Gute Basis, aber mehrere sehr große Komponenten + inkonsistente Patterns |
| Sicherheit | 6.2 | RLS verbessert, aber noch relevante Tenant-/AuthZ-Lücken |
| UX / Design | 8.0 | Modernes Designsystem, gute Interaktionsqualität |
| Performance | 6.5 | Mehrere N+1/serielle Hotspots in kritischen Flows |
| Fehlerbehandlung | 6.7 | Besser als früher, aber teilweise „best effort“ ohne klares User-Feedback |
| Skalierbarkeit | 6.0 | Architektur tragfähig, aber Multi-Tenant-Härtung noch unvollständig |
| Betriebsstabilität | 6.3 | Build grün, aber einige Datenpfade sind noch fragil |
| Markt-/Verkaufsbereitschaft | 7.0 | Für frühe Kunden gut, Enterprise-Sicherheit noch ausbaufähig |
| Gesamt | **6.9** | Starkes Produkt mit klarem Potential, braucht jetzt Hardening statt Feature-Expansion |

---

## Kritische Findings (P0)

### P0-1: Invite-Flow erlaubt Rolleneskalation
- **Wo:** `src/app/api/org/invite/route.ts`
- **Problem:** Kein harter Rollencheck für „wer darf einladen“, `role` wird aus Request übernommen.
- **Risiko:** Nutzer können Einladungen mit zu hoher Rolle erzeugen (`admin`/Leitung).
- **Fix:** `requireAdmin`/`is_org_admin` erzwingen, serverseitige Role-Allowlist, kein Rückgabe-Token im Response.

### P0-2: Tenant-Isolation über alle Tabellen noch nicht konsistent
- **Wo:** u.a.  
  - `supabase/migrations/20260331180002_rls_phase2_hardening.sql`  
  - `supabase/migrations/20260430153000_assignment_subcontractors_pivot.sql`  
  - `supabase/migrations/20260327200000_employee_departments.sql`
- **Problem:** Mehrere Policies historisch mit `USING (true)`/ohne `organization_id`-Bindung.
- **Risiko:** Cross-Tenant-Lesen/Schreiben in Randtabellen möglich.
- **Fix:** Alle relevanten Tabellen auf `organization_id = public.get_my_org_id()` oder Join-basierte Org-Policy migrieren.

### P0-3: Settings-Modell ist tenant-seitig inkonsistent
- **Wo:**  
  - `supabase/migrations/20260331120000_settings.sql`  
  - `src/lib/hooks/useSettings.ts`  
  - `src/components/ki/KiAutomatisierungen.tsx`  
  - `src/app/api/org/gruenden/route.ts`
- **Problem:** Historisch `key UNIQUE` kollidiert logisch mit Multi-Tenant-`organization_id`.
- **Risiko:** Falsche Settings-Zuordnung, Upsert-Konflikte, Onboarding-Edgecases.
- **Fix:** Unique auf `(organization_id, key)` und alle Read/Write-Pfade tenant-bewusst umstellen.

### P0-4: Assignment-Erstellung kann unter Tenant-Härtung brechen
- **Wo:**  
  - `supabase/migrations/20260501104000_org_not_null.sql`  
  - `src/components/kalender/EinsatzNeuDialog.tsx`  
  - `src/components/kalender/PlanungsKalender.tsx`  
  - `src/app/api/ki-actions/route.ts`
- **Problem:** `organization_id` ist NOT NULL, aber nicht alle Insert-Pfade setzen das Feld explizit.
- **Risiko:** Produktionsfehler bei Einsatzanlage/-änderung.
- **Fix:** zentraler Insert-Helper/DB-Trigger, der `organization_id` verlässlich setzt.

---

## Mittlere Findings (P1)

### P1-1: Open Redirect Risiko im Auth-Callback
- **Wo:** `src/app/auth/callback/route.ts`
- **Fix:** `weiter` strikt auf interne relative Pfade validieren.

### P1-2: Hochprivilegierte Endpunkte nur mit Login geschützt
- **Wo:**  
  - `src/app/api/email/senden/route.ts`  
  - `src/app/api/notifications/koordinatoren/route.ts`  
  - `src/app/api/integrationen/test/route.ts`
- **Fix:** zusätzliche Rollen-/Org-Checks, Rate-Limits, Audit-Logs.

### P1-3: Integrationsrouten teilweise Placeholder
- **Wo:** `src/app/api/outlook/*`, `src/app/api/subcontractors/*`, `src/app/api/personio/sync/route.ts`
- **Fix:** einheitlicher „not implemented“-Contract + UI-Feature-Flags.

### P1-4: Fehlerbehandlung oft „fire-and-forget“
- **Wo:** u.a. `src/components/kalender/EinsatzNeuDialog.tsx`, `src/components/kalender/PlanungsKalender.tsx`, `src/lib/automatisierungen.ts`
- **Fix:** partiellen Fehlerzustand sichtbar machen (z.B. Einsatz erstellt, Mail fehlgeschlagen).

---

## Kleine Findings (P2)

- Sehr große Komponenten erschweren Wartung:  
  `src/components/abwesenheiten/AbwesenheitenVerwaltung.tsx`,  
  `src/components/mitarbeiter/MitarbeiterVerwaltung.tsx`,  
  `src/components/kalender/PlanungsKalender.tsx`,  
  `src/components/dienstleister/DienstleisterVerwaltung.tsx`.
- Testabdeckung praktisch nicht vorhanden (`package.json` ohne echte Testpipelines).
- Performance-Hotspots in seriellen Loops und mehrfachen DB-Roundtrips.

---

## Performance-/Skalierungs-Hotspots

- `src/components/kalender/EinsatzNeuDialog.tsx`: viele serielle Konfliktchecks/Insert-Pfade.
- `src/app/api/cron/weather-check/route.ts`: sequentielle Verarbeitung + Folgequeries.
- `src/lib/data/dashboard.ts`: query-lastige Aggregation und teils O(n²)-Konfliktlogik.

Empfehlung: Batchen, Parallelisierung mit Concurrency-Limits, voraggregierte Views/Caching.

---

## Priorisierte Fix-Roadmap

### Woche 1 (Blocker)
1. Invite-Härtung + Role-Allowlist (`org/invite`).
2. Settings-Unique auf `(organization_id,key)` + alle Settings-Pfade migrieren.
3. Assignment-Insert-Absicherung (`organization_id` garantiert setzen).
4. Open-Redirect schließen.

### Woche 2
1. RLS-Lücken in restlichen Tabellen schließen (`teams`, `team_members`, `employee_departments`, `assignment_subcontractors`, `notifications`, etc.).
2. Rollenbasierte AuthZ für Mail/Integrations-Endpunkte.
3. Fehler-UX für „teilweise erfolgreich“.

### Woche 3-4
1. Große Komponenten in Domain-Module aufteilen.
2. Performance-Hotspots refactoren (Batching/Caching).
3. Mindest-Testset für kritische Flows (Onboarding, Einsatz, Abwesenheit, Notfall, Invite/Join).

---

## Fazit

Das System ist inhaltlich stark und hat echte Produktsubstanz.  
Die nächsten größten Hebel sind Sicherheit/Isolation und Robustheit der Kernpfade, nicht neue Features.  
Wenn die P0/P1-Punkte konsequent geschlossen werden, steigt die reale Produktions- und Vertriebsreife deutlich.

