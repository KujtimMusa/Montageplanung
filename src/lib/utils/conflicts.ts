import type { SupabaseClient } from "@supabase/supabase-js";

export type KonfliktErgebnis = {
  hatKonflikt: boolean;
  nachricht: string;
  kollidierendeEinsatzIds: string[];
};

/**
 * Prüft zeitliche Überschneidung mit anderen Einsätzen desselben Mitarbeiters am selben Tag.
 */
export async function pruefeEinsatzKonflikt(
  supabase: SupabaseClient,
  parameter: {
    mitarbeiterId: string;
    datum: string;
    startZeit: string;
    endZeit: string;
    ausserhalbEinsatzId?: string;
  }
): Promise<KonfliktErgebnis> {
  const { mitarbeiterId, datum, startZeit, endZeit, ausserhalbEinsatzId } =
    parameter;

  const { data: bestehend, error } = await supabase
    .from("assignments")
    .select("id,start_time,end_time,project_title,projects(title)")
    .eq("employee_id", mitarbeiterId)
    .eq("date", datum);

  if (error) {
    return {
      hatKonflikt: true,
      nachricht: `Einsätze konnten nicht geprüft werden: ${error.message}`,
      kollidierendeEinsatzIds: [],
    };
  }

  const startMin = zeitZuMinuten(startZeit);
  const endMin = zeitZuMinuten(endZeit);

  const kollisionen = (bestehend ?? []).filter((row) => {
    if (ausserhalbEinsatzId && row.id === ausserhalbEinsatzId) return false;
    const a = zeitZuMinuten(row.start_time as string);
    const b = zeitZuMinuten(row.end_time as string);
    return startMin < b && endMin > a;
  });

  if (kollisionen.length === 0) {
    return {
      hatKonflikt: false,
      nachricht: "",
      kollidierendeEinsatzIds: [],
    };
  }

  const titel = kollisionen
    .map((k) => {
      const p = k.projects as
        | { title?: string }
        | { title?: string }[]
        | null;
      const projekt = Array.isArray(p) ? p[0] : p;
      const ft = k.project_title as string | null | undefined;
      return projekt?.title ?? ft?.trim() ?? "Einsatz";
    })
    .join(", ");

  return {
    hatKonflikt: true,
    nachricht: `Dieser Mitarbeiter ist zu dieser Zeit bereits gebucht (${titel}).`,
    kollidierendeEinsatzIds: kollisionen.map((k) => k.id),
  };
}

function zeitZuMinuten(t: string): number {
  const [h, m, s] = t.split(":").map((x) => parseInt(x, 10));
  const hh = h ?? 0;
  const mm = m ?? 0;
  const ss = Number.isFinite(s) ? s : 0;
  return hh * 60 + mm + ss / 60;
}

const TYP_LABEL: Record<string, string> = {
  urlaub: "Urlaub",
  krank: "Krank",
  fortbildung: "Fortbildung",
  sonstiges: "Sonstiges",
};

/**
 * Liefert Warn-Text, wenn der Mitarbeiter im Zeitraum [von, bis] abwesend ist (Datums-Strings yyyy-MM-dd).
 */
export async function pruefeAbwesenheitKonfliktText(
  supabase: SupabaseClient,
  parameter: {
    mitarbeiterId: string;
    von: string;
    bis: string;
  }
): Promise<string | null> {
  const { mitarbeiterId, von, bis } = parameter;

  const { data: rows, error } = await supabase
    .from("absences")
    .select("start_date,end_date,type,employees(name)")
    .eq("employee_id", mitarbeiterId)
    .lte("start_date", bis)
    .gte("end_date", von);

  if (error || !rows?.length) return null;

  const row = rows[0];
  const e = row.employees as
    | { name?: string }
    | { name?: string }[]
    | null;
  const name = Array.isArray(e) ? e[0]?.name : e?.name;
  const nm = (name as string) ?? "Mitarbeiter";
  const typ = TYP_LABEL[row.type as string] ?? (row.type as string) ?? "Abwesenheit";
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}.${m}.${y}`;
  };

  return `${nm} ist vom ${fmt(row.start_date as string)} bis ${fmt(row.end_date as string)} abwesend (${typ}).`;
}
