import type { SupabaseClient } from "@supabase/supabase-js";

/** organisation_id des angemeldeten Benutzers (aktiver Mitarbeiterdatensatz). */
export async function fetchMyOrganizationId(
  client: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data } = await client
    .from("employees")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  return (data?.organization_id as string | null) ?? null;
}
