/** Anzeige-Labels für Rollen (employees.role, team_role, …) */

export const ROLLEN_LABEL: Record<string, string> = {
  admin: "Admin",
  koordinator: "Koordinator",
  geschaeftsfuehrer: "Geschäftsführer",
  abteilungsleiter: "Abteilungsleiter",
  teamleiter: "Teamleiter",
  mitarbeiter: "Mitarbeiter (Ausführung)",
  mitarbeiter_ausfuehrung: "Mitarbeiter (Ausführung)",
  /** Standard-Rolle in der DB */
  monteur: "Mitarbeiter (Ausführung)",
  subunternehmer: "Subunternehmer",
  azubi: "Auszubildender",
  praktikant: "Praktikant",
  /** Teamzuordnung */
  mitglied: "Mitglied",
};

export function rolleLabel(rolle: string | null | undefined): string {
  if (!rolle) return "–";
  const k = rolle.toLowerCase().trim();
  return ROLLEN_LABEL[k] ?? rolle;
}

/** Nur für UI, wo alle Keys als Auswahl gelistet werden dürfen */
export const ROLLEN_OPTIONEN = Object.entries(ROLLEN_LABEL).map(
  ([value, label]) => ({ value, label })
);

/** Werte, die die Admin-API für employees.role zulässt */
export const MITARBEITER_ROLLEN_API = [
  "admin",
  "abteilungsleiter",
  "teamleiter",
  "monteur",
] as const;

export type MitarbeiterRolleApi = (typeof MITARBEITER_ROLLEN_API)[number];

export const MITARBEITER_ROLLEN_OPTIONS = MITARBEITER_ROLLEN_API.map(
  (value) => ({
    value,
    label: rolleLabel(value),
  })
);
