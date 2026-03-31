import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import {
  templateKonfliktKoordinator,
  templateWetterWarnung,
  templateKrankmeldungKoordinator,
  templateDienstleisterMeldung,
} from "@/lib/email-templates";
import { getMyOrgId } from "@/lib/org";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function ladeKoordinatoren(supabase: SupabaseServerClient, orgId: string) {
  const { data } = await supabase
    .from("employees")
    .select("id,name,email,role")
    .in("role", ["admin", "teamleiter", "abteilungsleiter"])
    .eq("organization_id", orgId)
    .eq("active", true)
    .not("email", "is", null);
  return data ?? [];
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    typ: "konflikt" | "wetter" | "krank" | "dienstleister";
    payload: Record<string, unknown>;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getMyOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Keine Organisation" }, { status: 403 });
  }

  const { data: settings } = await supabase
    .from("settings")
    .select("betrieb_name")
    .eq("key", "app")
    .eq("organization_id", orgId)
    .single();
  const betriebName = (settings as { betrieb_name?: string } | null)?.betrieb_name;

  const koordinatoren = await ladeKoordinatoren(supabase, orgId);
  if (!koordinatoren.length) {
    return NextResponse.json({
      ok: true,
      hinweis: "Keine Koordinatoren mit E-Mail",
    });
  }

  const ergebnisse = await Promise.all(
    koordinatoren.map(async (k) => {
      let email: { subject: string; html: string };

      if (body.typ === "konflikt") {
        const payload = body.payload as Parameters<typeof templateKonfliktKoordinator>[0];
        email = templateKonfliktKoordinator({
          ...payload,
          koordinator_name: k.name,
          betrieb_name: betriebName,
        });
      } else if (body.typ === "wetter") {
        const payload = body.payload as Parameters<typeof templateWetterWarnung>[0];
        email = templateWetterWarnung({
          ...payload,
          koordinator_name: k.name,
          betrieb_name: betriebName,
        });
      } else if (body.typ === "krank") {
        const payload = body.payload as Parameters<
          typeof templateKrankmeldungKoordinator
        >[0];
        email = templateKrankmeldungKoordinator({
          ...payload,
          koordinator_name: k.name,
          betrieb_name: betriebName,
        });
      } else {
        const payload = body.payload as Parameters<
          typeof templateDienstleisterMeldung
        >[0];
        email = templateDienstleisterMeldung({
          ...payload,
          koordinator_name: k.name,
          betrieb_name: betriebName,
        });
      }

      return sendEmail({ to: k.email as string, ...email });
    })
  );

  return NextResponse.json({
    ok: true,
    versendet: ergebnisse.filter((e) => e.ok).length,
    gesamt: koordinatoren.length,
  });
}
