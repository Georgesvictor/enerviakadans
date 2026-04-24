import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  downloadQuotationPdf,
  getQuotation,
  getContact,
} from "@/lib/teamleader/quotations";
import { randomUUID } from "crypto";

/**
 * POST /api/dossiers
 *
 * Twee modes:
 *   - multipart form met `file`    → upload PDF
 *   - JSON { teamleader_quotation_id } → haal uit Teamleader
 *
 * Maakt dossier aan, upload PDF naar storage, extraheert (async trigger).
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminSupabaseClient();
  const contentType = req.headers.get("content-type") ?? "";

  let pdfBuffer: ArrayBuffer;
  let tlQuotationId: string | null = null;
  let klantId: string | null = null;
  let offerteReferentie: string | null = null;
  let offerteDatum: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "geen bestand" }, { status: 400 });
    }
    pdfBuffer = await file.arrayBuffer();

    // Maak lege klant aan die later kan ingevuld worden
    const { data: klant } = await supabase
      .from("klanten")
      .insert({
        voornaam: "Onbekend",
        achternaam: "(in te vullen)",
        created_by: userId,
      })
      .select()
      .single();
    klantId = klant?.id ?? null;
  } else {
    const body = (await req.json()) as { teamleader_quotation_id: string };
    tlQuotationId = body.teamleader_quotation_id;

    try {
      pdfBuffer = await downloadQuotationPdf(userId, tlQuotationId);
    } catch (err) {
      return NextResponse.json(
        { error: `Teamleader download mislukt: ${String(err)}` },
        { status: 502 },
      );
    }

    try {
      const q = (await getQuotation(userId, tlQuotationId)) as {
        data: {
          number?: string;
          date?: string;
          contact?: { id: string };
        };
      };
      offerteReferentie = q.data.number ?? null;
      offerteDatum = q.data.date ?? null;

      if (q.data.contact?.id) {
        const c = await getContact(userId, q.data.contact.id);
        const { data: klant } = await supabase
          .from("klanten")
          .insert({
            teamleader_contact_id: q.data.contact.id,
            voornaam: c.first_name ?? "",
            achternaam: c.last_name ?? "",
            email: c.emails?.[0]?.email ?? null,
            telefoon: c.telephones?.[0]?.number ?? null,
            adres: c.addresses?.[0]?.address.line_1 ?? null,
            postcode: c.addresses?.[0]?.address.postal_code ?? null,
            gemeente: c.addresses?.[0]?.address.city ?? null,
            created_by: userId,
          })
          .select()
          .single();
        klantId = klant?.id ?? null;
      }
    } catch {
      // fallback: geen klantgegevens
    }
  }

  // Upload PDF naar storage
  const path = `${userId}/${randomUUID()}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from("offertes")
    .upload(path, Buffer.from(pdfBuffer), {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: dossier, error } = await supabase
    .from("dossiers")
    .insert({
      klant_id: klantId,
      verkoper_id: userId,
      teamleader_quotation_id: tlQuotationId,
      offerte_pdf_url: path,
      offerte_referentie: offerteReferentie,
      offerte_datum: offerteDatum,
      status: "draft",
    })
    .select()
    .single();

  if (error || !dossier) {
    return NextResponse.json({ error: error?.message ?? "dossier fout" }, { status: 500 });
  }

  // Audit log
  await supabase.from("audit_log").insert({
    dossier_id: dossier.id,
    user_id: userId,
    actie: "dossier_created",
    metadata: { source: tlQuotationId ? "teamleader" : "upload" },
  });

  return NextResponse.json({ dossier_id: dossier.id });
}
