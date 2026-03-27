import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  darfLeitungPersonal,
  ladeAngestelltenProfil,
} from "@/lib/auth/angestellter";
import { TeamsBereich } from "@/components/teams/TeamsBereich";

export default async function TeamsSeite() {
  const profil = await ladeAngestelltenProfil();
  if (!darfLeitungPersonal(profil?.role)) {
    redirect("/dashboard");
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
