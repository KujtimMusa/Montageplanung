import { redirect } from "next/navigation";

export default function AbteilungenLegacySeite() {
  redirect("/teams?tab=abteilungen");
}
