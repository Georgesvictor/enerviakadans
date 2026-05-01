import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  berekenLening,
  checkMVLGeschiktheid,
  COMMERCIEEL_DEFAULT_RENTE,
} from "@/lib/veka/lening";
import type { KlantParameters } from "@/lib/berekeningen/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminSupabaseClient();

  const body = (await req.json()) as {
    type: "mijnverbouwlening" | "commercieel";
    leenbedrag: number;
    looptijd_jaar: number;
    eigen_inbreng: number;
    /** Optionele override voor commerciële rente */
    rentevoet?: number;
  };

  const [dossierRes, paramsRes] = await Promise.all([
    supabase.from("dossiers").select("id, verkoper_id").eq("id", params.id).single(),
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

  const kparams = paramsRes.data as KlantParameters | undefined;
  if (!kparams) {
    return NextResponse.json({ error: "parameters ontbreken" }, { status: 400 });
  }
  const mvl = checkMVLGeschiktheid(kparams);

  let rente = body.rentevoet ?? COMMERCIEEL_DEFAULT_RENTE;
  if (body.type === "mijnverbouwlening") {
    if (!mvl.geschikt) {
      return NextResponse.json(
        { error: "Niet geschikt voor MVL", mvl },
        { status: 400 },
      );
    }
    rente = mvl.rentevoet;
  }

  const resultaat = berekenLening({
    type: body.type,
    leenbedrag: body.leenbedrag,
    rentevoet_jaarlijks: rente,
    looptijd_jaar: body.looptijd_jaar,
    eigen_inbreng: body.eigen_inbreng,
  });

  await supabase.from("lening_simulaties").upsert(
    {
      dossier_id: params.id,
      type_lening: body.type,
      geschikt_voor_mijnverbouwlening: mvl.geschikt,
      geweigerd_reden: mvl.reden ?? null,
      rentevoet: rente,
      looptijd_jaar: body.looptijd_jaar,
      leenbedrag: body.leenbedrag,
      maandelijkse_afbetaling: resultaat.maandelijkse_afbetaling,
      totale_interestkost: resultaat.totale_interestkost,
      eigen_inbreng: body.eigen_inbreng,
    },
    { onConflict: "dossier_id" },
  );

  return NextResponse.json({ resultaat, mvl });
}
