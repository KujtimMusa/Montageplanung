import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: bestehendes } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (bestehendes) {
    return NextResponse.json(
      { error: "Bereits in einer Organisation" },
      { status: 409 }
    );
  }

  const { betrieb_name, vorname, nachname } = (await req.json()) as {
    betrieb_name?: string;
    vorname?: string;
    nachname?: string;
  };

  if (!betrieb_name?.trim()) {
    return NextResponse.json({ error: "Betriebsname fehlt" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  const slug =
    betrieb_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) +
    "-" +
    Date.now();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: betrieb_name,
      slug,
      owner_id: user.id,
    })
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message }, { status: 500 });
  }

  const { error: settingsError } = await admin.from("settings").insert({
    key: "app",
    organization_id: org.id,
    value: "{}",
    betrieb_name,
  });

  if (settingsError) {
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const { error: empError } = await admin.from("employees").insert({
    name:
      `${vorname ?? ""} ${nachname ?? ""}`.trim() ||
      user.email?.split("@")[0] ||
      "Admin",
    email: user.email,
    role: "admin",
    active: true,
    auth_user_id: user.id,
    organization_id: org.id,
  });

  if (empError) {
    await admin.from("settings").delete().eq("organization_id", org.id).eq("key", "app");
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: empError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    organization_id: org.id,
  });
}
