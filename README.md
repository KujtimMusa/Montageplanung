# Monteurplanung

Next.js 14 App für Montageplanung (Supabase, shadcn/ui, FullCalendar, Gemini).

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local
# Werte aus Supabase (Frankfurt) und ggf. GEMINI_API_KEY eintragen
npm run dev
```

## Datenbank

- Migrationen liegen unter `supabase/migrations/`.
- Nach dem ersten `push` oder SQL-Run: **Erster Admin** — der registrierte Nutzer ist standardmäßig `monteur`. Mindestens einen Account manuell in den Admin hochziehen:

```sql
UPDATE public.employees
SET role = 'admin'
WHERE email = 'deine@email.de';
```

## Erster Mitarbeiter-Eintrag

Bei Registrierung legt ein Trigger `auth.users` → `public.employees` automatisch eine Zeile mit Rolle `monteur` an (siehe Migration `20260327120000_auth_employee_trigger.sql`).

## Lizenz-Hinweis

FullCalendar Resource-Timeline nutzt die GPL-Option (`schedulerLicenseKey` in `PlanungsKalender.tsx`). Für kommerzielle Nutzung prüfe die [FullCalendar-Lizenz](https://fullcalendar.io/license).
