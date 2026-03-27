import { redirect } from "next/navigation";
import {
  darfMitarbeiterVerwalten,
  ladeAngestelltenProfil,
} from "@/lib/auth/angestellter";
import { TeamsVerwaltung } from "@/components/teams/TeamsVerwaltung";

export default async function TeamsSeite() {
  const profil = await ladeAngestelltenProfil();
  if (!darfMitarbeiterVerwalten(profil?.role)) {
    redirect("/planung");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Teams &amp; Mitarbeiter
        </h1>
        <p className="text-sm text-zinc-400">
          Teams strukturieren, Mitglieder zuordnen und Rollen pflegen.
        </p>
      </div>
      <TeamsVerwaltung />
    </div>
  );
}
