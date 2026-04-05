import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { PwaFotosClient } from "@/components/pwa/PwaFotosClient";

export default async function PwaFotosPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    return null;
  }
  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return null;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-zinc-50">Meine Fotos</h1>
      <p className="text-sm text-zinc-500">Baudokumentation (Übersicht)</p>
      <PwaFotosClient token={token} />
    </div>
  );
}
