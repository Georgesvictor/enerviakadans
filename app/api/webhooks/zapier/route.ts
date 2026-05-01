/**
 * Zapier webhook: zet binnenkomende leads om in contact + deal.
 *
 * Beveiliging: header `x-zapier-secret` moet matchen met env `ZAPIER_WEBHOOK_SECRET`.
 * Tenant: header `x-kadans-tenant` moet de tenant_id bevatten (= Clerk org-id).
 *
 * Payload (JSON):
 *   {
 *     voornaam: "Jan",
 *     achternaam: "Janssens",
 *     email: "jan@example.com",
 *     telefoon: "+32 488 11 22 33",
 *     gsm: "+32 488 99 88 77",
 *     adres: "Hoofdstraat 1",
 *     postcode: "2000",
 *     gemeente: "Antwerpen",
 *     bron: "Website formulier",
 *     categorie: "Warmtepompen 2.0",
 *     opmerking: "Wil dakwerken in voorjaar",
 *     waarde_excl_btw: 5000  // optioneel
 *   }
 *
 * Resultaat: contact aangemaakt, deal in eerste pre_sales-stage van default pipeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Secret check
  const secret = req.headers.get("x-zapier-secret");
  if (
    !process.env.ZAPIER_WEBHOOK_SECRET ||
    secret !== process.env.ZAPIER_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "ongeldige secret" }, { status: 401 });
  }

  // Tenant check (per default = Enervia)
  const tenantId =
    req.headers.get("x-kadans-tenant") ?? "org_enervia_default";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const voornaam = String(body.voornaam ?? body.first_name ?? "").trim();
  const achternaam = String(body.achternaam ?? body.last_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!voornaam || !achternaam) {
    return NextResponse.json(
      { error: "voornaam + achternaam verplicht" },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();

  // Check: bestaat dit contact al? (op email)
  let contactId: string | null = null;
  if (email) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("email", email)
      .maybeSingle();
    if (existing) contactId = existing.id;
  }

  if (!contactId) {
    const { data: c, error } = await supabase
      .from("contacts")
      .insert({
        tenant_id: tenantId,
        voornaam,
        achternaam,
        email: email || null,
        telefoon: body.telefoon ?? null,
        gsm: body.gsm ?? null,
        adres_straat: body.adres ?? body.adres_straat ?? null,
        adres_nummer: body.adres_nummer ?? null,
        postcode: body.postcode ?? null,
        gemeente: body.gemeente ?? null,
        land: body.land ?? "BE",
        beschrijving: body.opmerking ?? null,
        bron: body.bron ?? "Zapier",
        is_klant: false,
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    contactId = c.id;
  }

  // Vind default pipeline + eerste stage (pre_sales)
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .eq("gearchiveerd", false)
    .maybeSingle();

  if (!pipeline) {
    return NextResponse.json(
      { error: "Geen default pipeline" },
      { status: 500 },
    );
  }

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("pipeline_id", pipeline.id)
    .eq("categorie", "pre_sales")
    .order("volgorde", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!stage) {
    return NextResponse.json(
      { error: "Geen pre_sales stage" },
      { status: 500 },
    );
  }

  const titel = body.titel
    ? String(body.titel)
    : `${voornaam} ${achternaam} ${body.categorie ? `· ${body.categorie}` : ""}`.trim();

  const { data: deal, error: dErr } = await supabase
    .from("deals")
    .insert({
      tenant_id: tenantId,
      pipeline_id: pipeline.id,
      stage_id: stage.id,
      titel,
      contact_id: contactId,
      waarde_excl_btw: Number(body.waarde_excl_btw ?? 0),
      btw_tarief: 0.21,
      lead_bron: body.bron ?? "Zapier",
      lead_categorie: body.categorie ?? null,
      bron: "zapier_webhook",
      status: "open",
    })
    .select("id, titel")
    .single();

  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 });
  }

  // Audit-log
  await supabase.from("audit_log").insert({
    tenant_id: tenantId,
    actie: "zapier_lead_ontvangen",
    metadata: {
      deal_id: deal.id,
      contact_id: contactId,
      categorie: body.categorie,
      bron: body.bron,
    },
    ip_address: req.headers.get("x-forwarded-for") ?? null,
  } as any);

  return NextResponse.json(
    {
      ok: true,
      deal_id: deal.id,
      contact_id: contactId,
      titel: deal.titel,
    },
    { status: 201 },
  );
}
