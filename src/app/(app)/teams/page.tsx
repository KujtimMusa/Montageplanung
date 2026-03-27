import { redirect } from "next/navigation";
import { ladeAngestelltenProfil } from "@/lib/auth/angestellter";
import { TeamsBereich } from "@/components/teams/TeamsBereich";

export default async function TeamsSeite() {
  const profil = await ladeAngestelltenProfil();
  if (!profil) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Teams</h1>
        <p className="text-sm text-zinc-400">
          Mitarbeiter, Teams und Abteilungen — zentrale Stammdaten.
        </p>
      </div>
      <TeamsBereich />
    </div>
  );
}
