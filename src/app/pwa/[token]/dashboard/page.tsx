import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { KoordinatorLiveEinstempelung } from "@/components/pwa/KoordinatorLiveEinstempelung";
import Link from "next/link";

export default async function KoordinatorDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) return null;

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "coordinator") return null;

  const orgId = resolved.orgId;
  const supabase = createServiceRoleClient();
  const heute = format(new Date(), "yyyy-MM-dd");

  const { count: projektAktiv } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "aktiv");

  const { count: einsaetzeHeute } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("date", heute);

  const { data: emps } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", orgId);
  const empIds = (emps ?? []).map((e) => e.id as string);

  let eingestempelt = 0;
  if (empIds.length > 0) {
    const { count } = await supabase
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .in("employee_id", empIds)
      .is("checkout_at", null);
    eingestempelt = count ?? 0;
  }

  const { count: notifOffen } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("read", false);

  const { data: heuteRows } = await supabase
    .from("assignments")
    .select(
      "id,date,start_time,end_time,status, employees(name), projects(title)"
    )
    .eq("organization_id", orgId)
    .eq("date", heute)
    .order("start_time", { ascending: true })
    .limit(40);

  const kacheln = [
    { label: "Aktive Projekte", wert: projektAktiv ?? 0 },
    { label: "Einsätze heute", wert: einsaetzeHeute ?? 0 },
    { label: "Eingestempelt", wert: eingestempelt },
    { label: "Offene Infos", wert: notifOffen ?? 0 },
  ];

  return (
    <div className="space-y-6 p-4">
      <div>
        <p className="text-xs font-medium uppercase text-zinc-500">Schaltzentrale</p>
        <h1 className="text-xl font-bold text-zinc-50">{resolved.orgName}</h1>
        <p className="text-sm text-zinc-500">
          {format(parseISO(heute), "EEEE, d. MMMM yyyy", { locale: de })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {kacheln.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
          >
            <p className="text-2xl font-bold tabular-nums text-[#01696f]">{k.wert}</p>
            <p className="text-xs text-zinc-500">{k.label}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Heutige Einsätze</h2>
          <Link
            href={`/pwa/${token}/planung`}
            className="text-xs font-medium text-[#01696f]"
          >
            Planung →
          </Link>
        </div>
        {(heuteRows ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">Keine Einsätze für heute.</p>
        ) : (
          <ul className="space-y-2">
            {(heuteRows ?? []).map((a) => {
              const emp = a.employees as { name?: string } | { name?: string }[] | null;
              const name = Array.isArray(emp) ? emp[0]?.name : emp?.name;
              const pr = a.projects as { title?: string } | { title?: string }[] | null;
              const titel = Array.isArray(pr) ? pr[0]?.title : pr?.title;
              return (
                <li
                  key={a.id as string}
                  className="rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-zinc-200">{titel ?? "Projekt"}</p>
                  <p className="text-zinc-500">
                    {(a.start_time as string).slice(0, 5)}–
                    {(a.end_time as string).slice(0, 5)} · {name ?? "—"}
                  </p>
                  <p className="text-xs text-zinc-600">{a.status as string}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">
          Live: Eingestempelt
        </h2>
        <KoordinatorLiveEinstempelung token={token} />
      </section>
    </div>
  );
}
