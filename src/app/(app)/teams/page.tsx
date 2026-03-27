import { Suspense } from "react";
import { ladeAngestelltenProfil } from "@/lib/auth/angestellter";
import { TeamsBereich } from "@/components/teams/TeamsBereich";
import { TeamsZugriffHinweis } from "@/components/teams/TeamsZugriffHinweis";

export default async function TeamsSeite() {
  const profil = await ladeAngestelltenProfil();

  if (!profil) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Teams
          </h1>
        </div>
        <TeamsZugriffHinweis grund="kein_profil" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Teams</h1>
        <p className="text-sm text-zinc-400">
          Mitarbeiter, Teams und Abteilungen — zentrale Stammdaten.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500">Bereich wird geladen…</p>
        }
      >
        <TeamsBereich />
      </Suspense>
    </div>
  );
}
