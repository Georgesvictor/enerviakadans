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

  const [dossierRes, extractieRes, paramsRes, premiesRes] = await Promise.all([
    supabase.from("dossiers").select("id, verkoper_id").eq("id", params.id).single(),
    supabase
      .from("offerte_extracties")
      .select("gestructureerde_data")
      .eq("dossier_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("klant_parameters")
      .select("*")
      .eq("dossier_id", params.id)
      .maybeSingle(),
    supabase
      .from("premie_simulaties")
      .select("premies_jsonb")
      .eq("dossier_id", params.id)
      .maybeSingle(),
  ]);

  const dossier = dossierRes.data;
  if (!dossier || dossier.verkoper_id !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const extractie = extractieRes.data?.gestructureerde_data as OfferteExtractie | undefined;
  const kparams = paramsRes.data as KlantParameters | undefined;
  if (!extractie || !kparams) {
    return NextResponse.json({ error: "extractie/params ontbreken" }, { status: 400 });
  }

  const prijzen = await getActueleEnergieprijzen();
  const premies = premiesRes.data?.premies_jsonb as any;

  const besparing = berekenTotaleBesparing({
    extractie,
    parameters: kparams,
    prijzen,
    eigen_inbreng: body.eigen_inbreng,
    jaarlijkse_prijsstijging: body.prijsstijging,
    premies,
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
      ingrepen_jsonb: besparing.ingrepen as any,
      maandelijks_gas_euro: besparing.maandelijkse_besparing_gas_euro,
      maandelijks_elek_euro: besparing.maandelijkse_besparing_elek_euro,
      maandelijks_totaal_euro: besparing.maandelijkse_besparing_totaal_euro,
      co2_reductie_kg_jaar: besparing.co2_reductie_kg_jaar,
      epc_kwh_m2_voor: besparing.epc_kwh_m2_voor,
      epc_kwh_m2_na: besparing.epc_kwh_m2_na,
      epc_label_verwacht: besparing.epc_label_verwacht,
    },
    { onConflict: "dossier_id" },
  );

  return NextResponse.json(besparing);
}
