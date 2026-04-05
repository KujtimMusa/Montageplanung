import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireKalkulationBerechtigung } from "@/lib/kalkulation-auth";
import {
  type HistoryConfidence,
  HistoryEstimateQuerySchema,
} from "./history-estimate-schemas";

function epochHours(checkinIso: string, checkoutIso: string): number {
  const a = new Date(checkinIso).getTime();
  const b = new Date(checkoutIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) {
    return 0;
  }
  return (b - a) / 3600000;
}

function confidenceFromCount(n: number): HistoryConfidence {
  if (n <= 0) {
    return "keine_daten";
  }
  if (n >= 10) {
    return "hoch";
  }
  if (n >= 3) {
    return "mittel";
  }
  return "niedrig";
}

function sanitizeIlikeTerm(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

/**
 * GET /api/calculations/history-estimate
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { orgId } = auth;

    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = HistoryEstimateQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Query-Parameter", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { trade_category_id: tradeCategoryId, task_description } = parsed.data;
    const term =
      task_description !== undefined ? sanitizeIlikeTerm(task_description) : "";

    let admin;
    try {
      admin = createServiceRoleClient();
    } catch {
      return NextResponse.json(
        { error: "Server-Konfiguration: Service-Role fehlt." },
        { status: 500 }
      );
    }

    let posQuery = admin
      .from("calculation_positions")
      .select("id, title, calculation_id")
      .eq("organization_id", orgId)
      .eq("trade_category_id", tradeCategoryId);

    if (term.length > 0) {
      posQuery = posQuery.ilike("title", `%${term}%`);
    }

    const { data: positions, error: posErr } = await posQuery;

    if (posErr) {
      return NextResponse.json(
        { error: "Positionen konnten nicht geladen werden.", message: posErr.message },
        { status: 500 }
      );
    }

    const posList = positions ?? [];
    if (posList.length === 0) {
      return NextResponse.json({
        avg_hours: null,
        min_hours: null,
        max_hours: null,
        data_points: 0,
        confidence: "keine_daten" as const,
        sample_projects: [] as { project_id: string; title: string; hours: number }[],
      });
    }

    const calcIds = Array.from(
      new Set(posList.map((p) => p.calculation_id as string))
    );

    const { data: calcs, error: calcErr } = await admin
      .from("calculations")
      .select("id, project_id")
      .eq("organization_id", orgId)
      .in("id", calcIds);

    if (calcErr) {
      return NextResponse.json(
        { error: "Kalkulationen konnten nicht geladen werden.", message: calcErr.message },
        { status: 500 }
      );
    }

    const calcById = new Map(
      (calcs ?? []).map((c) => [c.id as string, c.project_id as string | null])
    );

    const projectIds = Array.from(
      new Set(
        (calcs ?? [])
          .map((c) => c.project_id as string | null)
          .filter((id): id is string => id != null)
      )
    );

    if (projectIds.length === 0) {
      return NextResponse.json({
        avg_hours: null,
        min_hours: null,
        max_hours: null,
        data_points: 0,
        confidence: "keine_daten" as const,
        sample_projects: [] as { project_id: string; title: string; hours: number }[],
      });
    }

    const { data: projects, error: projErr } = await admin
      .from("projects")
      .select("id, title, status")
      .eq("organization_id", orgId)
      .in("id", projectIds)
      .eq("status", "abgeschlossen");

    if (projErr) {
      return NextResponse.json(
        { error: "Projekte konnten nicht geladen werden.", message: projErr.message },
        { status: 500 }
      );
    }

    const completedProjectIds = new Set(
      (projects ?? []).map((p) => p.id as string)
    );
    const projectTitleById = new Map(
      (projects ?? []).map((p) => [p.id as string, (p.title as string) ?? ""])
    );

    const validPositionIds = posList
      .filter((p) => {
        const cid = p.calculation_id as string;
        const proj = calcById.get(cid) ?? null;
        if (proj == null) {
          return false;
        }
        return completedProjectIds.has(proj);
      })
      .map((p) => p.id as string);

    if (validPositionIds.length === 0) {
      return NextResponse.json({
        avg_hours: null,
        min_hours: null,
        max_hours: null,
        data_points: 0,
        confidence: "keine_daten" as const,
        sample_projects: [] as { project_id: string; title: string; hours: number }[],
      });
    }

    const { data: timeRows, error: teErr } = await admin
      .from("time_entries")
      .select("id, checkin_at, checkout_at, calculation_position_id")
      .eq("organization_id", orgId)
      .in("calculation_position_id", validPositionIds)
      .not("checkout_at", "is", null);

    if (teErr) {
      return NextResponse.json(
        { error: "Zeiterfassung konnte nicht geladen werden.", message: teErr.message },
        { status: 500 }
      );
    }

    const hoursList: number[] = [];
    const hoursByProject = new Map<string, number>();

    const positionToCalc = new Map(
      posList.map((p) => [p.id as string, p.calculation_id as string])
    );

    for (const te of timeRows ?? []) {
      const co = te.checkout_at as string | null;
      const ci = te.checkin_at as string;
      const cpId = te.calculation_position_id as string | null;
      if (co == null || cpId == null) {
        continue;
      }
      const h = epochHours(ci, co);
      hoursList.push(h);

      const calcId = positionToCalc.get(cpId);
      const proj = calcId ? calcById.get(calcId) : null;
      if (proj != null && completedProjectIds.has(proj)) {
        hoursByProject.set(proj, (hoursByProject.get(proj) ?? 0) + h);
      }
    }

    const dataPoints = hoursList.length;
    if (dataPoints === 0) {
      return NextResponse.json({
        avg_hours: null,
        min_hours: null,
        max_hours: null,
        data_points: 0,
        confidence: "keine_daten" as const,
        sample_projects: [] as { project_id: string; title: string; hours: number }[],
      });
    }

    const sum = hoursList.reduce((a, b) => a + b, 0);
    const avg = sum / dataPoints;
    const min = Math.min(...hoursList);
    const max = Math.max(...hoursList);

    const sampleProjects: { project_id: string; title: string; hours: number }[] =
      Array.from(hoursByProject.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([project_id, hours]) => ({
          project_id,
          title: projectTitleById.get(project_id) ?? "",
          hours,
        }));

    return NextResponse.json({
      avg_hours: avg,
      min_hours: min,
      max_hours: max,
      data_points: dataPoints,
      confidence: confidenceFromCount(dataPoints),
      sample_projects: sampleProjects,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
