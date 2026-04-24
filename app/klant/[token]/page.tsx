import { notFound } from "next/navigation";
import Image from "next/image";
import { headers } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { KlantPortalInhoud } from "@/components/klantportal/klant-portal-inhoud";

export const dynamic = "force-dynamic";

export default async function KlantPortal({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createAdminSupabaseClient();
  const { data: dossier } = await supabase
    .from("dossiers")
    .select(
      `id, klant_token, klant_token_expires_at,
       klant:klanten(voornaam, achternaam),
       extractie:offerte_extracties(gestructureerde_data),
       premie:premie_simulaties(*),
       lening:lening_simulaties(*),
       besparing:besparing_simulaties(*)`,
    )
    .eq("klant_token", params.token)
    .single();

  if (!dossier) return notFound();

  const expires = new Date(dossier.klant_token_expires_at!);
  if (expires.getTime() < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-enervia-500">
            Deze link is verlopen
          </h1>
          <p className="text-muted-foreground mt-2">
            Vraag je Enervia-contactpersoon om een nieuwe link.
          </p>
        </div>
      </div>
    );
  }

  // Audit: log view
  const h = headers();
  await supabase.from("audit_log").insert({
    dossier_id: dossier.id,
    actie: "klantportal_view",
    ip_address: h.get("x-forwarded-for") ?? null,
    metadata: { user_agent: h.get("user-agent") },
  });

  return (
    <div className="min-h-screen bg-enervia-50">
      <header className="bg-white border-b border-enervia-100 px-6 py-4 flex items-center justify-between">
        <Image src="/enervia-logo.svg" alt="Enervia" width={160} height={32} />
        <div className="text-sm text-muted-foreground">
          Jouw persoonlijke simulatie
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        <KlantPortalInhoud dossier={dossier as any} />
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Enervia BV · info@enervia.be · 03 808 8666 · Deze simulatie is indicatief.
      </footer>
    </div>
  );
}
