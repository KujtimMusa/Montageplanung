import { format } from "date-fns";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export default async function KoordinatorTeamsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) return null;

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "coordinator") return null;

  const heute = format(new Date(), "yyyy-MM-dd");
  const supabase = createServiceRoleClient();

  const { data: mitarbeiter } = await supabase
    .from("employees")
    .select("id,name,role,active")
    .eq("organization_id", resolved.orgId)
    .eq("active", true)
    .order("name", { ascending: true });

  const ids = (mitarbeiter ?? []).map((m) => m.id as string);
  const { data: offen } =
    ids.length > 0
      ? await supabase
          .from("time_entries")
          .select("employee_id, checkin_at")
          .in("employee_id", ids)
          .is("checkout_at", null)
      : { data: [] };

  const eingestempelt = new Set((offen ?? []).map((o) => o.employee_id as string));

  const { data: heuteEins } = await supabase
    .from("assignments")
    .select("employee_id")
    .eq("organization_id", resolved.orgId)
    .eq("date", heute);

  const mitEinsatzHeute = new Set(
    (heuteEins ?? []).map((x) => x.employee_id as string)
  );

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-zinc-50">Teams & Status</h1>
      <ul className="space-y-2">
        {(mitarbeiter ?? []).map((m) => {
          const id = m.id as string;
          let status: string;
          let farbe = "text-zinc-500";
          if (eingestempelt.has(id)) {
            status = "Eingestempelt";
            farbe = "text-emerald-400";
          } else if (mitEinsatzHeute.has(id)) {
            status = "Einsatz heute";
            farbe = "text-blue-400";
          } else {
            status = "Frei / kein Einsatz";
            farbe = "text-zinc-500";
          }
          const initialen = String(m.name ?? "?")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0])
            .join("")
            .toUpperCase();
          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-200">
                {initialen}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-100">{m.name as string}</p>
                <p className="text-xs text-zinc-500">{m.role as string}</p>
              </div>
              <span className={`shrink-0 text-xs font-medium ${farbe}`}>{status}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
