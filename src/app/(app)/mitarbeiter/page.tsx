import { redirect } from "next/navigation";
import {
  darfMitarbeiterVerwalten,
  ladeAngestelltenProfil,
} from "@/lib/auth/angestellter";
import { MitarbeiterVerwaltung } from "@/components/mitarbeiter/MitarbeiterVerwaltung";

export default async function MitarbeiterSeite() {
  const profil = await ladeAngestelltenProfil();
  if (!darfMitarbeiterVerwalten(profil?.role)) {
    redirect("/dashboard");
  }

  return <MitarbeiterVerwaltung />;
}
