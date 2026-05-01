import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { berekenPremies } from "@/lib/veka/premies";
import type { KlantParameters, OfferteExtractie } from "@/lib/berekeningen/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminSupabaseClient();

  // Query dossier, extractie en parameters apart → vermijdt Supabase-
  // embedded-relation ambiguïteit (array vs object).
  const [dossierRes, extractieRes, paramsRes] = await Promise.all([
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
  ]);

  const dossier = dossierRes.data;
  if (!dossier || dossier.verkoper_id !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const extractie = extractieRes.data?.gestructureerde_data as OfferteExtractie | undefined;
  const kparams = paramsRes.data as KlantParameters | undefined;

  if (!extractie || !kparams) {
    return NextResponse.json(
      {
        error: "extractie of parameters ontbreken",
        heeft_extractie: !!extractie,
        heeft_parameters: !!kparams,
      },
      { status: 400 },
    );
  }

  const premies = berekenPremies(extractie, kparams);

  await supabase.from("premie_simulaties").upsert(
    {
      dossier_id: params.id,
      premies_jsonb: premies as any,
      totaal_premies: premies.totaal,
    },
    { onConflict: "dossier_id" },
  );

  await supabase
    .from("dossiers")
    .update({ status: "compleet" })
    .eq("id", params.id);

  return NextResponse.json(premies);
}
