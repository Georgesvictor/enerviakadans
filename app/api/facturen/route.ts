import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { berekenTotalen, gestructureerdeMedeling } from "@/lib/documenten/totalen";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "facturen", "view");
    const supabase = createAdminSupabaseClient();
    const status = req.nextUrl.searchParams.get("status");
    let q = supabase
      .from("invoices")
      .select(
        "id, nummer, onderwerp, status, datum, vervaldatum, totaal_incl_btw, reeds_betaald, peppol_status, contacts(voornaam,achternaam), companies(naam)",
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
    await requirePermission(ctx.tenantId, ctx.userId, "facturen", "create");
    const body = await req.json();
    if (!body.onderwerp) {
      return NextResponse.json({ error: "onderwerp verplicht" }, { status: 400 });
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

    const { data: nummer } = await supabase.rpc("volgend_nummer", {
      t_id: ctx.tenantId,
      doc_type: "invoice",
    });

    const vervalTermijn = Number(body.betalingstermijn_dagen ?? 30);
    const vervaldatum = new Date();
    vervaldatum.setDate(vervaldatum.getDate() + vervalTermijn);

    const { data: factuur, error } = await supabase
      .from("invoices")
      .insert({
        tenant_id: ctx.tenantId,
        nummer,
        onderwerp: body.onderwerp,
        type: body.type ?? "factuur",
        factuur_type: body.factuur_type ?? "standaard",
        referentie: body.referentie ?? null,
        quotation_id: body.quotation_id ?? null,
        deal_id: body.deal_id ?? null,
        project_id: body.project_id ?? null,
        contact_id: body.contact_id ?? null,
        company_id: body.company_id ?? null,
        vervaldatum: body.vervaldatum ?? vervaldatum.toISOString().slice(0, 10),
        betalingstermijn_dagen: vervalTermijn,
        opmerkingen: body.opmerkingen ?? null,
        voorwaarden: body.voorwaarden ?? null,
        begeleidende_tekst_html: body.begeleidende_tekst_html ?? null,
        template_id: body.template_id ?? null,
        bedrijfsentiteit: body.bedrijfsentiteit ?? null,
        business_entity_id: body.business_entity_id ?? null,
        korting_pct: Number(body.korting_pct ?? 0),
        subtotaal_excl_btw: totalen.subtotaal_excl_btw,
        totaal_btw: totalen.totaal_btw,
        totaal_incl_btw: totalen.totaal_incl_btw,
        gestructureerde_mededeling: gestructureerdeMedeling(
          String(Date.now()),
        ),
        peppol_status: "niet_verzonden",
        eigenaar_id: body.eigenaar_id ?? ctx.userId,
        created_by: ctx.userId,
      })
      .select()
      .single();
    if (error) throw error;

    if (lijnen.length > 0) {
      await supabase.from("invoice_lines").insert(
        lijnen.map((r, i) => ({
          tenant_id: ctx.tenantId,
          invoice_id: factuur.id,
          product_id: r.product_id ?? null,
          project_line_id: r.project_line_id ?? null,
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
        })),
      );
    }

    return NextResponse.json(factuur, { status: 201 });
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
