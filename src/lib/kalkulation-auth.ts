import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth-check";

/**
 * Prüft, ob eine Kalkulation zur Organisation gehört (Session- oder Service-Client).
 */
export async function resolveCalculationForOrg(
  supabase: SupabaseClient,
  calculationId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data, error } = await supabase
    .from("calculations")
    .select("id")
    .eq("id", calculationId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Kalkulation konnte nicht geprüft werden.",
          message: error.message,
        },
        { status: 500 }
      ),
    };
  }
  if (!data) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Kalkulation nicht gefunden" },
        { status: 404 }
      ),
    };
  }
  return { ok: true };
}

/** Zugriff auf Kalkulationen: admin + abteilungsleiter (ohne teamleiter). */
export const KALKULATION_ROLLEN = ["admin", "abteilungsleiter"] as const;

export type KalkulationAuthOk = {
  supabase: SupabaseClient;
  user: User;
  orgId: string;
  employeeId: string;
};

export async function requireKalkulationBerechtigung(): Promise<
  KalkulationAuthOk | { error: NextResponse }
> {
  const auth = await requireAuth();
  if (auth.error || !auth.user || !auth.supabase) {
    return {
      error:
        auth.error ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: emp, error: empErr } = await auth.supabase
    .from("employees")
    .select("id, organization_id, role")
    .eq("auth_user_id", auth.user.id)
    .eq("active", true)
    .maybeSingle();

  if (empErr || !emp?.organization_id) {
    return {
      error: NextResponse.json(
        {
          error:
            "Kein gültiges Mitarbeiterprofil oder keine Organisation.",
        },
        { status: 403 }
      ),
    };
  }

  const role = emp.role as string | undefined;
  if (!role || !(KALKULATION_ROLLEN as readonly string[]).includes(role)) {
    return {
      error: NextResponse.json(
        {
          error:
            "Keine Berechtigung für Kalkulationen (admin oder Abteilungsleitung).",
        },
        { status: 403 }
      ),
    };
  }

  return {
    supabase: auth.supabase,
    user: auth.user,
    orgId: emp.organization_id as string,
    employeeId: emp.id as string,
  };
}
