import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  requireKalkulationBerechtigung,
  resolveCalculationForOrg,
} from "@/lib/kalkulation-auth";
import type {
  TimeComparisonPositionConfidence,
  TimeComparisonPositionRow,
} from "./time-comparison-types";

const UUID = z.string().uuid();

type RouteContext = { params: { id: string } };

function epochHours(checkinIso: string, checkoutIso: string): number {
  const a = new Date(checkinIso).getTime();
  const b = new Date(checkoutIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) {
    return 0;
  }
  return (b - a) / 3600000;
}

/** Geplante Stunden nur für `arbeit` aus `details.stunden` (jsonb). */
function plannedHoursFromDetails(
  positionType: string,
  details: unknown
): number | null {
  if (positionType !== "arbeit") {
    return null;
  }
  if (!details || typeof details !== "object") {
    return null;
  }
  const d = details as Record<string, unknown>;
  const raw = d.stunden;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function confidenceForPosition(
  openCount: number,
  closedCount: number
): TimeComparisonPositionConfidence {
  if (openCount > 0) {
    return "laufend";
  }
  if (closedCount > 0) {
    return "vollstaendig";
  }
  return "keine_daten";
}

/**
 * GET /api/calculations/[id]/time-comparison
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const idParsed = UUID.safeParse(context.params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Ungültige Kalkulations-ID" }, { status: 400 });
    }
    const calculationId = idParsed.data;

    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { orgId } = auth;

    let admin;
    try {
      admin = createServiceRoleClient();
    } catch {
      return NextResponse.json(
        { error: "Server-Konfiguration: Service-Role fehlt." },
        { status: 500 }
      );
    }

    const calcGate = await resolveCalculationForOrg(admin, calculationId, orgId);
    if (!calcGate.ok) {
      return calcGate.response;
    }

    const { data: calcRow, error: calcErr } = await admin
      .from("calculations")
      .select("id, project_id")
      .eq("id", calculationId)
      .eq("organization_id", orgId)
      .single();

    if (calcErr || !calcRow) {
      return NextResponse.json(
        { error: "Kalkulation konnte nicht geladen werden.", message: calcErr?.message },
        { status: 500 }
      );
    }

    const projectId = calcRow.project_id as string | null;

    const { data: positions, error: posErr } = await admin
      .from("calculation_positions")
      .select(
        "id, title, position_type, sort_order, details, line_total_net"
      )
      .eq("calculation_id", calculationId)
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true });

    if (posErr) {
      return NextResponse.json(
        { error: "Positionen konnten nicht geladen werden.", message: posErr.message },
        { status: 500 }
      );
    }

    const posList = positions ?? [];
    const positionIds = posList.map((p) => p.id as string);

    type TeRow = {
      id: string;
      calculation_position_id: string | null;
      checkin_at: string;
      checkout_at: string | null;
    };

    let entries: TeRow[] = [];
    if (positionIds.length > 0) {
      const { data: teData, error: teErr } = await admin
        .from("time_entries")
        .select("id, calculation_position_id, checkin_at, checkout_at")
        .eq("organization_id", orgId)
        .in("calculation_position_id", positionIds);

      if (teErr) {
        return NextResponse.json(
          { error: "Zeiterfassung konnte nicht geladen werden.", message: teErr.message },
          { status: 500 }
        );
      }
      entries = (teData ?? []) as TeRow[];
    }

    const byPos = new Map<string, TeRow[]>();
    for (const e of entries) {
      const pid = e.calculation_position_id;
      if (!pid) {
        continue;
      }
      const list = byPos.get(pid) ?? [];
      list.push(e);
      byPos.set(pid, list);
    }

    const positionsOut: TimeComparisonPositionRow[] = [];

    for (const p of posList) {
      const pid = p.id as string;
      const posType = p.position_type as string;
      const planned = plannedHoursFromDetails(posType, p.details);

      const list = byPos.get(pid) ?? [];
      let openCount = 0;
      let closedCount = 0;
      let actualSum = 0;

      for (const e of list) {
        if (e.checkout_at == null) {
          openCount += 1;
          continue;
        }
        closedCount += 1;
        actualSum += epochHours(e.checkin_at, e.checkout_at);
      }

      let deviationPct: number | null = null;
      if (
        planned != null &&
        planned > 0 &&
        Number.isFinite(actualSum)
      ) {
        deviationPct = ((actualSum - planned) / planned) * 100;
      }

      positionsOut.push({
        position_id: pid,
        title: p.title as string,
        position_type: posType,
        planned_hours: planned,
        actual_hours: actualSum,
        time_entry_count: closedCount,
        deviation_pct: deviationPct,
        confidence: confidenceForPosition(openCount, closedCount),
      });
    }

    let totalPlanned = 0;
    for (const row of positionsOut) {
      if (row.planned_hours != null && row.planned_hours > 0) {
        totalPlanned += row.planned_hours;
      }
    }

    let totalActualForSummary = 0;
    if (projectId) {
      const { data: projTe, error: projTeErr } = await admin
        .from("time_entries")
        .select("checkin_at, checkout_at")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .not("checkout_at", "is", null);

      if (projTeErr) {
        return NextResponse.json(
          {
            error: "Projekt-Zeiten konnten nicht aggregiert werden.",
            message: projTeErr.message,
          },
          { status: 500 }
        );
      }
      for (const row of projTe ?? []) {
        const ci = row.checkin_at as string;
        const co = row.checkout_at as string;
        totalActualForSummary += epochHours(ci, co);
      }
    } else {
      for (const row of positionsOut) {
        totalActualForSummary += row.actual_hours;
      }
    }

    let totalDeviationPct: number | null = null;
    if (totalPlanned > 0) {
      totalDeviationPct =
        ((totalActualForSummary - totalPlanned) / totalPlanned) * 100;
    }

    return NextResponse.json({
      positions: positionsOut,
      summary: {
        total_planned_hours: totalPlanned,
        total_actual_hours: totalActualForSummary,
        total_deviation_pct: totalDeviationPct,
        project_id: projectId,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
