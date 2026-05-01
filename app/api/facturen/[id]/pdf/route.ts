import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { DocumentPDF } from "@/lib/pdf/document-pdf";
import { getTenant } from "@/lib/tenancy/tenants";
import { berekenTotalen } from "@/lib/documenten/totalen";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "facturen", "view");
    const supabase = createAdminSupabaseClient();

    const [invRes, tenant] = await Promise.all([
      supabase
        .from("invoices")
        .select(
          "*, contacts(voornaam,achternaam,adres_straat,adres_nummer,postcode,gemeente), companies(naam,btw_nummer,adres_straat,adres_nummer,postcode,gemeente), invoice_lines(*)",
        )
        .eq("id", params.id)
        .eq("tenant_id", ctx.tenantId)
        .maybeSingle(),
      getTenant(ctx.tenantId),
    ]);

    const i = invRes.data;
    if (!i || !tenant)
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });

    let entity: any = null;
    if (i.business_entity_id) {
      const r = await supabase
        .from("business_entities")
        .select("*")
        .eq("id", i.business_entity_id)
        .maybeSingle();
      entity = r.data;
    }
    if (!entity) {
      const r = await supabase
        .from("business_entities")
        .select("*")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_default", true)
        .maybeSingle();
      entity = r.data;
    }

    const regels = ((i.invoice_lines as any[]) ?? []).sort(
      (a, b) => a.volgorde - b.volgorde,
    );
    const totalen = berekenTotalen(
      regels.map((r) => ({
        aantal: Number(r.aantal),
        prijs_excl_btw: Number(r.prijs_excl_btw),
        korting_pct: Number(r.korting_pct ?? 0),
        btw_tarief: Number(r.btw_tarief),
        is_kop: Boolean(r.is_kop),
      })),
      Number(i.korting_pct ?? 0),
    );

    const klantNaam =
      i.companies?.naam ??
      (i.contacts
        ? `${i.contacts.voornaam} ${i.contacts.achternaam}`
        : "Onbekend");
    const klantAdres =
      (i.companies?.adres_straat ?? i.contacts?.adres_straat) &&
      `${i.companies?.adres_straat ?? i.contacts?.adres_straat} ${i.companies?.adres_nummer ?? i.contacts?.adres_nummer ?? ""}`;

    const element = React.createElement(DocumentPDF, {
      type: "factuur",
      tenant: {
        naam: entity?.naam ?? tenant.naam,
        logo_url: entity?.logo_url ?? tenant.logo_url,
        btw_nummer: entity?.btw_nummer ?? tenant.btw_nummer,
        adres: entity?.adres_straat ?? tenant.adres ?? undefined,
        postcode: entity?.postcode ?? tenant.postcode ?? undefined,
        gemeente: entity?.gemeente ?? tenant.gemeente ?? undefined,
        email_contact: entity?.email ?? tenant.email_contact,
        telefoon: entity?.telefoon ?? tenant.telefoon,
        peppol_identifier: entity?.peppol_identifier ?? tenant.peppol_identifier,
      },
      doc: {
        nummer: i.nummer,
        onderwerp: i.onderwerp,
        datum: i.datum,
        vervaldatum: i.vervaldatum,
        opmerkingen: i.opmerkingen,
        voorwaarden: i.voorwaarden ?? entity?.algemene_voorwaarden ?? null,
        gestructureerde_mededeling: i.gestructureerde_mededeling,
        begeleidende_tekst_html: i.begeleidende_tekst_html,
        iban: entity?.iban,
        bic: entity?.bic,
        bank_naam: entity?.bank_naam,
      },
      klant: {
        naam: klantNaam,
        btw_nummer: i.companies?.btw_nummer,
        adres: klantAdres ?? undefined,
        postcode: i.companies?.postcode ?? i.contacts?.postcode ?? undefined,
        gemeente: i.companies?.gemeente ?? i.contacts?.gemeente ?? undefined,
      },
      regels: regels.map((r) => ({
        omschrijving: r.omschrijving,
        aantal: Number(r.aantal),
        eenheid: r.eenheid,
        prijs_excl_btw: Number(r.prijs_excl_btw),
        btw_tarief: Number(r.btw_tarief),
        subtotaal_excl_btw: Number(r.subtotaal_excl_btw),
        is_kop: Boolean(r.is_kop),
      })),
      totalen: {
        subtotaal_excl_btw: totalen.subtotaal_excl_btw,
        totaal_btw: totalen.totaal_btw,
        totaal_incl_btw: totalen.totaal_incl_btw,
        btw_per_tarief: totalen.btw_per_tarief,
      },
    });

    const buffer = await renderToBuffer(element as any);
    const path = `facturen/${ctx.tenantId}/${params.id}.pdf`;
    await supabase.storage
      .from("documenten")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });

    await supabase
      .from("invoices")
      .update({ pdf_url: path })
      .eq("id", params.id);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="factuur-${i.nummer ?? params.id}.pdf"`,
      },
    });
  } catch (err) {
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
}
