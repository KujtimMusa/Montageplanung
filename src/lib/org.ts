import { createClient } from "@/lib/supabase/server";

export async function getMyOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("employees")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .single();

  return (data?.organization_id as string | null) ?? null;
}

export async function requireOrgId(): Promise<string> {
  const orgId = await getMyOrgId();
  if (!orgId) throw new Error("Keine Organisation");
  return orgId;
}
