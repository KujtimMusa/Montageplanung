import { NextRequest, NextResponse } from "next/server";
import { requireKalkulationBerechtigung } from "@/lib/kalkulation-auth";
import {
  CalculationCreateBodySchema,
  CalculationListQuerySchema,
} from "@/lib/calculations-api-schemas";

function sanitizeIlikeTerm(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

/**
 * GET /api/calculations
 * Liste aller Kalkulationen der Organisation (Filter: project_id, status, search auf title).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId } = auth;

    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = CalculationListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Query-Parameter", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { project_id, status, search } = parsed.data;

    let q = supabase
      .from("calculations")
      .select(
        "id, organization_id, project_id, customer_id, title, status, margin_target_percent, quick_mode, notes, created_by, created_at, updated_at"
      )
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false });

    if (project_id) {
      q = q.eq("project_id", project_id);
    }
    if (status) {
      q = q.eq("status", status);
    }
    const term = search !== undefined ? sanitizeIlikeTerm(search) : "";
    if (term.length > 0) {
      q = q.ilike("title", `%${term}%`);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json(
        { error: "Kalkulationen konnten nicht geladen werden.", code: error.code, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ calculations: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}

/**
 * POST /api/calculations
 * Neue Kalkulation anlegen (RLS: Session-Client, organization_id = Org des Nutzers).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId, employeeId } = auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = CalculationCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierung fehlgeschlagen", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const now = new Date().toISOString();
    const insertRow = {
      organization_id: orgId,
      title: v.title,
      project_id: v.project_id ?? null,
      customer_id: v.customer_id ?? null,
      status: v.status ?? "entwurf",
      margin_target_percent: v.margin_target_percent ?? null,
      quick_mode: v.quick_mode ?? false,
      notes: v.notes ?? null,
      created_by: employeeId,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("calculations")
      .insert(insertRow)
      .select(
        "id, organization_id, project_id, customer_id, title, status, margin_target_percent, quick_mode, notes, created_by, created_at, updated_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Kalkulation konnte nicht angelegt werden.", code: error.code, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ calculation: data }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
