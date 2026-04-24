import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { berekenTotaleBesparing } from "@/lib/berekeningen/besparing";
import { getActueleEnergieprijzen } from "@/lib/energieprijzen";
import type { KlantParameters, OfferteExtractie } from "@/lib/berekeningen/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminSupabaseClient();

  const body = (await req.json()) as { eigen_inbreng: number; prijsstijging?: number };

  const { data: dossier } = await supabase
    .from("dossiers")
    .select(`
      id, verkoper_id,
      extractie:offerte_extracties(gestructureerde_data),
      parameters:klant_parameters(*)
    `)
    .eq("id", params.id)
    .single();
  if (!dossier || dossier.verkoper_id !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const extractie = (dossier.extractie as any)?.[0]?.gestructureerde_data as OfferteExtractie;
  const kparams = (dossier.parameters as any)?.[0] as KlantParameters;
  if (!extractie || !kparams) {
    return NextResponse.json({ error: "extractie/params ontbreken" }, { status: 400 });
  }

  const prijzen = await getActueleEnergieprijzen();
  const besparing = berekenTotaleBesparing({
    extractie,
    parameters: kparams,
    prijzen,
    eigen_inbreng: body.eigen_inbreng,
    jaarlijkse_prijsstijging: body.prijsstijging,
  });

  await supabase.from("besparing_simulaties").upsert(
    {
      dossier_id: params.id,
      jaarlijkse_besparing_warmtepomp: besparing.jaarlijkse_besparing_warmtepomp,
      jaarlijkse_besparing_pv: besparing.jaarlijkse_besparing_pv,
      jaarlijkse_besparing_batterij: besparing.jaarlijkse_besparing_batterij,
      totale_jaarlijkse_besparing: besparing.totale_jaarlijkse_besparing,
      terugverdientijd_jaar: besparing.terugverdientijd_jaar,
      projectie_10j_jsonb: besparing.projectie_10j as any,
      gebruikte_energieprijzen_jsonb: besparing.gebruikte_energieprijzen as any,
      jaarlijkse_prijsstijging: besparing.jaarlijkse_prijsstijging,
    },
    { onConflict: "dossier_id" },
  );

  return NextResponse.json(besparing);
}
