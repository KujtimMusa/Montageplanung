import { redirect } from "next/navigation";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";

export default async function PwaMonteurIndex({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    redirect("/login");
  }
  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return null;
  }
  redirect(`/m/${token}/projekte`);
}
