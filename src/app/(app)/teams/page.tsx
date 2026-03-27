import { redirect } from "next/navigation";
import { ladeAngestelltenProfil } from "@/lib/auth/angestellter";
import { TeamsBereich } from "@/components/teams/TeamsBereich";

export default async function TeamsSeite() {
  const profil = await ladeAngestelltenProfil();
  if (!profil) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
        Teams
      </h1>
      <TeamsBereich />
    </div>
  );
}
