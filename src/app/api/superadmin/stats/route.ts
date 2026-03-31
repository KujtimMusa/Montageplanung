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

type AbsenceRow = {
  organization_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

type SettingRow = {
  organization_id: string;
  key: string;
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
    { data: absences },
    { data: settings },
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
    service
      .from("absences")
      .select("organization_id,start_date,end_date,created_at")
      .gte("start_date", vor30TagenDatum),
    service
      .from("settings")
      .select("organization_id,key")
      .eq("key", "app"),
  ]);

  const orgListe = (orgs ?? []) as OrgRow[];
  const employeesListe = (employees ?? []) as EmployeeRow[];
  const invitationListe = (invitations ?? []) as InvitationRow[];
  const logListe = (agentLog ?? []) as AgentLogRow[];
  const assignmentListe = (assignments ?? []) as AssignmentRow[];
  const absenceListe = (absences ?? []) as AbsenceRow[];
  const settingsListe = (settings ?? []) as SettingRow[];
  const jetztIso = new Date().toISOString();

  const invByOrg = new Map<string, InvitationRow[]>();
  const empsByOrg = new Map<string, EmployeeRow[]>();
  const logsByOrg = new Map<string, AgentLogRow[]>();
  const assignmentsByOrg = new Map<string, AssignmentRow[]>();
  const absencesByOrg = new Map<string, AbsenceRow[]>();
  const settingsByOrg = new Set<string>(
    settingsListe.map((s) => s.organization_id).filter(Boolean)
  );

  for (const e of employeesListe) {
    const list = empsByOrg.get(e.organization_id) ?? [];
    list.push(e);
    empsByOrg.set(e.organization_id, list);
  }
  for (const i of invitationListe) {
    const list = invByOrg.get(i.organization_id) ?? [];
    list.push(i);
    invByOrg.set(i.organization_id, list);
  }
  for (const l of logListe) {
    const list = logsByOrg.get(l.organization_id) ?? [];
    list.push(l);
    logsByOrg.set(l.organization_id, list);
  }
  for (const a of assignmentListe) {
    const list = assignmentsByOrg.get(a.organization_id) ?? [];
    list.push(a);
    assignmentsByOrg.set(a.organization_id, list);
  }
  for (const a of absenceListe) {
    const list = absencesByOrg.get(a.organization_id) ?? [];
    list.push(a);
    absencesByOrg.set(a.organization_id, list);
  }

  const orgStats = orgListe.map((org) => {
    const orgEmps = empsByOrg.get(org.id) ?? [];
    const orgInvites = invByOrg.get(org.id) ?? [];
    const orgLogs = logsByOrg.get(org.id) ?? [];
    const orgAssignments = assignmentsByOrg.get(org.id) ?? [];
    const orgAbsences = absencesByOrg.get(org.id) ?? [];

    const aktiveMitarbeiter = orgEmps.filter((e) => Boolean(e.active)).length;
    const offeneInvites = orgInvites.filter((i) => !i.used_at && i.expires_at > jetztIso).length;
    const abgelaufeneInvites = orgInvites.filter(
      (i) => !i.used_at && i.expires_at <= jetztIso
    ).length;
    const healthScore = Math.max(
      0,
      100 -
        (aktiveMitarbeiter === 0 ? 40 : 0) -
        (orgLogs.length === 0 ? 25 : 0) -
        (abgelaufeneInvites > offeneInvites ? 20 : 0) -
        (settingsByOrg.has(org.id) ? 0 : 15)
    );

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      created_at: org.created_at,
      owner_id: org.owner_id,
      mitarbeiter_gesamt: orgEmps.length,
      mitarbeiter_aktiv: aktiveMitarbeiter,
      rollen: orgEmps.reduce<Record<string, number>>((acc, e) => {
        const rolle = (e.role ?? "unbekannt").trim() || "unbekannt";
        acc[rolle] = (acc[rolle] ?? 0) + 1;
        return acc;
      }, {}),
      einladungen_gesamt: orgInvites.length,
      einladungen_offen: offeneInvites,
      einladungen_abgelaufen: abgelaufeneInvites,
      ki_aufrufe_30d: orgLogs.length,
      ki_letzte_aktivitaet: orgLogs[0]?.created_at ?? null,
      ki_nach_typ: orgLogs.reduce<Record<string, number>>((acc, l) => {
        const typ = (l.agent_type ?? "unbekannt").trim() || "unbekannt";
        acc[typ] = (acc[typ] ?? 0) + 1;
        return acc;
      }, {}),
      einsaetze_30d: orgAssignments.length,
      abwesenheiten_30d: orgAbsences.length,
      settings_vorhanden: settingsByOrg.has(org.id),
      health_score: healthScore,
    };
  });

  const topKiOrgs = [...orgStats]
    .sort((a, b) => b.ki_aufrufe_30d - a.ki_aufrufe_30d)
    .slice(0, 5)
    .map((o) => ({ id: o.id, name: o.name, wert: o.ki_aufrufe_30d }));

  const risikoOrgs = [...orgStats]
    .filter((o) => o.health_score < 70 || o.ki_aufrufe_30d === 0 || o.mitarbeiter_aktiv === 0)
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      name: o.name,
      health_score: o.health_score,
      ki_aufrufe_30d: o.ki_aufrufe_30d,
      mitarbeiter_aktiv: o.mitarbeiter_aktiv,
      einladungen_abgelaufen: o.einladungen_abgelaufen,
    }));

  const agentenGlobal = logListe.reduce<Record<string, number>>((acc, l) => {
    const typ = (l.agent_type ?? "unbekannt").trim() || "unbekannt";
    acc[typ] = (acc[typ] ?? 0) + 1;
    return acc;
  }, {});

  const gesamt = {
    orgs_gesamt: orgListe.length,
    orgs_diese_woche: orgListe.filter((o) => {
      const created = new Date(o.created_at).getTime();
      return created > Date.now() - 7 * 24 * 60 * 60 * 1000;
    }).length,
    mitarbeiter_gesamt: employeesListe.length,
    mitarbeiter_aktiv: employeesListe.filter((e) => Boolean(e.active)).length,
    einladungen_offen: invitationListe.filter((i) => !i.used_at && i.expires_at > jetztIso).length,
    einladungen_abgelaufen: invitationListe.filter(
      (i) => !i.used_at && i.expires_at <= jetztIso
    ).length,
    ki_aufrufe_30d: logListe.length,
    einsaetze_30d: assignmentListe.length,
    abwesenheiten_30d: absenceListe.length,
    orgs_mit_settings: settingsByOrg.size,
    orgs_ohne_settings: Math.max(0, orgListe.length - settingsByOrg.size),
  };

  return NextResponse.json({
    gesamt,
    orgs: orgStats,
    top_ki_orgs: topKiOrgs,
    risiko_orgs: risikoOrgs,
    agenten_global: agentenGlobal,
  });
}
