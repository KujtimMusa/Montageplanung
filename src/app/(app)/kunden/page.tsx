import { redirect } from "next/navigation";

export default function KundenRedirect() {
  redirect("/projekte?tab=kunden");
}
