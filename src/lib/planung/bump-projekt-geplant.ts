import type { SupabaseClient } from "@supabase/supabase-js";

/** Nach neuem Einsatz: Projekt-Status von „neu“ auf „geplant“ heben. */
export async function bumpProjektGeplantWennNeu(
  client: SupabaseClient,
  projectId: string | null | undefined
): Promise<void> {
  if (!projectId) return;
  await client
    .from("projects")
    .update({ status: "geplant" })
    .eq("id", projectId)
    .eq("status", "neu");
}
