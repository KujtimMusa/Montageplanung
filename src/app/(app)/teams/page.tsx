import { redirect } from "next/navigation";
import { ladeAngestelltenProfil } from "@/lib/auth/angestellter";
import { TeamsBereich } from "@/components/teams/TeamsBereich";

export default async function TeamsSeite() {
  const profil = await ladeAngestelltenProfil();
  if (!profil) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-1 border-b border-zinc-800/60 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
          Teams
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-[15px]">
          Mitarbeiter, Teams und Abteilungen — zentrale Stammdaten für Planung
          und Kalender.
        </p>
      </div>
      <TeamsBereich />
    </div>
  );
}
