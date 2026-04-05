import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireKalkulationBerechtigung,
  resolveCalculationForOrg,
} from "@/lib/kalkulation-auth";

const UUID = z.string().uuid();

type RouteContext = { params: { id: string; positionId: string } };

/**
 * DELETE /api/calculations/[id]/positions/[positionId]
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const calcIdParsed = UUID.safeParse(context.params.id);
    const posIdParsed = UUID.safeParse(context.params.positionId);
    if (!calcIdParsed.success || !posIdParsed.success) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }
    const calculationId = calcIdParsed.data;
    const positionId = posIdParsed.data;

    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { supabase, orgId } = auth;

    const calcOk = await resolveCalculationForOrg(supabase, calculationId, orgId);
    if (!calcOk.ok) {
      return calcOk.response;
    }

    const { error } = await supabase
      .from("calculation_positions")
      .delete()
      .eq("id", positionId)
      .eq("calculation_id", calculationId)
      .eq("organization_id", orgId);

    if (error) {
      return NextResponse.json(
        { error: "Position konnte nicht gelöscht werden.", message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
