/** Anzeige-Ort: zuerst Baustellen-Notiz (projects.notes), sonst Kundenadresse. */

export function ortLabelFromProjektJoin(proj: {
  notes?: string | null;
  customers?:
    | { address?: string | null; city?: string | null }
    | { address?: string | null; city?: string | null }[]
    | null;
} | null): string {
  if (!proj) return "";
  const notes = typeof proj.notes === "string" ? proj.notes.trim() : "";
  if (notes) return notes;
  const c = proj.customers;
  const cust = Array.isArray(c) ? c[0] : c;
  const parts = [cust?.address, cust?.city].filter(Boolean) as string[];
  return parts.join(" · ") || "";
}
