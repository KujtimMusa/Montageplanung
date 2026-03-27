-- Monteurplanung: Kernschema (Bauplan V2)
-- Erweiterungen für Überlappungs-Constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- KERN-TABELLEN
-- ============================================

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  whatsapp text,
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'monteur',
  ms365_user_id text,
  active boolean NOT NULL DEFAULT true,
  auth_user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text NOT NULL,
  city text,
  postal_code text,
  lat numeric,
  lng numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- PROJEKT & PLANUNG
-- ============================================

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'neu',
  priority text NOT NULL DEFAULT 'normal',
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  departments_involved text[],
  weather_sensitive boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  role text,
  status text NOT NULL DEFAULT 'geplant',
  outlook_event_id text,
  teams_message_id text,
  notes text,
  created_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assignments_zeit_logik CHECK (end_time > start_time),
  CONSTRAINT assignments_keine_ueberlappung EXCLUDE USING gist (
    employee_id WITH =,
    tsrange(
      (date + start_time)::timestamp,
      (date + end_time)::timestamp,
      '[)'
    ) WITH &&
  )
);

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  leader_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, employee_id)
);

-- ============================================
-- ABWESENHEITEN & NOTFALL
-- ============================================

CREATE TABLE public.absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'beantragt',
  approved_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  notes text,
  is_emergency boolean NOT NULL DEFAULT false,
  reported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emergency_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  absence_id uuid REFERENCES public.absences (id) ON DELETE SET NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  affected_assignments uuid[],
  agent_suggestion jsonb,
  resolution text,
  resolved_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  resolved_at timestamptz
);

-- ============================================
-- DIENSTLEISTER
-- ============================================

CREATE TABLE public.subcontractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  whatsapp_number text,
  specialization text[],
  max_concurrent_projects int NOT NULL DEFAULT 2,
  lead_time_days int NOT NULL DEFAULT 3,
  rating int,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id uuid NOT NULL REFERENCES public.subcontractors (id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  trigger_value text NOT NULL,
  auto_book boolean NOT NULL DEFAULT true,
  notify_via text NOT NULL DEFAULT 'whatsapp',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.subcontractor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id uuid NOT NULL REFERENCES public.subcontractors (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  date_start date NOT NULL,
  date_end date NOT NULL,
  status text NOT NULL DEFAULT 'ausstehend',
  confirmation_token uuid NOT NULL DEFAULT gen_random_uuid(),
  notified_at timestamptz,
  confirmed_at timestamptz,
  reminder_sent_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- WETTER
-- ============================================

CREATE TABLE public.weather_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  alert_date date NOT NULL,
  condition text NOT NULL,
  severity text NOT NULL,
  forecast_data jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- KOMMUNIKATION & SYSTEM
-- ============================================

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  trigger_event text NOT NULL,
  input_data jsonb,
  output_data jsonb,
  actions_taken text[],
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES (Bauplan Phase 8 + sinnvolle Ergänzungen)
-- ============================================

CREATE INDEX idx_assignments_mitarbeiter_datum ON public.assignments (employee_id, date);
CREATE INDEX idx_assignments_projekt ON public.assignments (project_id);
CREATE INDEX idx_absences_mitarbeiter ON public.absences (employee_id, status);
CREATE INDEX idx_projects_status_start ON public.projects (status, planned_start);
CREATE INDEX idx_notifications_mitarbeiter_gelesen ON public.notifications (employee_id, read);
CREATE INDEX idx_employees_abteilung ON public.employees (department_id) WHERE active = true;
