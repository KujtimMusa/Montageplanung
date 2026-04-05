import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireKalkulationBerechtigung,
  resolveCalculationForOrg,
} from "@/lib/kalkulation-auth";
import {
  PositionBulkPutBodySchema,
  PositionCreateBodySchema,
} from "./position-schemas";

const UUID = z.string().uuid();

type RouteContext = { params: { id: string } };

/**
 * GET /api/calculations/[id]/positions
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
    const { supabase, orgId } = auth;

    const calcOk = await resolveCalculationForOrg(supabase, calculationId, orgId);
    if (!calcOk.ok) {
      return calcOk.response;
    }

    const { data, error } = await supabase
      .from("calculation_positions")
      .select(
        `
        id,
        organization_id,
        calculation_id,
        trade_category_id,
        position_type,
        sort_order,
        title,
        details,
        line_total_net,
        library_item_id,
        created_at,
        updated_at,
        trade_categories ( id, name ),
        position_library ( id, name )
      `
      )
      .eq("calculation_id", calculationId)
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          error: "Positionen konnten nicht geladen werden.",
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ positions: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}

/**
 * POST /api/calculations/[id]/positions
 */
export async function POST(request: NextRequest, context: RouteContext) {
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
    const { supabase, orgId } = auth;

    const calcOk = await resolveCalculationForOrg(supabase, calculationId, orgId);
    if (!calcOk.ok) {
      return calcOk.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = PositionCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierung fehlgeschlagen", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    let sortOrder = v.sort_order;
    if (sortOrder === undefined) {
      const { data: maxRow } = await supabase
        .from("calculation_positions")
        .select("sort_order")
        .eq("calculation_id", calculationId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const maxSo = maxRow?.sort_order;
      sortOrder =
        typeof maxSo === "number" && !Number.isNaN(maxSo) ? maxSo + 1 : 0;
    }

    const now = new Date().toISOString();
    const insertRow = {
      organization_id: orgId,
      calculation_id: calculationId,
      title: v.title,
      position_type: v.position_type,
      trade_category_id: v.trade_category_id ?? null,
      sort_order: sortOrder,
      details: v.details ?? {},
      line_total_net: v.line_total_net ?? null,
      library_item_id: v.library_item_id ?? null,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("calculation_positions")
      .insert(insertRow)
      .select(
        `
        id,
        organization_id,
        calculation_id,
        trade_category_id,
        position_type,
        sort_order,
        title,
        details,
        line_total_net,
        library_item_id,
        created_at,
        updated_at,
        trade_categories ( id, name ),
        position_library ( id, name )
      `
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "Position konnte nicht angelegt werden.",
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ position: data }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}

/**
 * PUT /api/calculations/[id]/positions — Bulk-Update (Reorder + Inline-Felder).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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
    const { supabase, orgId } = auth;

    const calcOk = await resolveCalculationForOrg(supabase, calculationId, orgId);
    if (!calcOk.ok) {
      return calcOk.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = PositionBulkPutBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierung fehlgeschlagen", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const items = parsed.data;

    const { data: existingRows, error: exErr } = await supabase
      .from("calculation_positions")
      .select("id")
      .eq("calculation_id", calculationId)
      .eq("organization_id", orgId);

    if (exErr) {
      return NextResponse.json(
        { error: "Positionen konnten nicht geprüft werden.", message: exErr.message },
        { status: 500 }
      );
    }

    const allowed = new Set((existingRows ?? []).map((r) => r.id as string));
    for (const it of items) {
      if (!allowed.has(it.id)) {
        return NextResponse.json(
          {
            error: "Position gehört nicht zu dieser Kalkulation oder ist unbekannt.",
            position_id: it.id,
          },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const updated: unknown[] = [];

    for (const item of items) {
      const { id: posId, ...rest } = item;
      const keys = Object.keys(rest) as (keyof typeof rest)[];
      if (keys.length === 0) {
        return NextResponse.json(
          {
            error: "Pro Position mindestens ein zu aktualisierendes Feld (außer id) erforderlich.",
            position_id: posId,
          },
          { status: 400 }
        );
      }

      const updateRow: Record<string, unknown> = { updated_at: now };
      for (const key of keys) {
        const val = rest[key];
        if (val !== undefined) {
          updateRow[key] = val;
        }
      }

      const { data: row, error: upErr } = await supabase
        .from("calculation_positions")
        .update(updateRow)
        .eq("id", posId)
        .eq("calculation_id", calculationId)
        .eq("organization_id", orgId)
        .select(
          `
          id,
          organization_id,
          calculation_id,
          trade_category_id,
          position_type,
          sort_order,
          title,
          details,
          line_total_net,
          library_item_id,
          created_at,
          updated_at,
          trade_categories ( id, name ),
          position_library ( id, name )
        `
        )
        .maybeSingle();

      if (upErr) {
        return NextResponse.json(
          {
            error: "Aktualisierung fehlgeschlagen.",
            position_id: posId,
            message: upErr.message,
          },
          { status: 400 }
        );
      }
      if (!row) {
        return NextResponse.json(
          {
            error: "Position nicht aktualisiert (nicht gefunden).",
            position_id: posId,
          },
          { status: 400 }
        );
      }
      updated.push(row);
    }

    return NextResponse.json({ positions: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
