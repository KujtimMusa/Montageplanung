import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { AbteilungZeile } from "@/components/layout/AppShell";
import {
  darfMitarbeiterVerwalten,
  ladeAngestelltenProfil,
} from "@/lib/auth/angestellter";

export const dynamic = "force-dynamic";

export default async function AppBereichLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let abteilungen: AbteilungZeile[] = [];
  let darfMitarbeiterSeite = false;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const profil = await ladeAngestelltenProfil();
      darfMitarbeiterSeite = darfMitarbeiterVerwalten(profil?.role);

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

  return (
    <div className="dark min-h-dvh bg-zinc-950 text-zinc-100">
      <AppShell
        abteilungen={abteilungen}
        darfMitarbeiterSeite={darfMitarbeiterSeite}
      >
        {children}
      </AppShell>
    </div>
  );
}
