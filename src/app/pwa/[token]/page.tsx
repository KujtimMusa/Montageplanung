import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { KoordinatorPwaEntry } from "@/components/pwa/KoordinatorPwaEntry";
import { redirect } from "next/navigation";

export default async function PwaKoordinatorEntry({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    redirect("/login");
  }

  const resolved = await resolveToken(token);
  if (!resolved) {
    return null;
  }
  if (resolved.role !== "coordinator") {
    redirect(`/pwa/${token}/dashboard`);
  }

  return <KoordinatorPwaEntry token={token} resolved={resolved} />;
}
