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

  const dres = await supabase
    .from("dossiers")
    .select("id, verkoper_id, klant_id, offerte_referentie, offerte_datum")
    .eq("id", params.id)
    .single();
  const d = dres.data;
  if (!d || d.verkoper_id !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [klantRes, extractieRes, premieRes, leningRes, besparingRes, paramsRes] =
    await Promise.all([
      supabase.from("klanten").select("*").eq("id", d.klant_id).maybeSingle(),
      supabase
        .from("offerte_extracties")
        .select("*")
        .eq("dossier_id", params.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("premie_simulaties")
        .select("*")
        .eq("dossier_id", params.id)
        .maybeSingle(),
      supabase
        .from("lening_simulaties")
        .select("*")
        .eq("dossier_id", params.id)
        .maybeSingle(),
      supabase
        .from("besparing_simulaties")
        .select("*")
        .eq("dossier_id", params.id)
        .maybeSingle(),
      supabase
        .from("klant_parameters")
        .select("*")
        .eq("dossier_id", params.id)
        .maybeSingle(),
    ]);

  const klant = klantRes.data;
  const extractie = extractieRes.data?.gestructureerde_data;
  const premies = premieRes.data?.premies_jsonb;
  const leningRow = leningRes.data;
  const besparingRow = besparingRes.data;
  const klantParams = paramsRes.data
    ? {
        inkomenscategorie: paramsRes.data.inkomenscategorie,
        gezamenlijk_inkomen: paramsRes.data.gezamenlijk_inkomen,
        burgerlijke_staat: paramsRes.data.burgerlijke_staat,
        personen_ten_laste: paramsRes.data.personen_ten_laste,
        epc_label_voor: paramsRes.data.epc_label_voor,
        epc_label_verwacht: paramsRes.data.epc_label_verwacht,
        woning_ouderdom: paramsRes.data.woning_ouderdom,
      }
    : undefined;

  if (!extractie || !premies || !leningRow || !besparingRow) {
    return NextResponse.json(
      {
        error: "dossier nog niet volledig",
        heeft_extractie: !!extractie,
        heeft_premies: !!premies,
        heeft_lening: !!leningRow,
        heeft_besparing: !!besparingRow,
      },
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
          klantParams,
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
