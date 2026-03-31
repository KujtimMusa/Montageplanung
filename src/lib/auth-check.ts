import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLLEN = ["admin", "abteilungsleiter", "teamleiter"] as const;

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, supabase, error: null };
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if (auth.error || !auth.user || !auth.supabase) {
    return { user: null, supabase: null, error: auth.error };
  }

  const { data: employee } = await auth.supabase
    .from("employees")
    .select("role")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  if (!employee || !ADMIN_ROLLEN.includes(employee.role as (typeof ADMIN_ROLLEN)[number])) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: auth.user, supabase: auth.supabase, error: null };
}
