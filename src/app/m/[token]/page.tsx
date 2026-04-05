import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { MonteurPwaEntry } from "@/components/pwa/MonteurPwaEntry";
import { redirect } from "next/navigation";

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

  const supabase = createServiceRoleClient();
  const { data: emp } = await supabase
    .from("employees")
    .select("email")
    .eq("id", resolved.employeeId)
    .maybeSingle();

  const employeeEmail = (emp?.email as string | null | undefined)?.trim() || null;

  return (
    <MonteurPwaEntry
      token={token}
      resolved={resolved}
      employeeEmail={employeeEmail}
    />
  );
}
