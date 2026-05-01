import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { berekenTotalen } from "@/lib/documenten/totalen";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "offertes", "view");
    const supabase = createAdminSupabaseClient();
    const status = req.nextUrl.searchParams.get("status");
    let q = supabase
      .from("quotations")
      .select(
        "id, nummer, onderwerp, status, datum, geldig_tot, totaal_incl_btw, contact_id, company_id, deal_id, contacts(voornaam,achternaam), companies(naam)",
      )
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ items: data });
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "offertes", "create");
    const body = await req.json();

    if (!body.onderwerp) {
      return NextResponse.json(
        { error: "onderwerp verplicht" },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const lijnen = (body.regels ?? []) as any[];
    const totalen = berekenTotalen(
      lijnen.map((r) => ({
        aantal: Number(r.aantal ?? 1),
        prijs_excl_btw: Number(r.prijs_excl_btw ?? 0),
        korting_pct: Number(r.korting_pct ?? 0),
        btw_tarief: Number(r.btw_tarief ?? 0.21),
        is_kop: Boolean(r.is_kop),
      })),
      Number(body.korting_pct ?? 0),
    );

    // Genereer nummer
    const { data: nummerRow } = await supabase.rpc("volgend_nummer", {
      t_id: ctx.tenantId,
      doc_type: "quotation",
    });
    const nummer = nummerRow ?? null;

    // Insert offerte
    const { data: offerte, error: errO } = await supabase
      .from("quotations")
      .insert({
        tenant_id: ctx.tenantId,
        nummer,
        onderwerp: body.onderwerp,
        referentie: body.referentie ?? null,
        deal_id: body.deal_id ?? null,
        contact_id: body.contact_id ?? null,
        company_id: body.company_id ?? null,
        geldig_tot: body.geldig_tot ?? null,
        taal: body.taal ?? "nl",
        opmerkingen: body.opmerkingen ?? null,
        voorwaarden: body.voorwaarden ?? null,
        begeleidende_tekst_html: body.begeleidende_tekst_html ?? null,
        template_id: body.template_id ?? null,
        bedrijfsentiteit: body.bedrijfsentiteit ?? null,
        layout: body.layout ?? null,
        korting_pct: Number(body.korting_pct ?? 0),
        subtotaal_excl_btw: totalen.subtotaal_excl_btw,
        totaal_btw: totalen.totaal_btw,
        totaal_incl_btw: totalen.totaal_incl_btw,
        eigenaar_id: body.eigenaar_id ?? ctx.userId,
        created_by: ctx.userId,
      })
      .select()
      .single();
    if (errO) throw errO;

    // Insert regels
    if (lijnen.length > 0) {
      const regelsMetTenant = lijnen.map((r, i) => ({
        tenant_id: ctx.tenantId,
        quotation_id: offerte.id,
        product_id: r.product_id ?? null,
        omschrijving: r.omschrijving,
        beschrijving: r.beschrijving ?? null,
        aantal: Number(r.aantal ?? 1),
        eenheid: r.eenheid ?? "stuk",
        prijs_excl_btw: Number(r.prijs_excl_btw ?? 0),
        aankoop_prijs_excl_btw: Number(r.aankoop_prijs_excl_btw ?? 0),
        korting_pct: Number(r.korting_pct ?? 0),
        btw_tarief: Number(r.btw_tarief ?? 0.21),
        facturatie_methode: r.facturatie_methode ?? "stukprijs",
        subtotaal_excl_btw: totalen.regels[i]?.subtotaal_excl_btw ?? 0,
        subtotaal_incl_btw: totalen.regels[i]?.subtotaal_incl_btw ?? 0,
        volgorde: (i + 1) * 10,
        is_kop: Boolean(r.is_kop),
      }));
      const { error: errR } = await supabase
        .from("quotation_lines")
        .insert(regelsMetTenant);
      if (errR) throw errR;
    }

    return NextResponse.json(offerte, { status: 201 });
  } catch (err) {
    return errResponse(err);
  }
}

function errResponse(err: unknown) {
  if (err instanceof TenancyError)
    return NextResponse.json({ error: err.message }, { status: 403 });
  if (err instanceof PermissionError)
    return NextResponse.json({ error: err.message }, { status: 403 });
  console.error(err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}
