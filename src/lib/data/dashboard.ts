import { createClient } from "@/lib/supabase/server";
import {
  darfMitarbeiterVerwalten,
  ladeAngestelltenProfil,
} from "@/lib/auth/angestellter";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import { de } from "date-fns/locale";

export type NaechsterEinsatz = {
  id: string;
  mitarbeiter: string;
  projekt: string;
  start: string;
  ende: string;
  status: string;
};

export type BalkenAbteilung = {
  name: string;
  color: string;
  einsaetze: number;
};

export type TagAuslastung = {
  tag: string;
  label: string;
  einsaetze: number;
};

export type DashboardDaten = {
  einsaetzeHeute: number;
  einsaetzeGestern: number;
  mitarbeiterVerfuegbar: number;
  mitarbeiterGesternVerfuegbar: number;
  offeneKonflikte: number;
  abwesendHeute: number;
  wetterWarnungen: number;
  balkenAbteilungen: BalkenAbteilung[];
  naechsteEinsaetze: NaechsterEinsatz[];
  auslastung7Tage: TagAuslastung[];
  darfMitarbeiterEinladen: boolean;
};

function zeitZuMinuten(t: string): number {
  const [h, m, s] = t.split(":").map((x) => parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0) + (s ?? 0) / 60;
}

function einsaetzeUeberlappen(
  a: { start_time: string; end_time: string },
  b: { start_time: string; end_time: string }
): boolean {
  return (
    zeitZuMinuten(a.start_time) < zeitZuMinuten(b.end_time) &&
    zeitZuMinuten(a.end_time) > zeitZuMinuten(b.start_time)
  );
}

/**
 * Lädt Dashboard-Kennzahlen und Serien für Charts (Server).
 */
export async function ladeDashboardDaten(): Promise<DashboardDaten> {
  const leer: DashboardDaten = {
    einsaetzeHeute: 0,
    einsaetzeGestern: 0,
    mitarbeiterVerfuegbar: 0,
    mitarbeiterGesternVerfuegbar: 0,
    offeneKonflikte: 0,
    abwesendHeute: 0,
    wetterWarnungen: 0,
    balkenAbteilungen: [],
    naechsteEinsaetze: [],
    auslastung7Tage: [],
    darfMitarbeiterEinladen: false,
  };

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return leer;
  }

  try {
    const supabase = await createClient();
    const heute = new Date();
    const heuteStr = format(heute, "yyyy-MM-dd");
    const gesternStr = format(subDays(heute, 1), "yyyy-MM-dd");
    const wStart = startOfWeek(heute, { weekStartsOn: 1 });
    const wEnd = endOfWeek(heute, { weekStartsOn: 1 });
    const wStartStr = format(wStart, "yyyy-MM-dd");
    const wEndStr = format(wEnd, "yyyy-MM-dd");

    const [
      { count: ecHeute },
      { count: ecGestern },
      { data: zuAlle },
      { data: deps },
      { data: employees },
      { data: abwHeute },
      { data: abwGestern },
      { count: wc },
      { data: zuWoche },
      { data: zuHeuteListe },
    ] = await Promise.all([
      supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("date", heuteStr),
      supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("date", gesternStr),
      supabase
        .from("assignments")
        .select("employee_id,date,start_time,end_time"),
      supabase.from("departments").select("id,name,color"),
      supabase.from("employees").select("id,department_id,active"),
      supabase
        .from("absences")
        .select("employee_id")
        .lte("start_date", heuteStr)
        .gte("end_date", heuteStr),
      supabase
        .from("absences")
        .select("employee_id")
        .lte("start_date", gesternStr)
        .gte("end_date", gesternStr),
      supabase
        .from("weather_alerts")
        .select("id", { count: "exact", head: true })
        .eq("acknowledged", false),
      supabase
        .from("assignments")
        .select("employee_id,date")
        .gte("date", wStartStr)
        .lte("date", wEndStr),
      supabase
        .from("assignments")
        .select(
          "id,start_time,end_time,status,project_title, employees(name), projects(title)"
        )
        .eq("date", heuteStr)
        .order("start_time")
        .limit(12),
    ]);

    const profil = await ladeAngestelltenProfil();

    let konflikte = 0;
    const zu = zuAlle ?? [];
    if (zu.length > 1) {
      const gruppen = new Map<string, typeof zu>();
      for (const z of zu) {
        const k = `${z.employee_id}|${z.date}`;
        if (!gruppen.has(k)) gruppen.set(k, []);
        gruppen.get(k)!.push(z);
      }
      gruppen.forEach((liste) => {
        if (liste.length < 2) return;
        for (let i = 0; i < liste.length; i++) {
          for (let j = i + 1; j < liste.length; j++) {
            if (einsaetzeUeberlappen(liste[i]!, liste[j]!)) konflikte++;
          }
        }
      });
    }

    const actives = (employees ?? []).filter((e) => e.active);
    const totalAktiv = actives.length;
    const absentHeute = new Set(
      (abwHeute ?? []).map((a) => a.employee_id as string)
    );
    const absentGestern = new Set(
      (abwGestern ?? []).map((a) => a.employee_id as string)
    );

    const empDep = Object.fromEntries(
      (employees ?? []).map((e) => [
        e.id,
        e.department_id as string | null,
      ])
    );

    const countsByDep = new Map<string, number>();
    for (const d of deps ?? []) {
      countsByDep.set(d.id as string, 0);
    }
    for (const row of zuWoche ?? []) {
      const depId = empDep[row.employee_id as string];
      if (depId && countsByDep.has(depId)) {
        countsByDep.set(depId, (countsByDep.get(depId) ?? 0) + 1);
      }
    }

    const balkenAbteilungen: BalkenAbteilung[] = (deps ?? []).map((d) => ({
      name: d.name as string,
      color: (d.color as string) || "#6366f1",
      einsaetze: countsByDep.get(d.id as string) ?? 0,
    }));

    const auslastung7Tage: TagAuslastung[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(heute, i);
      const ds = format(d, "yyyy-MM-dd");
      const count = (zu ?? []).filter((r) => r.date === ds).length;
      auslastung7Tage.push({
        tag: ds,
        label: format(d, "EEE", { locale: de }),
        einsaetze: count,
      });
    }

    const naechsteEinsaetze: NaechsterEinsatz[] = (zuHeuteListe ?? []).map(
      (row: Record<string, unknown>) => {
        const empRaw = row.employees as
          | { name?: string }
          | { name?: string }[]
          | null;
        const prRaw = row.projects as
          | { title?: string }
          | { title?: string }[]
          | null;
        const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw;
        const pr = Array.isArray(prRaw) ? prRaw[0] : prRaw;
        const ft = row.project_title as string | null | undefined;
        return {
          id: String(row.id),
          mitarbeiter: String(emp?.name ?? "—"),
          projekt: String(pr?.title ?? ft?.trim() ?? "Ohne Projekt"),
          start: String(row.start_time ?? "").slice(0, 5),
          ende: String(row.end_time ?? "").slice(0, 5),
          status: String(row.status ?? "geplant"),
        };
      }
    );

    const darf = darfMitarbeiterVerwalten(profil?.role);

    return {
      einsaetzeHeute: ecHeute ?? 0,
      einsaetzeGestern: ecGestern ?? 0,
      mitarbeiterVerfuegbar: Math.max(0, totalAktiv - absentHeute.size),
      mitarbeiterGesternVerfuegbar: Math.max(
        0,
        totalAktiv - absentGestern.size
      ),
      offeneKonflikte: konflikte,
      abwesendHeute: abwHeute?.length ?? 0,
      wetterWarnungen: wc ?? 0,
      balkenAbteilungen,
      naechsteEinsaetze,
      auslastung7Tage,
      darfMitarbeiterEinladen: Boolean(darf),
    };
  } catch {
    return leer;
  }
}
