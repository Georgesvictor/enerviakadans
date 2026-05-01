import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { DossierDetail } from "@/components/dashboard/dossier-detail";

export const dynamic = "force-dynamic";

export default async function DossierPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { stap?: string };
}) {
  const { userId } = await auth();
  if (!userId) return notFound();

  const supabase = createAdminSupabaseClient();

  // Query alle gerelateerde rijen apart (vermijdt Supabase embedded-join
  // ambiguïteit tussen array/object returntypes).
  const [
    dossierRes,
    klantRes,
    extractieRes,
    paramsRes,
    premieRes,
    leningRes,
    besparingRes,
  ] = await Promise.all([
    supabase.from("dossiers").select("*").eq("id", params.id).single(),
    supabase
      .from("klanten")
      .select("*")
      .eq(
        "id",
        // tussenstap om klant_id uit dossier op te halen
        (
          await supabase
            .from("dossiers")
            .select("klant_id")
            .eq("id", params.id)
            .maybeSingle()
        ).data?.klant_id ?? "00000000-0000-0000-0000-000000000000",
      )
      .maybeSingle(),
    supabase
      .from("offerte_extracties")
      .select("*")
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
  ]);

  const dossier = dossierRes.data;
  if (!dossier) return notFound();
  if (dossier.verkoper_id !== userId) {
    const { data: u } = await supabase
      .from("users")
      .select("rol")
      .eq("id", userId)
      .single();
    if (u?.rol !== "admin") return notFound();
  }

  // Stuur naar client: scalars ipv arrays, plus ook array-versies voor
  // backwards-compat met bestaande components die `.premie?.[0]` verwachten.
  const enriched = {
    ...dossier,
    klant: klantRes.data,
    extractie: extractieRes.data ? [extractieRes.data] : [],
    parameters: paramsRes.data ? [paramsRes.data] : [],
    premie: premieRes.data ? [premieRes.data] : [],
    lening: leningRes.data ? [leningRes.data] : [],
    besparing: besparingRes.data ? [besparingRes.data] : [],
  };

  return (
    <DossierDetail
      dossier={enriched as any}
      initialStap={searchParams.stap ?? "extractie"}
    />
  );
}
