import { NextRequest, NextResponse } from "next/server";
import { requireKalkulationBerechtigung } from "@/lib/kalkulation-auth";
import {
  PositionLibraryCreateSchema,
  PositionLibraryListQuerySchema,
} from "./position-library-schemas";

function parseIncludeGlobal(
  raw: Record<string, string | undefined>
): boolean {
  const v = raw.include_global;
  if (v === undefined) {
    return false;
  }
  return v === "true" || v === "1";
}

function sanitizeIlike(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

function matchesSearch(
  row: {
    name: string;
    tags: string[] | null;
  },
  term: string
): boolean {
  const low = term.toLowerCase();
  if (row.name.toLowerCase().includes(low)) {
    return true;
  }
  const tags = row.tags ?? [];
  return tags.some((t) => t.toLowerCase().includes(low));
}

/**
 * GET /api/position-library
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId } = auth;

    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = PositionLibraryListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Query-Parameter", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { trade_category_id: tcId, search } = parsed.data;
    const includeGlobal = parseIncludeGlobal(raw);

    let q = supabase
      .from("position_library")
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
      .order("usage_count", { ascending: false })
      .order("name", { ascending: true });

    if (includeGlobal) {
      q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
    } else {
      q = q.eq("organization_id", orgId);
    }

    if (tcId) {
      q = q.eq("trade_category_id", tcId);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json(
        { error: "Bibliothek konnte nicht geladen werden.", message: error.message },
        { status: 500 }
      );
    }

    let rows = data ?? [];
    if (search !== undefined && sanitizeIlike(search).length > 0) {
      const term = sanitizeIlike(search);
      rows = rows.filter((r) =>
        matchesSearch(
          {
            name: (r.name as string) ?? "",
            tags: (r.tags as string[] | null) ?? null,
          },
          term
        )
      );
    }

    const items = rows.map((r) => ({
      ...r,
      is_active: r.active as boolean,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}

/**
 * POST /api/position-library
 */
export async function POST(request: NextRequest) {
  try {
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

    const parsed = PositionLibraryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierung fehlgeschlagen", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const defaultUnit = v.default_unit ?? "Std";
    const now = new Date().toISOString();

    const insertRow = {
      organization_id: orgId,
      name: v.name,
      position_type: v.position_type,
      trade_category_id: v.trade_category_id ?? null,
      default_hours: v.default_hours ?? null,
      default_unit: defaultUnit,
      default_details: v.details ?? {},
      tags: v.tags ?? [],
      usage_count: 0,
      active: true,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("position_library")
      .insert(insertRow)
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
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Eintrag konnte nicht angelegt werden.", message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        item: {
          ...data,
          is_active: (data as { active?: boolean }).active ?? true,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
