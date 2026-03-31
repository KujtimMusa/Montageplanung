import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_id: string | null;
};

type EmployeeRow = {
  organization_id: string;
  role: string | null;
  active: boolean | null;
  created_at: string;
};

type InvitationRow = {
  organization_id: string;
  used_at: string | null;
  expires_at: string;
  created_at: string;
};

type AgentLogRow = {
  organization_id: string;
  agent_type: string | null;
  created_at: string;
};

type AssignmentRow = {
  organization_id: string;
  date: string;
  created_at: string;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sa } = await supabase
    .from("superadmins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sa) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server-Konfiguration fehlt (Service-Role)." },
      { status: 500 }
    );
  }

  const service = createServiceClient(supabaseUrl, serviceRoleKey);
  const vor30Tagen = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const vor30TagenIso = vor30Tagen.toISOString();
  const vor30TagenDatum = vor30TagenIso.split("T")[0] ?? "";

  const [
    { data: orgs },
    { data: employees },
    { data: invitations },
    { data: agentLog },
    { data: assignments },
  ] = await Promise.all([
    service
      .from("organizations")
      .select("id,name,slug,created_at,owner_id")
      .order("created_at", { ascending: false }),
    service
      .from("employees")
      .select("organization_id,role,active,created_at"),
    service
      .from("invitations")
      .select("organization_id,used_at,expires_at,created_at"),
    service
      .from("agent_log")
      .select("organization_id,agent_type,created_at")
      .gte("created_at", vor30TagenIso)
      .order("created_at", { ascending: false }),
    service
      .from("assignments")
      .select("organization_id,date,created_at")
      .gte("date", vor30TagenDatum),
  ]);

  const orgListe = (orgs ?? []) as OrgRow[];
  const employeesListe = (employees ?? []) as EmployeeRow[];
  const invitationListe = (invitations ?? []) as InvitationRow[];
  const logListe = (agentLog ?? []) as AgentLogRow[];
  const assignmentListe = (assignments ?? []) as AssignmentRow[];
  const jetztIso = new Date().toISOString();

  const orgStats = orgListe.map((org) => {
    const orgEmps = employeesListe.filter((e) => e.organization_id === org.id);
    const orgInvites = invitationListe.filter((i) => i.organization_id === org.id);
    const orgLogs = logListe.filter((l) => l.organization_id === org.id);
    const orgAssignments = assignmentListe.filter((a) => a.organization_id === org.id);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      created_at: org.created_at,
      owner_id: org.owner_id,
      mitarbeiter_gesamt: orgEmps.length,
      mitarbeiter_aktiv: orgEmps.filter((e) => Boolean(e.active)).length,
      rollen: orgEmps.reduce<Record<string, number>>((acc, e) => {
        const rolle = (e.role ?? "unbekannt").trim() || "unbekannt";
        acc[rolle] = (acc[rolle] ?? 0) + 1;
        return acc;
      }, {}),
      einladungen_gesamt: orgInvites.length,
      einladungen_offen: orgInvites.filter((i) => !i.used_at && i.expires_at > jetztIso).length,
      einladungen_abgelaufen: orgInvites.filter(
        (i) => !i.used_at && i.expires_at <= jetztIso
      ).length,
      ki_aufrufe_30d: orgLogs.length,
      ki_letzte_aktivitaet: orgLogs[0]?.created_at ?? null,
      ki_nach_typ: orgLogs.reduce<Record<string, number>>((acc, l) => {
        const typ = (l.agent_type ?? "unbekannt").trim() || "unbekannt";
        acc[typ] = (acc[typ] ?? 0) + 1;
        return acc;
      }, {}),
      einsaetze_30d: orgAssignments.length,
    };
  });

  const gesamt = {
    orgs_gesamt: orgListe.length,
    orgs_diese_woche: orgListe.filter((o) => {
      const created = new Date(o.created_at).getTime();
      return created > Date.now() - 7 * 24 * 60 * 60 * 1000;
    }).length,
    mitarbeiter_gesamt: employeesListe.length,
    einladungen_offen: invitationListe.filter((i) => !i.used_at && i.expires_at > jetztIso).length,
    ki_aufrufe_30d: logListe.length,
    einsaetze_30d: assignmentListe.length,
  };

  return NextResponse.json({ gesamt, orgs: orgStats });
}
