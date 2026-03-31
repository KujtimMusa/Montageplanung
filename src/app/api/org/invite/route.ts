import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgId } from "@/lib/org";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return NextResponse.json({ error: "Keine Organisation" }, { status: 403 });
  }

  const { email, role = "teamleiter" } = (await req.json()) as {
    email?: string;
    role?: string;
  };

  if (!email) {
    return NextResponse.json({ error: "E-Mail fehlt" }, { status: 400 });
  }

  const { data: invite, error } = await supabase
    .from("invitations")
    .insert({
      email,
      organization_id: orgId,
      role,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invite.token}`;

  await sendEmail({
    to: email,
    subject: `Einladung zu ${org?.name ?? "Einsatzplanung"}`,
    html: `
      <div style="font-family:sans-serif;background:#09090b;color:#e4e4e7;padding:32px;border-radius:16px;max-width:520px">
        <h1 style="color:#f4f4f5;font-size:22px">Du wurdest eingeladen</h1>
        <p style="color:#71717a">
          Du wurdest als <strong style="color:#a78bfa">${role}</strong> zu
          <strong style="color:#e4e4e7"> ${org?.name}</strong> eingeladen.
        </p>
        <a href="${joinUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">
          Einladung annehmen
        </a>
        <p style="color:#52525b;font-size:12px;margin-top:24px">
          Link gueltig bis: ${new Date(invite.expires_at).toLocaleDateString("de-DE")}
        </p>
      </div>`,
  });

  return NextResponse.json({
    ok: true,
    token: invite.token,
  });
}
