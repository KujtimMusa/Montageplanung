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
    .select("id,start_time,end_time,projects(title)")
    .eq("employee_id", mitarbeiterId)
    .eq("date", datum);

  if (error) {
    return {
      hatKonflikt: false,
      nachricht: error.message,
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
      return projekt?.title ?? "Einsatz";
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
