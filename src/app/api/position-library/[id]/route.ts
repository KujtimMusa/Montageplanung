import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireKalkulationBerechtigung } from "@/lib/kalkulation-auth";
import { PositionLibraryPatchSchema } from "../position-library-schemas";

const UUID = z.string().uuid();

type RouteContext = { params: { id: string } };

/**
 * PATCH /api/position-library/[id]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const idParsed = UUID.safeParse(context.params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }
    const id = idParsed.data;

    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId } = auth;

    const { data: existing, error: exErr } = await supabase
      .from("position_library")
      .select("id, organization_id")
      .eq("id", id)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json(
        { error: "Eintrag konnte nicht geladen werden.", message: exErr.message },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }
    if (existing.organization_id == null) {
      return NextResponse.json(
        { error: "Globale Vorlagen können nicht bearbeitet werden." },
        { status: 403 }
      );
    }
    if (existing.organization_id !== orgId) {
      return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = PositionLibraryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierung fehlgeschlagen", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const p = parsed.data;
    const keys = Object.keys(p) as (keyof typeof p)[];
    if (keys.length === 0) {
      return NextResponse.json({ error: "Keine Felder zum Aktualisieren." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updateRow: Record<string, unknown> = { updated_at: now };

    for (const key of keys) {
      const val = p[key];
      if (val === undefined) {
        continue;
      }
      if (key === "details") {
        updateRow.default_details = val;
        continue;
      }
      if (key === "is_active") {
        updateRow.active = val;
        continue;
      }
      updateRow[key] = val;
    }

    const { data, error } = await supabase
      .from("position_library")
      .update(updateRow)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select(
        `
        id,
        name,
        default_hours,
        default_unit,
        default_details,
        trade_category_id,
        tags,
        usage_count,
        position_type,
        organization_id,
        active,
        created_at,
        updated_at,
        trade_categories ( id, name )
      `
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Aktualisierung fehlgeschlagen.", message: error.message },
        { status: 400 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        ...data,
        is_active: (data as { active?: boolean }).active ?? true,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}

/**
 * DELETE /api/position-library/[id] — Soft-Delete (active = false)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const idParsed = UUID.safeParse(context.params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }
    const id = idParsed.data;

    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId } = auth;

    const { data: existing, error: exErr } = await supabase
      .from("position_library")
      .select("id, organization_id")
      .eq("id", id)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json(
        { error: "Eintrag konnte nicht geladen werden.", message: exErr.message },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }
    if (existing.organization_id == null) {
      return NextResponse.json(
        { error: "Globale Vorlagen können nicht gelöscht werden." },
        { status: 403 }
      );
    }
    if (existing.organization_id !== orgId) {
      return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("position_library")
      .update({ active: false, updated_at: now })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select(
        `
        id,
        name,
        default_hours,
        default_unit,
        default_details,
        trade_category_id,
        tags,
        usage_count,
        position_type,
        organization_id,
        active,
        created_at,
        updated_at,
        trade_categories ( id, name )
      `
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Archivieren fehlgeschlagen.", message: error.message },
        { status: 400 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        ...data,
        is_active: false,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
