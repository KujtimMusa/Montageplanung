import type { BearbeitenZuweisung, EinsatzEvent } from "@/types/planung";

/** Alle Einsätze eines Tags nach Projekt bündeln (eine Kachel pro Projekt & Tag). */
export function gruppiereEinsaetzeNachProjektImTag(
  list: EinsatzEvent[]
): EinsatzEvent[][] {
  const byPid = new Map<string, EinsatzEvent[]>();
  for (const e of list) {
    const pid = e.project_id;
    if (!pid) continue;
    if (!byPid.has(pid)) byPid.set(pid, []);
    byPid.get(pid)!.push(e);
  }
  const groups = Array.from(byPid.values());
  for (const arr of groups) {
    arr.sort((a, b) =>
      (a.start_time ?? "").localeCompare(b.start_time ?? "", "de")
    );
  }
  groups.sort((a, b) => {
    const ta = a[0]?.start_time ?? "";
    const tb = b[0]?.start_time ?? "";
    if (ta !== tb) return ta.localeCompare(tb, "de");
    const pa = a[0]?.projects?.title ?? "";
    const pb = b[0]?.projects?.title ?? "";
    return pa.localeCompare(pb, "de");
  });
  return groups;
}

/** Formular + Löschen: erste Zeile + Metadaten der Gruppe. */
export function bearbeitenPayloadFromGruppe(
  gruppe: EinsatzEvent[]
): BearbeitenZuweisung | null {
  if (gruppe.length === 0) return null;
  const sorted = [...gruppe].sort((a, b) =>
    (a.start_time ?? "").localeCompare(b.start_time ?? "", "de")
  );
  const first = sorted[0]!;
  const teamIds = Array.from(
    new Set(
      sorted
        .map((z) => z.team_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const dlIds = Array.from(
    new Set(
      sorted
        .map((z) => z.dienstleister_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const weiter = sorted.slice(1).map((z) => z.id);
  const mehreZeilen = sorted.length > 1;
  return {
    id: first.id,
    employee_id: first.employee_id,
    project_id: first.project_id,
    team_id: first.team_id,
    dienstleister_id: first.dienstleister_id,
    date: first.date,
    start_time: first.start_time,
    end_time: first.end_time,
    notes: first.notes,
    prioritaet: first.prioritaet,
    ...(weiter.length ? { gruppe_weitere_assignment_ids: weiter } : {}),
    ...(mehreZeilen
      ? {
          ...(teamIds.length ? { gruppe_team_ids: teamIds } : {}),
          ...(dlIds.length ? { gruppe_dienstleister_ids: dlIds } : {}),
        }
      : {}),
  };
}

/** Alle Assignment-IDs der zusammengefassten Kachel. */
export function assignmentIdsDerGruppe(gruppe: EinsatzEvent[]): string[] {
  return gruppe.map((z) => z.id);
}
