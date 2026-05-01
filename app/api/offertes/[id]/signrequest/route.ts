/**
 * Stuur offerte ter ondertekening via SignRequest.
 * Genereert eerst PDF, uploadt naar SignRequest, start sign-flow.
 */

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { DocumentPDF } from "@/lib/pdf/document-pdf";
import { berekenTotalen } from "@/lib/documenten/totalen";
import { getTenant } from "@/lib/tenancy/tenants";
import { signRequestClient } from "@/lib/integrations/signrequest/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "offertes", "update");
    const supabase = createAdminSupabaseClient();

    const { data: q } = await supabase
      .from("quotations")
      .select(
        "*, contacts(voornaam,achternaam,email,adres_straat,postcode,gemeente), companies(naam,btw_nummer,adres_straat,postcode,gemeente,email), quotation_lines(*)",
      )
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (!q) return NextResponse.json({ error: "niet gevonden" }, { status: 404 });

    const signerEmail = q.contacts?.email ?? q.companies?.email;
    const signerNaam = q.contacts
      ? `${q.contacts.voornaam} ${q.contacts.achternaam}`
      : q.companies?.naam ?? "";
    if (!signerEmail) {
      return NextResponse.json(
        { error: "Klant heeft geen e-mailadres voor ondertekening" },
        { status: 400 },
      );
    }

    const tenant = await getTenant(ctx.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "tenant niet gevonden" }, { status: 500 });
    }

    const client = signRequestClient();

    // Insert signing_requests record (status: aangevraagd)
    const { data: signing, error: sErr } = await supabase
      .from("signing_requests")
      .insert({
        tenant_id: ctx.tenantId,
        document_type: "quotation",
        document_id: params.id,
        provider: "signrequest",
        signer_email: signerEmail,
        signer_naam: signerNaam,
        status: client ? "aangevraagd" : "wacht_op_configuratie",
        aangevraagd_door: ctx.userId,
      })
      .select()
      .single();
    if (sErr) throw sErr;

    if (!client) {
      return NextResponse.json({
        ok: true,
        status: "wacht_op_configuratie",
        info: "SignRequest niet geconfigureerd. Stel SIGNREQUEST_API_TOKEN in .env in.",
        signing_id: signing.id,
      });
    }

    // PDF genereren
    const regels = ((q.quotation_lines as any[]) ?? []).sort(
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
      Number(q.korting_pct ?? 0),
    );

    const klantNaam =
      q.companies?.naam ?? `${q.contacts?.voornaam ?? ""} ${q.contacts?.achternaam ?? ""}`.trim();

    const element = React.createElement(DocumentPDF, {
      type: "offerte",
      tenant: {
        naam: tenant.naam,
        btw_nummer: tenant.btw_nummer,
        adres: tenant.adres ?? undefined,
        postcode: tenant.postcode ?? undefined,
        gemeente: tenant.gemeente ?? undefined,
        email_contact: tenant.email_contact,
        telefoon: tenant.telefoon,
      },
      doc: {
        nummer: q.nummer,
        onderwerp: q.onderwerp,
        datum: q.datum,
        geldig_tot: q.geldig_tot,
      },
      klant: {
        naam: klantNaam,
        btw_nummer: q.companies?.btw_nummer,
        postcode: q.contacts?.postcode ?? q.companies?.postcode ?? undefined,
        gemeente: q.contacts?.gemeente ?? q.companies?.gemeente ?? undefined,
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
      totalen,
    });

    const buffer = await renderToBuffer(element as any);

    // Upload + signrequest aanmaken
    const doc = await client.uploadDocument({
      name: `Offerte-${q.nummer ?? params.id}.pdf`,
      pdfBuffer: buffer as any,
    });
    const sr = await client.createSignRequest({
      documentUuid: doc.uuid,
      signers: [
        {
          email: signerEmail,
          first_name: q.contacts?.voornaam,
          last_name: q.contacts?.achternaam,
        },
      ],
      message: `Gelieve de bijgevoegde offerte ${q.nummer ?? ""} te ondertekenen.`,
    });

    await supabase
      .from("signing_requests")
      .update({
        externe_id: sr.uuid,
        status: "verzonden",
      })
      .eq("id", signing.id);

    // Update offerte status
    await supabase
      .from("quotations")
      .update({ status: "verzonden" })
      .eq("id", params.id);

    return NextResponse.json({
      ok: true,
      status: "verzonden",
      signrequest_uuid: sr.uuid,
      signing_id: signing.id,
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
