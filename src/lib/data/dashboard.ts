import { createClient } from "@/lib/supabase/server";
import {
  darfMitarbeiterVerwalten,
  istAdmin,
  ladeAngestelltenProfil,
  type AngestellterProfil,
} from "@/lib/auth/angestellter";
import { format, startOfWeek, endOfWeek, subDays, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const ZEITZONE_APP = "Europe/Berlin";

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
  /** z. B. „Nur Abteilung: Montage“ — null für globale Admin-Sicht */
  kontextLabel: string | null;
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

type ScopeErgebnis = {
  mitarbeiterIds: string[] | null;
  kontextLabel: string | null;
};

/**
 * null mitarbeiterIds = keine Einschränkung (Admin).
 * [] = kein sichtbarer Mitarbeiterkreis (leere Kennzahlen).
 */
async function ermittleScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profil: AngestellterProfil | null
): Promise<ScopeErgebnis> {
  if (!profil) {
    return { mitarbeiterIds: null, kontextLabel: null };
  }
  if (istAdmin(profil.role)) {
    return { mitarbeiterIds: null, kontextLabel: null };
  }

  if (profil.role === "monteur") {
    return {
      mitarbeiterIds: [profil.id],
      kontextLabel: "Nur deine eigenen Einsätze",
    };
  }

  if (profil.role === "abteilungsleiter") {
    if (!profil.department_id) {
      return {
        mitarbeiterIds: [],
        kontextLabel:
          "Keiner Abteilung zugewiesen — bitte Profil/Abteilung setzen",
      };
    }
    const [{ data: deptRow }, { data: rows }] = await Promise.all([
      supabase
        .from("departments")
        .select("name")
        .eq("id", profil.department_id)
        .maybeSingle(),
      supabase
        .from("employees")
        .select("id")
        .eq("department_id", profil.department_id)
        .eq("active", true),
    ]);
    const ids = (rows ?? []).map((e) => e.id as string);
    const dname = (deptRow?.name as string) ?? "Abteilung";
    return {
      mitarbeiterIds: ids,
      kontextLabel: `Nur Abteilung: ${dname}`,
    };
  }

  if (profil.role === "teamleiter") {
    const ids = new Set<string>();
    const teamIdSet = new Set<string>();
    if (profil.team_id) teamIdSet.add(profil.team_id);
    const { data: ledTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("leader_id", profil.id);
    for (const t of ledTeams ?? []) teamIdSet.add(t.id as string);

    if (teamIdSet.size > 0) {
      const tids = Array.from(teamIdSet);
      const [{ data: tm }, { data: empsTeam }] = await Promise.all([
        supabase.from("team_members").select("employee_id").in("team_id", tids),
        supabase
          .from("employees")
          .select("id")
          .in("team_id", tids)
          .eq("active", true),
      ]);
      for (const row of tm ?? []) ids.add(row.employee_id as string);
      for (const e of empsTeam ?? []) ids.add(e.id as string);
    }

    ids.add(profil.id);

    if (ids.size <= 1 && profil.department_id) {
      const { data: deptEmps } = await supabase
        .from("employees")
        .select("id")
        .eq("department_id", profil.department_id)
        .eq("active", true);
      for (const e of deptEmps ?? []) ids.add(e.id as string);
    }

    let teamLabel = "Team";
    if (teamIdSet.size === 1) {
      const tid = Array.from(teamIdSet)[0]!;
      const { data: tn } = await supabase
        .from("teams")
        .select("name")
        .eq("id", tid)
        .maybeSingle();
      if (tn?.name) teamLabel = String(tn.name);
    } else if (teamIdSet.size > 1) {
      teamLabel = `${teamIdSet.size} Teams`;
    }

    return {
      mitarbeiterIds: Array.from(ids),
      kontextLabel:
        teamIdSet.size > 0
          ? `Nur Team(s): ${teamLabel}`
          : profil.department_id
            ? "Nur deine Abteilung (Team nicht verknüpft)"
            : "Nur zugewiesene Team-Bereiche",
    };
  }

  return { mitarbeiterIds: null, kontextLabel: null };
}

/**
 * Lädt Dashboard-Kennzahlen und Serien für Charts (Server).
 * Nicht-Admin: eingeschränkt auf Abteilung, Team oder eigenen Mitarbeiter je nach Rolle.
 * „Heute“ / Kalenderwoche: Europe/Berlin.
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
    kontextLabel: null,
  };

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return leer;
  }

  try {
    const supabase = await createClient();
    const profil = await ladeAngestelltenProfil();
    const scope = await ermittleScope(supabase, profil);
    const filterIds = scope.mitarbeiterIds;

    const jetzt = new Date();
    const heuteStr = formatInTimeZone(jetzt, ZEITZONE_APP, "yyyy-MM-dd");
    const gesternStr = format(subDays(parseISO(heuteStr), 1), "yyyy-MM-dd");
    const berlinRef = toZonedTime(jetzt, ZEITZONE_APP);
    const wStart = startOfWeek(berlinRef, { weekStartsOn: 1 });
    const wEnd = endOfWeek(berlinRef, { weekStartsOn: 1 });
    const wStartStr = format(wStart, "yyyy-MM-dd");
    const wEndStr = format(wEnd, "yyyy-MM-dd");

    const darf = darfMitarbeiterVerwalten(profil?.role);

    if (filterIds && filterIds.length === 0) {
      return {
        ...leer,
        kontextLabel: scope.kontextLabel,
        darfMitarbeiterEinladen: Boolean(darf),
      };
    }

    let qEcHeute = supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("date", heuteStr);
    let qEcGestern = supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("date", gesternStr);
    let qZuAlle = supabase
      .from("assignments")
      .select("employee_id,date,start_time,end_time");
    let qEmp = supabase.from("employees").select("id,department_id,active");
    let qAbwHeute = supabase
      .from("absences")
      .select("employee_id")
      .lte("start_date", heuteStr)
      .gte("end_date", heuteStr);
    let qAbwGestern = supabase
      .from("absences")
      .select("employee_id")
      .lte("start_date", gesternStr)
      .gte("end_date", gesternStr);
    let qZuWoche = supabase
      .from("assignments")
      .select("employee_id,date")
      .gte("date", wStartStr)
      .lte("date", wEndStr);
    let qZuHeuteListe = supabase
      .from("assignments")
      .select(
        "id,start_time,end_time,status,project_title, employees!employee_id(name), projects(title)"
      )
      .eq("date", heuteStr)
      .order("start_time")
      .limit(12);

    if (filterIds) {
      qEcHeute = qEcHeute.in("employee_id", filterIds);
      qEcGestern = qEcGestern.in("employee_id", filterIds);
      qZuAlle = qZuAlle.in("employee_id", filterIds);
      qEmp = qEmp.in("id", filterIds);
      qAbwHeute = qAbwHeute.in("employee_id", filterIds);
      qAbwGestern = qAbwGestern.in("employee_id", filterIds);
      qZuWoche = qZuWoche.in("employee_id", filterIds);
      qZuHeuteListe = qZuHeuteListe.in("employee_id", filterIds);
    }

    const [
      { count: ecHeute },
      { count: ecGestern },
      { data: zuAlleRaw },
      { data: employees },
      { data: abwHeute },
      { data: abwGestern },
      { count: wc },
      { data: zuWoche },
      { data: zuHeuteListe },
    ] = await Promise.all([
      qEcHeute,
      qEcGestern,
      qZuAlle,
      qEmp,
      qAbwHeute,
      qAbwGestern,
      supabase
        .from("weather_alerts")
        .select("id", { count: "exact", head: true })
        .eq("acknowledged", false),
      qZuWoche,
      qZuHeuteListe,
    ]);

    const zu = zuAlleRaw ?? [];
    let konflikte = 0;
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

    const deptIdsSichtbar = new Set(
      actives
        .map((e) => e.department_id as string | null)
        .filter((x): x is string => Boolean(x))
    );

    const { data: depsRaw } = await supabase
      .from("departments")
      .select("id,name,color")
      .order("name");

    const deps =
      filterIds && deptIdsSichtbar.size > 0
        ? (depsRaw ?? []).filter((d) => deptIdsSichtbar.has(d.id as string))
        : (depsRaw ?? []);

    const empDep = Object.fromEntries(
      (employees ?? []).map((e) => [
        e.id,
        e.department_id as string | null,
      ])
    );

    const countsByDep = new Map<string, number>();
    for (const d of deps) {
      countsByDep.set(d.id as string, 0);
    }
    for (const row of zuWoche ?? []) {
      const depId = empDep[row.employee_id as string];
      if (depId && countsByDep.has(depId)) {
        countsByDep.set(depId, (countsByDep.get(depId) ?? 0) + 1);
      }
    }

    const balkenAbteilungen: BalkenAbteilung[] = deps.map((d) => ({
      name: d.name as string,
      color: (d.color as string) || "#6366f1",
      einsaetze: countsByDep.get(d.id as string) ?? 0,
    }));

    const auslastung7Tage: TagAuslastung[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(parseISO(heuteStr), i);
      const ds = format(d, "yyyy-MM-dd");
      const count = zu.filter((r) => r.date === ds).length;
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

    const abwesendHeuteAnzahl = absentHeute.size;

    return {
      einsaetzeHeute: ecHeute ?? 0,
      einsaetzeGestern: ecGestern ?? 0,
      mitarbeiterVerfuegbar: Math.max(0, totalAktiv - absentHeute.size),
      mitarbeiterGesternVerfuegbar: Math.max(
        0,
        totalAktiv - absentGestern.size
      ),
      offeneKonflikte: konflikte,
      abwesendHeute: abwesendHeuteAnzahl,
      wetterWarnungen: wc ?? 0,
      balkenAbteilungen,
      naechsteEinsaetze,
      auslastung7Tage,
      darfMitarbeiterEinladen: Boolean(darf),
      kontextLabel: scope.kontextLabel,
    };
  } catch {
    return leer;
  }
}
