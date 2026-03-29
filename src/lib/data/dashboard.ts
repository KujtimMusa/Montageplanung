import { createClient } from "@/lib/supabase/server";
import {
  darfMitarbeiterVerwalten,
  istAdmin,
  ladeAngestelltenProfil,
  type AngestellterProfil,
} from "@/lib/auth/angestellter";
import {
  eachDayOfInterval,
  format,
  startOfWeek,
  endOfWeek,
  subDays,
  parseISO,
} from "date-fns";
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
  teamName: string | null;
  teamFarbe: string | null;
  projektFarbe: string | null;
  projektAdresse: string | null;
  projektStatus: string | null;
  teamMitglieder: { id: string; name: string }[];
};

export type WochenTeamInfo = {
  id: string;
  name: string;
  farbe: string;
};

export type WochenChartZeile = {
  tag: string;
  datum: string;
} & Record<string, number | string>;

export type MitarbeiterHeuteZeile = {
  id: string;
  name: string;
  farbe: string;
  typ: "koordinator" | "mitarbeiter";
  istImEinsatz: boolean;
  untertitel: string;
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
  wochenChart: WochenChartZeile[];
  wochenTeams: WochenTeamInfo[];
  naechsteEinsaetze: NaechsterEinsatz[];
  auslastung7Tage: TagAuslastung[];
  darfMitarbeiterEinladen: boolean;
  mitarbeiterHeute: MitarbeiterHeuteZeile[];
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
    return { mitarbeiterIds: null };
  }
  if (istAdmin(profil.role)) {
    return { mitarbeiterIds: null };
  }

  if (profil.role === "monteur") {
    return {
      mitarbeiterIds: [profil.id],
    };
  }

  if (profil.role === "abteilungsleiter") {
    if (!profil.department_id) {
      return {
        mitarbeiterIds: [],
      };
    }
    const { data: rows } = await supabase
      .from("employees")
      .select("id")
      .eq("department_id", profil.department_id)
      .eq("active", true);
    const ids = (rows ?? []).map((e) => e.id as string);
    return {
      mitarbeiterIds: ids,
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

    return {
      mitarbeiterIds: Array.from(ids),
    };
  }

  return { mitarbeiterIds: null };
}

/** null = alle Teams; [] = keine sichtbaren Teams */
async function ermittleTeamIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profil: AngestellterProfil | null
): Promise<string[] | null> {
  if (!profil) return null;
  if (istAdmin(profil.role)) return null;

  if (profil.role === "monteur") {
    return profil.team_id ? [profil.team_id] : [];
  }

  if (profil.role === "abteilungsleiter") {
    if (!profil.department_id) return [];
    const { data } = await supabase
      .from("teams")
      .select("id")
      .eq("department_id", profil.department_id);
    return (data ?? []).map((t) => t.id as string);
  }

  if (profil.role === "teamleiter") {
    const ids = new Set<string>();
    if (profil.team_id) ids.add(profil.team_id);
    const { data: ledTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("leader_id", profil.id);
    for (const t of ledTeams ?? []) ids.add(t.id as string);

    if (ids.size === 0 && profil.department_id) {
      const { data: deptTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("department_id", profil.department_id);
      for (const t of deptTeams ?? []) ids.add(t.id as string);
    }

    return Array.from(ids);
  }

  return null;
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
    wochenChart: [],
    wochenTeams: [],
    naechsteEinsaetze: [],
    auslastung7Tage: [],
    darfMitarbeiterEinladen: false,
    mitarbeiterHeute: [],
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
    const teamIdsScope = await ermittleTeamIds(supabase, profil);

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
    let qZuHeuteListe = supabase
      .from("assignments")
      .select(
        `id,start_time,end_time,status,project_title,team_id,
         employees!employee_id(name),
         teams(name,farbe),
         projects(title,status,farbe,adresse)`
      )
      .eq("date", heuteStr)
      .order("start_time")
      .limit(12);

    let qWocheMitTeams = supabase
      .from("assignments")
      .select("id, date, team_id, teams(id, name, farbe)")
      .gte("date", wStartStr)
      .lte("date", wEndStr)
      .not("team_id", "is", null);

    let qHeuteAssignmentsMitarbeiter = supabase
      .from("assignments")
      .select(
        "employee_id, start_time, end_time, projects(title)"
      )
      .eq("date", heuteStr)
      .order("start_time");

    let qTeamsListe = supabase.from("teams").select("id,name,farbe").order("name");

    let qMitarbeiterKarten = supabase
      .from("employees")
      .select("id, name, auth_user_id, team_id, teams(farbe)")
      .eq("active", true)
      .order("name");

    if (filterIds) {
      qEcHeute = qEcHeute.in("employee_id", filterIds);
      qEcGestern = qEcGestern.in("employee_id", filterIds);
      qZuAlle = qZuAlle.in("employee_id", filterIds);
      qEmp = qEmp.in("id", filterIds);
      qAbwHeute = qAbwHeute.in("employee_id", filterIds);
      qAbwGestern = qAbwGestern.in("employee_id", filterIds);
      qZuHeuteListe = qZuHeuteListe.in("employee_id", filterIds);
      qWocheMitTeams = qWocheMitTeams.in("employee_id", filterIds);
      qHeuteAssignmentsMitarbeiter = qHeuteAssignmentsMitarbeiter.in(
        "employee_id",
        filterIds
      );
      qMitarbeiterKarten = qMitarbeiterKarten.in("id", filterIds);
    }

    if (teamIdsScope !== null && teamIdsScope.length > 0) {
      qTeamsListe = qTeamsListe.in("id", teamIdsScope);
      qWocheMitTeams = qWocheMitTeams.in("team_id", teamIdsScope);
    }

    const leerPromise = Promise.resolve({
      data: [] as Record<string, unknown>[],
    });
    const qTeamsAusfuehren =
      teamIdsScope !== null && teamIdsScope.length === 0
        ? leerPromise
        : qTeamsListe;
    const qWocheAusfuehren =
      teamIdsScope !== null && teamIdsScope.length === 0
        ? leerPromise
        : qWocheMitTeams;
    const qHeuteMaAusfuehren =
      teamIdsScope !== null && teamIdsScope.length === 0
        ? leerPromise
        : qHeuteAssignmentsMitarbeiter;

    const [
      { count: ecHeute },
      { count: ecGestern },
      { data: zuAlleRaw },
      { data: employees },
      { data: abwHeute },
      { data: abwGestern },
      { count: wc },
      { data: zuHeuteListe },
      { data: wocheMitTeamsRaw },
      { data: teamsListeRaw },
      { data: heuteAssignmentsMaRaw },
      { data: mitarbeiterKartenRaw },
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
      qZuHeuteListe,
      qWocheAusfuehren,
      qTeamsAusfuehren,
      qHeuteMaAusfuehren,
      qMitarbeiterKarten,
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

    const teamMetaAusZeilen = new Map<string, WochenTeamInfo>();
    for (const tr of teamsListeRaw ?? []) {
      const t = tr as Record<string, unknown>;
      const id = String(t.id ?? "");
      if (!id) continue;
      teamMetaAusZeilen.set(id, {
        id,
        name: String(t.name ?? "Team"),
        farbe: String(t.farbe ?? "#3b82f6"),
      });
    }
    for (const raw of wocheMitTeamsRaw ?? []) {
      const r = raw as Record<string, unknown>;
      const tm = r.teams as
        | { id?: string; name?: string; farbe?: string }
        | { id?: string; name?: string; farbe?: string }[]
        | null;
      const t = Array.isArray(tm) ? tm[0] : tm;
      const tid = (r.team_id as string) ?? t?.id;
      if (tid && t?.name && !teamMetaAusZeilen.has(tid)) {
        teamMetaAusZeilen.set(tid, {
          id: tid,
          name: String(t.name),
          farbe: String(t.farbe ?? "#3b82f6"),
        });
      }
    }
    const wochenTeams = Array.from(teamMetaAusZeilen.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    );

    const wochentagKurz = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
    const tageInterval = eachDayOfInterval({
      start: parseISO(wStartStr),
      end: parseISO(wEndStr),
    });
    const zaehlProTagTeam = new Map<string, Map<string, number>>();
    for (const raw of wocheMitTeamsRaw ?? []) {
      const r = raw as Record<string, unknown>;
      const d = String(r.date ?? "");
      const tid = r.team_id as string | undefined;
      if (!d || !tid) continue;
      if (!zaehlProTagTeam.has(d)) zaehlProTagTeam.set(d, new Map());
      const m = zaehlProTagTeam.get(d)!;
      m.set(tid, (m.get(tid) ?? 0) + 1);
    }
    const wochenChart: WochenChartZeile[] = tageInterval.map((day, i) => {
      const datum = format(day, "yyyy-MM-dd");
      const row: WochenChartZeile = {
        tag: wochentagKurz[i] ?? format(day, "EEE", { locale: de }),
        datum,
      };
      const proTeam = zaehlProTagTeam.get(datum);
      for (const t of wochenTeams) {
        row[t.id] = proTeam?.get(t.id) ?? 0;
      }
      return row;
    });

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

    const teamIdsHeute = new Set<string>();
    for (const row of zuHeuteListe ?? []) {
      const tid = (row as { team_id?: string | null }).team_id;
      if (tid) teamIdsHeute.add(tid);
    }
    const mitgliederByTeam = new Map<string, { id: string; name: string }[]>();
    if (teamIdsHeute.size > 0) {
      const { data: tmMitglieder } = await supabase
        .from("team_members")
        .select("team_id, employees(id, name, active)")
        .in("team_id", Array.from(teamIdsHeute));
      for (const tr of tmMitglieder ?? []) {
        const r = tr as Record<string, unknown>;
        const er = r.employees as
          | { id?: string; name?: string; active?: boolean }
          | { id?: string; name?: string; active?: boolean }[]
          | null;
        const e = Array.isArray(er) ? er[0] : er;
        const tmid = r.team_id as string;
        if (!tmid || !e?.id || !e.name || e.active === false) continue;
        if (!mitgliederByTeam.has(tmid)) mitgliederByTeam.set(tmid, []);
        mitgliederByTeam.get(tmid)!.push({
          id: String(e.id),
          name: String(e.name),
        });
      }
      mitgliederByTeam.forEach((arr) => {
        arr.sort((a, b) => a.name.localeCompare(b.name, "de"));
      });
    }

    const naechsteEinsaetze: NaechsterEinsatz[] = (zuHeuteListe ?? []).map(
      (row: Record<string, unknown>) => {
        const empRaw = row.employees as
          | { name?: string }
          | { name?: string }[]
          | null;
        const prRaw = row.projects as
          | {
              title?: string;
              status?: string;
              farbe?: string | null;
              adresse?: string | null;
            }
          | Array<{
              title?: string;
              status?: string;
              farbe?: string | null;
              adresse?: string | null;
            }>
          | null;
        const tmRaw = row.teams as
          | { name?: string; farbe?: string | null }
          | { name?: string; farbe?: string | null }[]
          | null;
        const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw;
        const pr = Array.isArray(prRaw) ? prRaw[0] : prRaw;
        const tm = Array.isArray(tmRaw) ? tmRaw[0] : tmRaw;
        const ft = row.project_title as string | null | undefined;
        const adresse = (pr?.adresse ?? "").trim();
        const teamIdRow = row.team_id as string | null | undefined;
        const mg = teamIdRow
          ? [...(mitgliederByTeam.get(teamIdRow) ?? [])].slice(0, 12)
          : [];
        return {
          id: String(row.id),
          mitarbeiter: String(emp?.name ?? "—"),
          projekt: String(pr?.title ?? ft?.trim() ?? "Ohne Projekt"),
          start: String(row.start_time ?? "").slice(0, 5),
          ende: String(row.end_time ?? "").slice(0, 5),
          status: String(row.status ?? "geplant"),
          teamName: tm?.name ? String(tm.name) : null,
          teamFarbe: tm?.farbe ? String(tm.farbe) : null,
          projektFarbe: pr?.farbe ? String(pr.farbe) : null,
          projektAdresse: adresse || null,
          projektStatus: pr?.status ? String(pr.status) : null,
          teamMitglieder: mg,
        };
      }
    );

    const ersteEinsatzProMa = new Map<
      string,
      { titel: string; start: string; end: string }
    >();
    for (const raw of heuteAssignmentsMaRaw ?? []) {
      const r = raw as Record<string, unknown>;
      const eid = r.employee_id as string;
      if (!eid || ersteEinsatzProMa.has(eid)) continue;
      const prRaw = r.projects as
        | { title?: string }
        | { title?: string }[]
        | null;
      const pr = Array.isArray(prRaw) ? prRaw[0] : prRaw;
      ersteEinsatzProMa.set(eid, {
        titel: String(pr?.title ?? "Projekt"),
        start: String(r.start_time ?? "").slice(0, 5),
        end: String(r.end_time ?? "").slice(0, 5),
      });
    }

    const mitarbeiterHeute: MitarbeiterHeuteZeile[] = (
      mitarbeiterKartenRaw ?? []
    ).map((raw) => {
      const m = raw as Record<string, unknown>;
      const id = String(m.id ?? "");
      const nameStr = String(m.name ?? "");
      const auth = m.auth_user_id as string | null;
      const tRaw = m.teams as
        | { farbe?: string | null }
        | { farbe?: string | null }[]
        | null;
      const tOne = Array.isArray(tRaw) ? tRaw[0] : tRaw;
      const farbe = String(tOne?.farbe ?? "#52525b");
      const ein = ersteEinsatzProMa.get(id);
      const istImEinsatz = Boolean(ein);
      return {
        id,
        name: nameStr,
        farbe,
        typ: auth ? ("koordinator" as const) : ("mitarbeiter" as const),
        istImEinsatz,
        untertitel: ein
          ? `${ein.titel} · ${ein.start}–${ein.end}`
          : "Kein Einsatz heute",
      };
    });

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
      wochenChart,
      wochenTeams,
      naechsteEinsaetze,
      auslastung7Tage,
      darfMitarbeiterEinladen: Boolean(darf),
      mitarbeiterHeute,
    };
  } catch {
    return leer;
  }
}
