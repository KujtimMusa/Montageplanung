import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CalculationUpdateBodySchema } from "@/lib/calculations-api-schemas";
import { requireKalkulationBerechtigung } from "@/lib/kalkulation-auth";

const UUID = z.string().uuid();

type RouteParams = { params: { id: string } };

/**
 * GET /api/calculations/[id]
 * Kalkulation inkl. Positionen (mit Gewerk, Bibliothek), Projekt & Kunde.
 */
export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const idParsed = UUID.safeParse(context.params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Ungültige Kalkulations-ID" }, { status: 400 });
    }
    const id = idParsed.data;

    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId } = auth;

    const { data, error } = await supabase
      .from("calculations")
      .select(
        `
        id,
        organization_id,
        project_id,
        customer_id,
        title,
        status,
        margin_target_percent,
        quick_mode,
        notes,
        created_by,
        created_at,
        updated_at,
        projects ( title, status ),
        customers ( company_name ),
        calculation_positions (
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
        )
      `
      )
      .eq("id", id)
      .eq("organization_id", orgId)
      .order("sort_order", {
        ascending: true,
        foreignTable: "calculation_positions",
      })
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error: "Kalkulation konnte nicht geladen werden.",
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ calculation: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}

/**
 * PATCH /api/calculations/[id]
 * Header-Felder partiell aktualisieren; updated_at explizit setzen.
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const idParsed = UUID.safeParse(context.params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Ungültige Kalkulations-ID" }, { status: 400 });
    }
    const id = idParsed.data;

    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId } = auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = CalculationUpdateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierung fehlgeschlagen", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const patch = parsed.data;
    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0) {
      return NextResponse.json(
        { error: "Keine Felder zum Aktualisieren übermittelt." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updateRow: Record<string, unknown> = { updated_at: now };
    for (const key of keys) {
      const v = patch[key];
      if (v !== undefined) {
        updateRow[key] = v;
      }
    }

    const { data, error } = await supabase
      .from("calculations")
      .update(updateRow)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select(
        "id, organization_id, project_id, customer_id, title, status, margin_target_percent, quick_mode, notes, created_by, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error: "Aktualisierung fehlgeschlagen.",
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ calculation: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}

/**
 * DELETE /api/calculations/[id]
 * Soft-delete: status = archiviert (kein physisches Löschen).
 */
export async function DELETE(_request: NextRequest, context: RouteParams) {
  try {
    const idParsed = UUID.safeParse(context.params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Ungültige Kalkulations-ID" }, { status: 400 });
    }
    const id = idParsed.data;

    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId } = auth;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("calculations")
      .update({
        status: "archiviert",
        updated_at: now,
      })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select(
        "id, organization_id, project_id, customer_id, title, status, margin_target_percent, quick_mode, notes, created_by, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error: "Archivieren fehlgeschlagen.",
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ calculation: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
