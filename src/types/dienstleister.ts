export type DienstleisterStatus = "aktiv" | "inaktiv" | "partner";

export type Spezialisierung =
  | "elektro"
  | "sanitaer"
  | "heizung"
  | "maler"
  | "schreiner"
  | "schlosser"
  | "dachdecker"
  | "geruestbau"
  | "abbruch"
  | "sonstiges";

export type Dienstleister = {
  id: string;
  firma: string;
  ansprechpartner: string | null;
  status: DienstleisterStatus;
  spezialisierung: Spezialisierung[];
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  adresse: string | null;
  vorlauf_tage: number;
  notizen: string | null;
  created_at: string;
};

export const SPEZIALISIERUNGEN: {
  value: Spezialisierung;
  label: string;
  icon:
    | "Zap"
    | "Droplets"
    | "Flame"
    | "Paintbrush"
    | "Hammer"
    | "Wrench"
    | "Home"
    | "Layers"
    | "HardHat"
    | "MoreHorizontal";
}[] = [
  { value: "elektro", label: "Elektro", icon: "Zap" },
  { value: "sanitaer", label: "Sanitär", icon: "Droplets" },
  { value: "heizung", label: "Heizung", icon: "Flame" },
  { value: "maler", label: "Maler", icon: "Paintbrush" },
  { value: "schreiner", label: "Schreiner", icon: "Hammer" },
  { value: "schlosser", label: "Schlosser", icon: "Wrench" },
  { value: "dachdecker", label: "Dachdecker", icon: "Home" },
  { value: "geruestbau", label: "Gerüstbau", icon: "Layers" },
  { value: "abbruch", label: "Abbruch", icon: "HardHat" },
  { value: "sonstiges", label: "Sonstiges", icon: "MoreHorizontal" },
];

const SPEZ_KEYS = new Set(
  SPEZIALISIERUNGEN.map((s) => s.value)
) as Set<Spezialisierung>;

const LABEL_ALIASES: Record<string, Spezialisierung> = {
  elektro: "elektro",
  sanitär: "sanitaer",
  sanitaer: "sanitaer",
  heizung: "heizung",
  maler: "maler",
  schreiner: "schreiner",
  schlosser: "schlosser",
  dachdecker: "dachdecker",
  gerüstbau: "geruestbau",
  geruestbau: "geruestbau",
  abbruch: "abbruch",
  sonstiges: "sonstiges",
};

export function normalisiereSpezialisierungen(
  raw: string[] | null | undefined
): Spezialisierung[] {
  if (!raw?.length) return [];
  const out: Spezialisierung[] = [];
  for (const x of raw) {
    const t = (x ?? "").trim().toLowerCase();
    if (!t) continue;
    const key = t.replace(/\s+/g, "");
    if (SPEZ_KEYS.has(key as Spezialisierung)) {
      out.push(key as Spezialisierung);
      continue;
    }
    if (LABEL_ALIASES[key]) {
      out.push(LABEL_ALIASES[key]);
      continue;
    }
    if (LABEL_ALIASES[t]) {
      out.push(LABEL_ALIASES[t]);
      continue;
    }
    out.push("sonstiges");
  }
  return Array.from(new Set(out));
}

export const STATUS_CONFIG: Record<
  DienstleisterStatus,
  { label: string; farbe: string }
> = {
  aktiv: { label: "Aktiv", farbe: "bg-emerald-500/20 text-emerald-400" },
  inaktiv: { label: "Inaktiv", farbe: "bg-zinc-500/20 text-zinc-400" },
  partner: { label: "Partner", farbe: "bg-blue-500/20 text-blue-400" },
};

/** Mappt eine Supabase-Zeile `subcontractors` auf den UI-Typ. */
export function subcontractorRowToDienstleister(
  row: Record<string, unknown>
): Dienstleister {
  const rawStatus = (row.status as string | undefined) ?? "aktiv";
  const status: DienstleisterStatus =
    rawStatus === "inaktiv" || rawStatus === "partner" || rawStatus === "aktiv"
      ? rawStatus
      : (row as { active?: boolean }).active === false
        ? "inaktiv"
        : "aktiv";
  const specRaw = (row.specialization as string[] | null) ?? [];
  return {
    id: row.id as string,
    firma: row.company_name as string,
    ansprechpartner: (row.contact_name as string | null) ?? null,
    status,
    spezialisierung: normalisiereSpezialisierungen(specRaw),
    phone: (row.phone as string | null) ?? null,
    whatsapp: (row.whatsapp_number as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    adresse: (row.address as string | null) ?? null,
    vorlauf_tage: (row.lead_time_days as number) ?? 0,
    notizen: (row.notes as string | null) ?? null,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}
