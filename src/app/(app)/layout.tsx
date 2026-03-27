import { AppShell } from "@/components/layout/AppShell";
import {
  darfLeitungPersonal,
  ladeAngestelltenProfil,
} from "@/lib/auth/angestellter";

export const dynamic = "force-dynamic";

export default async function AppBereichLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let darfMitarbeiterSeite = false;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const profil = await ladeAngestelltenProfil();
      darfMitarbeiterSeite = darfLeitungPersonal(profil?.role);
    } catch {
      darfMitarbeiterSeite = false;
    }
  }

  return (
    <div className="dark min-h-dvh bg-zinc-950 text-zinc-100">
      <AppShell darfMitarbeiterSeite={darfMitarbeiterSeite}>
        {children}
      </AppShell>
    </div>
  );
}
