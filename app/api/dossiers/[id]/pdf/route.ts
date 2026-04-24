import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { BankDossier } from "@/lib/pdf/bank-dossier";
import { KlantDossier } from "@/lib/pdf/klant-dossier";
import { randomUUID } from "crypto";

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { type: "bank" | "klant" };
  const supabase = createAdminSupabaseClient();

  const { data: d } = await supabase
    .from("dossiers")
    .select(
      `*, klant:klanten(*),
       extractie:offerte_extracties(*),
       premie:premie_simulaties(*),
       lening:lening_simulaties(*),
       besparing:besparing_simulaties(*)`,
    )
    .eq("id", params.id)
    .single();

  if (!d || d.verkoper_id !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const klant = d.klant as any;
  const extractie = (d.extractie as any)?.[0]?.gestructureerde_data;
  const premies = (d.premie as any)?.[0]?.premies_jsonb;
  const leningRow = (d.lening as any)?.[0];
  const besparingRow = (d.besparing as any)?.[0];

  if (!extractie || !premies || !leningRow || !besparingRow) {
    return NextResponse.json(
      { error: "dossier nog niet volledig" },
      { status: 400 },
    );
  }

  const lening = {
    leenbedrag: leningRow.leenbedrag,
    rentevoet_jaarlijks: leningRow.rentevoet,
    looptijd_jaar: leningRow.looptijd_jaar,
    maandelijkse_afbetaling: leningRow.maandelijkse_afbetaling,
    totale_interestkost: leningRow.totale_interestkost,
    totaal_terug_te_betalen:
      leningRow.maandelijkse_afbetaling * leningRow.looptijd_jaar * 12,
    type: leningRow.type_lening,
    eigen_inbreng: leningRow.eigen_inbreng,
  };

  const besparing = {
    jaarlijkse_besparing_warmtepomp: besparingRow.jaarlijkse_besparing_warmtepomp,
    jaarlijkse_besparing_pv: besparingRow.jaarlijkse_besparing_pv,
    jaarlijkse_besparing_batterij: besparingRow.jaarlijkse_besparing_batterij,
    totale_jaarlijkse_besparing: besparingRow.totale_jaarlijkse_besparing,
    terugverdientijd_jaar: besparingRow.terugverdientijd_jaar,
    projectie_10j: besparingRow.projectie_10j_jsonb ?? [],
    gebruikte_energieprijzen: besparingRow.gebruikte_energieprijzen_jsonb ?? {},
    jaarlijkse_prijsstijging: besparingRow.jaarlijkse_prijsstijging ?? 0.03,
  };

  const element =
    body.type === "bank"
      ? React.createElement(BankDossier, {
          klant,
          dossier: { referentie: d.offerte_referentie, datum: d.offerte_datum ?? undefined },
          extractie,
          premies,
          lening: lening as any,
          besparing,
        })
      : React.createElement(KlantDossier, {
          klant,
          extractie,
          premies,
          besparing,
          lening: lening as any,
        });

  const buffer = await renderToBuffer(element as any);

  const storagePath = `${userId}/${params.id}/${body.type}-${randomUUID()}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from("dossiers")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("dossiers")
    .createSignedUrl(storagePath, 60 * 60 * 24); // 24u

  await supabase.from("gegenereerde_pdfs").insert({
    dossier_id: params.id,
    type: body.type,
    pdf_url: storagePath,
    gegenereerd_door: userId,
    parameters_snapshot: {
      premies: premies,
      lening: lening,
      besparing: besparing,
    } as any,
  });

  await supabase.from("audit_log").insert({
    dossier_id: params.id,
    user_id: userId,
    actie: "pdf_generated",
    metadata: { type: body.type },
  });

  return NextResponse.json({ pdf_url: signed?.signedUrl });
}
