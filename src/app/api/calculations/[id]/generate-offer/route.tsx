import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { OfferCreateBodySchema } from "./offer-create-body";
import {
  requireKalkulationBerechtigung,
  resolveCalculationForOrg,
} from "@/lib/kalkulation-auth";

export const runtime = "nodejs";

const UUID = z.string().uuid();

type CalcPosition = {
  id: string;
  title: string;
  position_type: string;
  sort_order: number;
  details: unknown;
  line_total_net: number | null;
  trade_categories:
    | { name: string | null }
    | { name: string | null }[]
    | null;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Netto-Zeile: primär line_total_net, sonst typabhängig aus details. */
function lineNetFromPosition(p: CalcPosition): number {
  if (p.line_total_net != null && Number.isFinite(p.line_total_net)) {
    return p.line_total_net;
  }
  const d =
    p.details && typeof p.details === "object"
      ? (p.details as Record<string, unknown>)
      : {};
  switch (p.position_type) {
    case "arbeit": {
      const m = num(d.menge);
      const s = num(d.stundensatz);
      if (m != null && s != null) {
        return m * s;
      }
      const st = num(d.stunden);
      const ss = num(d.stundensatz);
      if (st != null && ss != null) {
        return st * ss;
      }
      return 0;
    }
    case "material": {
      const m = num(d.menge);
      const vk = num(d.vk_preis) ?? num(d.vk);
      if (m != null && vk != null) {
        return m * vk;
      }
      return 0;
    }
    case "pauschal":
    case "fremdleistung": {
      return num(d.betrag) ?? 0;
    }
    case "nachlass": {
      const mode = d.mode;
      const wert = num(d.wert);
      if (mode === "fix" && wert != null) {
        return -Math.abs(wert);
      }
      if (mode === "pct" && wert != null) {
        return 0;
      }
      return num(d.betrag) != null ? -Math.abs(num(d.betrag)!) : 0;
    }
    default:
      return 0;
  }
}

function safeFilenamePart(s: string): string {
  return s.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 80) || "Kalkulation";
}

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 18, marginBottom: 12 },
  h2: { fontSize: 12, marginTop: 14, marginBottom: 6 },
  muted: { color: "#444" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#ddd", paddingVertical: 4 },
  colPos: { width: "50%" },
  colType: { width: "15%" },
  colNet: { width: "35%", textAlign: "right" },
  tableHead: { flexDirection: "row", fontWeight: "bold", marginBottom: 4 },
  footer: { marginTop: 20, fontSize: 9, color: "#666" },
});

const SECTION_LABELS: Record<string, string> = {
  zahlungsbedingungen: "Zahlungsbedingungen",
  gewaehrleistung: "Gewährleistung",
  agb: "AGB",
  ausschluesse: "Ausschlüsse & Voraussetzungen",
};

type OfferPdfProps = {
  orgName: string;
  calcTitle: string;
  version: number;
  customerLabel: string;
  projectLabel: string;
  introText: string;
  positionRows: { label: string; position_type: string; net: number }[];
  netSubtotal: number;
  vatRate: number;
  brutto: string;
  validUntil: string;
  includeSections: string[];
};

function OfferPdfDocument(props: OfferPdfProps) {
  const vatAmount = props.netSubtotal * props.vatRate;
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.h1}>Angebot</Text>
        <Text style={pdfStyles.muted}>{props.orgName}</Text>
        <Text style={{ marginTop: 8 }}>
          Angebotsnr. V{props.version} — {props.calcTitle}
        </Text>
        <Text style={{ marginTop: 6 }}>Kunde: {props.customerLabel}</Text>
        <Text>Projekt: {props.projectLabel}</Text>
        <Text style={{ marginTop: 12 }}>{props.introText || "—"}</Text>

        <Text style={pdfStyles.h2}>Leistungspositionen</Text>
        <View style={pdfStyles.tableHead}>
          <Text style={pdfStyles.colPos}>Bezeichnung</Text>
          <Text style={pdfStyles.colType}>Typ</Text>
          <Text style={pdfStyles.colNet}>Netto €</Text>
        </View>
        {props.positionRows.map((r, i) => (
          <View key={i} style={pdfStyles.row} wrap={false}>
            <Text style={pdfStyles.colPos}>{r.label}</Text>
            <Text style={pdfStyles.colType}>{r.position_type}</Text>
            <Text style={pdfStyles.colNet}>
              {r.net.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        ))}

        <Text style={pdfStyles.h2}>Preisübersicht</Text>
        <Text>Netto gesamt: {props.netSubtotal.toFixed(2)} €</Text>
        <Text>MwSt. ({Math.round(props.vatRate * 100)}%): {vatAmount.toFixed(2)} €</Text>
        <Text>Brutto: {props.brutto} €</Text>

        <Text style={pdfStyles.footer}>
          Gültig bis: {props.validUntil}
        </Text>
        {props.includeSections.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={pdfStyles.h2}>Weitere Hinweise</Text>
            {props.includeSections.map((k) => (
              <View key={k} wrap={false} style={{ marginBottom: 6 }}>
                <Text style={{ fontWeight: "bold" }}>
                  {SECTION_LABELS[k] ?? k}
                </Text>
                <Text style={pdfStyles.muted}>
                  [Platzhalter — Inhalt aus Einstellungen / Templates in einer
                  späteren Version]
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

type RouteContext = { params: { id: string } };

/**
 * POST /api/calculations/[id]/generate-offer
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const idParsed = UUID.safeParse(context.params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Ungültige Kalkulations-ID" }, { status: 400 });
    }
    const calculationId = idParsed.data;

    const auth = await requireKalkulationBerechtigung();
    if ("error" in auth) {
      return auth.error;
    }
    const { orgId, employeeId } = auth;

    let admin;
    try {
      admin = createServiceRoleClient();
    } catch {
      return NextResponse.json(
        { error: "Server-Konfiguration: Service-Role fehlt." },
        { status: 500 }
      );
    }

    const gate = await resolveCalculationForOrg(admin, calculationId, orgId);
    if (!gate.ok) {
      return gate.response;
    }

    let bodyRaw: unknown;
    try {
      bodyRaw = await request.json();
    } catch {
      bodyRaw = {};
    }

    const parsed = OfferCreateBodySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierung fehlgeschlagen", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const payload = parsed.data;

    const { data: orgRow, error: orgErr } = await admin
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    if (orgErr || !orgRow) {
      return NextResponse.json(
        { error: "Organisation nicht gefunden." },
        { status: 500 }
      );
    }
    const orgName = (orgRow.name as string) ?? "";

    const { data: calc, error: calcErr } = await admin
      .from("calculations")
      .select(
        "id, title, customer_id, project_id, organization_id"
      )
      .eq("id", calculationId)
      .eq("organization_id", orgId)
      .single();

    if (calcErr || !calc) {
      return NextResponse.json(
        { error: "Kalkulation nicht gefunden.", message: calcErr?.message },
        { status: 404 }
      );
    }

    const { data: positions, error: posErr } = await admin
      .from("calculation_positions")
      .select(
        "id, title, position_type, sort_order, details, line_total_net, trade_categories ( name )"
      )
      .eq("calculation_id", calculationId)
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true });

    if (posErr) {
      return NextResponse.json(
        { error: "Positionen konnten nicht geladen werden.", message: posErr.message },
        { status: 500 }
      );
    }

    const posList = (positions ?? []) as unknown as CalcPosition[];

    let customerLabel = "—";
    if (calc.customer_id) {
      const { data: cust } = await admin
        .from("customers")
        .select("company_name")
        .eq("id", calc.customer_id as string)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (cust?.company_name) {
        customerLabel = cust.company_name as string;
      }
    }

    let projectLabel = "—";
    if (calc.project_id) {
      const { data: proj } = await admin
        .from("projects")
        .select("title")
        .eq("id", calc.project_id as string)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (proj?.title) {
        projectLabel = proj.title as string;
      }
    }

    const { data: verRows, error: verErr } = await admin
      .from("offers")
      .select("version")
      .eq("calculation_id", calculationId)
      .eq("organization_id", orgId)
      .order("version", { ascending: false })
      .limit(1);

    if (verErr) {
      return NextResponse.json(
        { error: "Versionsermittlung fehlgeschlagen.", message: verErr.message },
        { status: 500 }
      );
    }

    const maxV = verRows?.[0]?.version;
    const nextVersion =
      typeof maxV === "number" && !Number.isNaN(maxV) ? maxV + 1 : 1;

    let templateBody: string | null = null;
    if (payload.template_slug && payload.template_slug.trim().length > 0) {
      const { data: tpl } = await admin
        .from("offer_templates")
        .select("body, title")
        .eq("organization_id", orgId)
        .eq("slug", payload.template_slug.trim())
        .eq("active", true)
        .maybeSingle();
      templateBody = tpl ? ((tpl.body as string) ?? null) : null;
    }

    const validityDays = payload.validity_days;
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + validityDays);
    const validUntilIso = validUntilDate.toISOString();

    const generatedAt = new Date().toISOString();
    const meta = {
      position_display: payload.position_display,
      include_sections: payload.include_sections ?? [],
      generated_at: generatedAt,
      validity_days: validityDays,
      ...(templateBody ? { template_body: templateBody } : {}),
    };

    const aggregateByTrade = payload.position_display === "aggregiert";

    const netByPosition = posList.map((p) => ({
      p,
      net: lineNetFromPosition(p),
    }));

    let positionRows: { label: string; position_type: string; net: number }[] =
      [];

    if (aggregateByTrade) {
      const map = new Map<string, number>();
      for (const { p, net } of netByPosition) {
        const tc = p.trade_categories;
        const tcObj = Array.isArray(tc) ? tc[0] : tc;
        const tradeName = tcObj?.name?.trim() || "Ohne Gewerk";
        map.set(tradeName, (map.get(tradeName) ?? 0) + net);
      }
      positionRows = Array.from(map.entries()).map(([label, net]) => ({
        label,
        position_type: "aggregiert",
        net,
      }));
    } else {
      positionRows = netByPosition.map(({ p, net }) => ({
        label: p.title,
        position_type: p.position_type,
        net,
      }));
    }

    const netSubtotal = netByPosition.reduce((s, x) => s + x.net, 0);
    const vatRate = 0.19;
    const bruttoVal = netSubtotal * (1 + vatRate);
    const bruttoStr = bruttoVal.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const introCombined = [
      payload.intro_text?.trim() ? payload.intro_text.trim() : "",
      templateBody?.trim() ? templateBody.trim() : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data: offerRow, error: insErr } = await admin
      .from("offers")
      .insert({
        organization_id: orgId,
        calculation_id: calculationId,
        customer_id: calc.customer_id as string | null,
        version: nextVersion,
        status: "entwurf",
        template_key: payload.template_slug?.trim() || null,
        intro_text: payload.intro_text ?? null,
        aggregate_by_trade: aggregateByTrade,
        meta,
        valid_until: validUntilIso,
        created_by: employeeId,
        updated_at: generatedAt,
      })
      .select("id, version")
      .single();

    if (insErr || !offerRow) {
      return NextResponse.json(
        {
          error: "Angebot konnte nicht gespeichert werden.",
          message: insErr?.message,
        },
        { status: 400 }
      );
    }

    const pdfElement = (
      <OfferPdfDocument
        orgName={orgName}
        calcTitle={calc.title as string}
        version={nextVersion}
        customerLabel={customerLabel}
        projectLabel={projectLabel}
        introText={introCombined || "—"}
        positionRows={positionRows}
        netSubtotal={netSubtotal}
        vatRate={vatRate}
        brutto={bruttoStr}
        validUntil={validUntilDate.toLocaleDateString("de-DE")}
        includeSections={payload.include_sections ?? []}
      />
    );

    const buffer = await renderToBuffer(pdfElement);
    const titleSafe = safeFilenamePart((calc.title as string) ?? "Angebot");

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename="Angebot-${nextVersion}-${titleSafe}.pdf"`
    );
    headers.set("X-Offer-Id", (offerRow.id as string) ?? "");
    headers.set("X-Offer-Version", String(nextVersion));

    const pdfBytes = new Uint8Array(buffer);
    return new NextResponse(pdfBytes, { status: 201, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: "Interner Fehler", message }, { status: 500 });
  }
}
