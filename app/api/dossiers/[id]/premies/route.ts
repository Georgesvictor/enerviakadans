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

  const { data: dossier } = await supabase
    .from("dossiers")
    .select(`id, verkoper_id, extractie:offerte_extracties(gestructureerde_data), parameters:klant_parameters(*)`)
    .eq("id", params.id)
    .single();

  if (!dossier || dossier.verkoper_id !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const extractie = (dossier.extractie as any)?.[0]?.gestructureerde_data as OfferteExtractie;
  const kparams = (dossier.parameters as any)?.[0] as KlantParameters;
  if (!extractie || !kparams) {
    return NextResponse.json(
      { error: "extractie of parameters ontbreken" },
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
