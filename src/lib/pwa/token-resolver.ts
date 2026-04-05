import { createServiceRoleClient } from "@/lib/supabase/admin";

export type TokenRole = "coordinator" | "worker" | "customer";

export interface ResolvedEmployee {
  role: "coordinator" | "worker";
  orgId: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  orgName: string;
}

export interface ResolvedCustomer {
  role: "customer";
  orgId: string;
  projectId: string;
  projectName: string;
  orgName: string;
}

export type ResolvedToken = ResolvedEmployee | ResolvedCustomer;

const KOORDINATOR_ROLLEN = [
  "admin",
  "koordinator",
  "geschaeftsfuehrer",
  "abteilungsleiter",
  "teamleiter",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function istGueltigeTokenZeichenfolge(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  return UUID_RE.test(token.trim());
}

export async function resolveToken(
  token: string | null | undefined
): Promise<ResolvedToken | null> {
  if (!istGueltigeTokenZeichenfolge(token)) return null;
  const t = token!.trim();
  const supabase = createServiceRoleClient();

  const { data: employee, error: e1 } = await supabase
    .from("employees")
    .select("id, name, role, organization_id, organizations(name)")
    .eq("pwa_token", t)
    .eq("active", true)
    .maybeSingle();

  if (e1) {
    console.warn("[resolveToken] employees:", e1.message);
  }

  if (employee) {
    const orgRow = employee.organizations as
      | { name?: string }
      | { name?: string }[]
      | null;
    const orgName = Array.isArray(orgRow)
      ? orgRow[0]?.name
      : orgRow?.name;
    const isKoordinator = KOORDINATOR_ROLLEN.includes(
      String(employee.role ?? "").toLowerCase()
    );
    return {
      role: isKoordinator ? "coordinator" : "worker",
      orgId: employee.organization_id as string,
      employeeId: employee.id as string,
      employeeName: employee.name as string,
      employeeRole: employee.role as string,
      orgName: orgName ?? "",
    };
  }

  const { data: project, error: e2 } = await supabase
    .from("projects")
    .select("id, title, organization_id, organizations(name)")
    .eq("customer_token", t)
    .maybeSingle();

  if (e2) {
    console.warn("[resolveToken] projects:", e2.message);
  }

  if (project) {
    const orgRow = project.organizations as
      | { name?: string }
      | { name?: string }[]
      | null;
    const orgName = Array.isArray(orgRow)
      ? orgRow[0]?.name
      : orgRow?.name;
    return {
      role: "customer",
      orgId: project.organization_id as string,
      projectId: project.id as string,
      projectName: project.title as string,
      orgName: orgName ?? "",
    };
  }

  return null;
}
