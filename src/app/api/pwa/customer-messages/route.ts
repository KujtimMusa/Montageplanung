import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { templateKundenNachrichtAnKoordinator } from "@/lib/email-templates";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";

const STUNDEN_LIMIT = 5;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "customer") {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("customer_messages")
    .select("*")
    .eq("project_id", resolved.projectId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  let body: { token?: string; content?: string; author_name?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON" }, { status: 400 });
  }

  const token = body.token ?? "";
  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "customer") {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 403 });
  }

  const content = (body.content ?? "").trim();
  if (!content || content.length > 8000) {
    return NextResponse.json({ error: "Nachricht ungültig" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const seit = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: cErr } = await supabase
    .from("customer_messages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", resolved.projectId)
    .eq("author_type", "kunde")
    .gte("created_at", seit);

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 400 });
  }

  if ((count ?? 0) >= STUNDEN_LIMIT) {
    return NextResponse.json(
      { error: "Zu viele Nachrichten. Bitte später erneut versuchen." },
      { status: 429 }
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("customer_messages")
    .insert({
      organization_id: resolved.orgId,
      project_id: resolved.projectId,
      author_type: "kunde",
      author_name: body.author_name?.trim() || null,
      content,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Speichern fehlgeschlagen" },
      { status: 400 }
    );
  }

  const { data: koordinatoren } = await supabase
    .from("employees")
    .select("email, name")
    .eq("organization_id", resolved.orgId)
    .eq("active", true)
    .in("role", ["admin", "koordinator", "geschaeftsfuehrer"]);

  const absender =
    body.author_name?.trim() || "Kunde (Portal)";

  const { subject, html } = templateKundenNachrichtAnKoordinator({
    projektName: resolved.projectName,
    firmenName: resolved.orgName || "Betrieb",
    absenderName: absender,
    inhalt: content,
  });

  for (const k of koordinatoren ?? []) {
    const email = (k.email as string | null)?.trim();
    if (!email) continue;
    await sendEmail({ to: email, subject, html });
  }

  return NextResponse.json({ message_id: inserted.id });
}
