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
  const { data: dossier, error } = await supabase
    .from("dossiers")
    .select(
      `*,
       klant:klanten(*),
       extractie:offerte_extracties(*),
       parameters:klant_parameters(*),
       premie:premie_simulaties(*),
       lening:lening_simulaties(*),
       besparing:besparing_simulaties(*)`,
    )
    .eq("id", params.id)
    .single();

  if (error || !dossier) return notFound();
  if (dossier.verkoper_id !== userId) {
    const { data: u } = await supabase
      .from("users")
      .select("rol")
      .eq("id", userId)
      .single();
    if (u?.rol !== "admin") return notFound();
  }

  return (
    <DossierDetail
      dossier={dossier as any}
      initialStap={searchParams.stap ?? "extractie"}
    />
  );
}
