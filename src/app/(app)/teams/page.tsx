import { Suspense } from "react";
import {
  darfLeitungPersonal,
  ladeAngestelltenProfil,
} from "@/lib/auth/angestellter";
import { TeamsBereich } from "@/components/teams/TeamsBereich";
import { TeamsZugriffHinweis } from "@/components/teams/TeamsZugriffHinweis";

export default async function TeamsSeite() {
  const profil = await ladeAngestelltenProfil();

  if (!profil) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Teams &amp; Stammdaten
          </h1>
        </div>
        <TeamsZugriffHinweis grund="kein_profil" />
      </div>
    );
  }

  if (!darfLeitungPersonal(profil.role)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Teams &amp; Stammdaten
          </h1>
        </div>
        <TeamsZugriffHinweis grund="monteur" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Teams &amp; Stammdaten
        </h1>
        <p className="text-sm text-zinc-400">
          Teams, Mitarbeiter, Abwesenheiten und Projekte — alles für die Planung
          im Kalender.
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
