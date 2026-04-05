import Link from "next/link";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { normalisiereStatus } from "@/types/projekte";
import { STATUS_CONFIG } from "@/lib/projekt-status";

export default async function KoordinatorProjektePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  if (!istGueltigeTokenZeichenfolge(token)) return null;

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "coordinator") return null;

  const supabase = createServiceRoleClient();
  let q = supabase
    .from("projects")
    .select(
      "id,title,status,planned_start,customers(company_name)"
    )
    .eq("organization_id", resolved.orgId)
    .order("title", { ascending: true })
    .limit(100);

  const statusFilter = sp.status;
  if (statusFilter === "aktiv") {
    q = q.eq("status", "aktiv");
  } else if (statusFilter === "abgeschlossen") {
    q = q.eq("status", "abgeschlossen");
  }

  const { data: projekte } = await q;

  const such = (sp.q ?? "").trim().toLowerCase();
  const liste = (projekte ?? []).filter((p) => {
    if (!such) return true;
    const titel = String(p.title ?? "").toLowerCase();
    const cust = p.customers as { company_name?: string } | { company_name?: string }[] | null;
    const cn = Array.isArray(cust)
      ? cust[0]?.company_name
      : cust?.company_name;
    const k = String(cn ?? "").toLowerCase();
    return titel.includes(such) || k.includes(such);
  });

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-zinc-50">Projekte</h1>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href={`/pwa/${token}/projekte`}
          className={`rounded-full px-2 py-1 ${!statusFilter ? "bg-[#01696f]/30 text-[#01696f]" : "bg-zinc-800 text-zinc-400"}`}
        >
          Alle
        </Link>
        <Link
          href={`/pwa/${token}/projekte?status=aktiv`}
          className={`rounded-full px-2 py-1 ${statusFilter === "aktiv" ? "bg-[#01696f]/30 text-[#01696f]" : "bg-zinc-800 text-zinc-400"}`}
        >
          Aktiv
        </Link>
        <Link
          href={`/pwa/${token}/projekte?status=abgeschlossen`}
          className={`rounded-full px-2 py-1 ${statusFilter === "abgeschlossen" ? "bg-[#01696f]/30 text-[#01696f]" : "bg-zinc-800 text-zinc-400"}`}
        >
          Abgeschlossen
        </Link>
      </div>
      <p className="text-xs text-zinc-500">
        Suche: Nutzen Sie <code className="text-zinc-400">?q=</code> in der URL oder erweitern Sie die Ansicht später.
      </p>

      <ul className="space-y-2">
        {liste.map((p) => {
          const st = normalisiereStatus(p.status as string);
          const cfg = STATUS_CONFIG[st];
          const cust = p.customers as { company_name?: string } | null;
          const kunde = cust && !Array.isArray(cust) ? cust.company_name : null;
          return (
            <li
              key={p.id as string}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
            >
              <p className="font-medium text-zinc-100">{p.title as string}</p>
              <p className="text-xs text-zinc-500">{kunde ?? "—"}</p>
              <span
                className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px]"
                style={{
                  color: cfg?.farbe?.includes("emerald")
                    ? "#34d399"
                    : undefined,
                }}
              >
                {cfg?.label ?? (p.status as string)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
