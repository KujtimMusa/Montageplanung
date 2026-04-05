import { NextRequest, NextResponse } from "next/server";
import {
  endOfDay,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMyOrgId } from "@/lib/org";

type EmpEmbed = { name?: string | null; role?: string | null } | null;
type ProjEmbed = { title?: string | null } | null;

function empName(row: { employees?: EmpEmbed | EmpEmbed[] }): string {
  const e = row.employees;
  const one = Array.isArray(e) ? e[0] : e;
  return String(one?.name ?? "–");
}

function empRole(row: { employees?: EmpEmbed | EmpEmbed[] }): string {
  const e = row.employees;
  const one = Array.isArray(e) ? e[0] : e;
  return String(one?.role ?? "");
}

function projTitel(row: { projects?: ProjEmbed | ProjEmbed[] }): string {
  const p = row.projects;
  const one = Array.isArray(p) ? p[0] : p;
  return String(one?.title ?? "–");
}

/**
 * GET /api/zeiterfassung?tab=live|heute|woche|projekte&datum=YYYY-MM-DD&von=&bis=
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getMyOrgId();
  if (!orgId) {
    return NextResponse.json(
      { error: "Kein Mitarbeiter / keine Organisation" },
      { status: 403 }
    );
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "Server-Konfiguration unvollständig" },
      { status: 500 }
    );
  }

  const tab = req.nextUrl.searchParams.get("tab") ?? "live";
  const datumParam =
    req.nextUrl.searchParams.get("datum") ?? format(new Date(), "yyyy-MM-dd");
  let datumParsed: Date;
  try {
    datumParsed = parseISO(datumParam);
  } catch {
    datumParsed = new Date();
  }

  if (tab === "live") {
    const { data, error } = await admin
      .from("time_entries")
      .select(
        "id, checkin_at, checkin_lat, checkin_lng, notes, employee_id, project_id, assignment_id, employees(name, role), projects(title)"
      )
      .eq("organization_id", orgId)
      .is("checkout_at", null)
      .order("checkin_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ eintraege: data ?? [] });
  }

  if (tab === "heute") {
    const von = startOfDay(datumParsed).toISOString();
    const bis = endOfDay(datumParsed).toISOString();
    const { data, error } = await admin
      .from("time_entries")
      .select(
        "id, checkin_at, checkout_at, notes, employee_id, project_id, employees(name, role), projects(title)"
      )
      .eq("organization_id", orgId)
      .gte("checkin_at", von)
      .lte("checkin_at", bis)
      .order("checkin_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ eintraege: data ?? [] });
  }

  if (tab === "woche") {
    const wochenstart = startOfWeek(datumParsed, { weekStartsOn: 1 });
    const wochenende = endOfDay(
      endOfWeek(datumParsed, { weekStartsOn: 1 })
    );
    const { data, error } = await admin
      .from("time_entries")
      .select("id, checkin_at, checkout_at, employee_id, project_id, employees(name, role)")
      .eq("organization_id", orgId)
      .gte("checkin_at", wochenstart.toISOString())
      .lte("checkin_at", wochenende.toISOString())
      .not("checkout_at", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const proMitarbeiter: Record<
      string,
      {
        name: string;
        role: string;
        minuten: number;
        eintraege: number;
        tage: Set<string>;
      }
    > = {};

    for (const e of data ?? []) {
      const key = e.employee_id as string;
      const co = e.checkout_at as string | null;
      const ci = e.checkin_at as string;
      if (!co) continue;
      const min = Math.max(
        0,
        Math.round(
          (new Date(co).getTime() - new Date(ci).getTime()) / 60000
        )
      );
      const name = empName(e);
      const role = empRole(e);
      const tag = format(parseISO(ci), "yyyy-MM-dd");
      if (!proMitarbeiter[key]) {
        proMitarbeiter[key] = {
          name,
          role,
          minuten: 0,
          eintraege: 0,
          tage: new Set(),
        };
      }
      proMitarbeiter[key].minuten += min;
      proMitarbeiter[key].eintraege += 1;
      proMitarbeiter[key].tage.add(tag);
    }

    return NextResponse.json({
      wochenstart: format(wochenstart, "yyyy-MM-dd"),
      wochenende: format(wochenende, "yyyy-MM-dd"),
      mitarbeiter: Object.entries(proMitarbeiter)
        .map(([id, v]) => ({
          id,
          name: v.name,
          role: v.role,
          minuten: v.minuten,
          eintraege: v.eintraege,
          arbeitstage: v.tage.size,
        }))
        .sort((a, b) => b.minuten - a.minuten),
    });
  }

  if (tab === "projekte") {
    const von = req.nextUrl.searchParams.get("von");
    const bis = req.nextUrl.searchParams.get("bis");
    let query = admin
      .from("time_entries")
      .select(
        "id, checkin_at, checkout_at, project_id, employee_id, projects(title), employees(name)"
      )
      .eq("organization_id", orgId)
      .not("checkout_at", "is", null)
      .not("project_id", "is", null);

    if (von) query = query.gte("checkin_at", von);
    if (bis) query = query.lte("checkin_at", bis);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type MitarbeiterAgg = Record<string, { name: string; minuten: number }>;
    const proProjekt: Record<
      string,
      {
        titel: string;
        minuten: number;
        eintraege: number;
        mitarbeiter: MitarbeiterAgg;
      }
    > = {};

    for (const e of data ?? []) {
      const key = e.project_id as string;
      const co = e.checkout_at as string | null;
      const ci = e.checkin_at as string;
      if (!co) continue;
      const min = Math.max(
        0,
        Math.round(
          (new Date(co).getTime() - new Date(ci).getTime()) / 60000
        )
      );
      const titel = projTitel(e);
      const maName = empName(e);
      const maKey = e.employee_id as string;

      if (!proProjekt[key]) {
        proProjekt[key] = {
          titel,
          minuten: 0,
          eintraege: 0,
          mitarbeiter: {},
        };
      }
      proProjekt[key].minuten += min;
      proProjekt[key].eintraege += 1;
      if (!proProjekt[key].mitarbeiter[maKey]) {
        proProjekt[key].mitarbeiter[maKey] = { name: maName, minuten: 0 };
      }
      proProjekt[key].mitarbeiter[maKey].minuten += min;
    }

    return NextResponse.json({
      projekte: Object.entries(proProjekt)
        .map(([id, v]) => ({
          id,
          titel: v.titel,
          minuten: v.minuten,
          stunden: +(v.minuten / 60).toFixed(1),
          eintraege: v.eintraege,
          mitarbeiter: Object.entries(v.mitarbeiter)
            .map(([mid, mv]) => ({ id: mid, ...mv }))
            .sort((a, b) => b.minuten - a.minuten),
        }))
        .sort((a, b) => b.minuten - a.minuten),
    });
  }

  return NextResponse.json({ error: "Unbekannter Tab" }, { status: 400 });
}
