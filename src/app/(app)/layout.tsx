import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { AbteilungZeile } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export default async function AppBereichLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let abteilungen: AbteilungZeile[] = [];

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("departments")
        .select("id,name,color,icon")
        .order("name");
      abteilungen = (data as AbteilungZeile[]) ?? [];
    } catch {
      abteilungen = [];
    }
  }

  return <AppShell abteilungen={abteilungen}>{children}</AppShell>;
}
