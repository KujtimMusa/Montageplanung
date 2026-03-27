import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Startseite: eingeloggte Nutzer → Dashboard, sonst Login.
 */
export default async function Startseite() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
