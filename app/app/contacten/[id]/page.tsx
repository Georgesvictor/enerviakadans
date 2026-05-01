import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Mail, Phone, Building2, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("contacts")
    .select("*, companies(id, naam)")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!data) notFound();

  // Gekoppelde deals + dossiers
  const [dealsRes, dossierRes] = await Promise.all([
    supabase
      .from("deals")
      .select("id, titel, waarde_excl_btw, status, stage_id, pipeline_stages(naam, kleur)")
      .eq("tenant_id", ctx.tenantId)
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("dossiers")
      .select("id, offerte_referentie, status, created_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("klant_id", data.klant_legacy_id ?? "null"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Contact
          </div>
          <h1 className="text-2xl font-bold text-enervia-700">
            {data.voornaam} {data.achternaam}
          </h1>
          {data.functie && (
            <div className="text-muted-foreground">{data.functie}</div>
          )}
        </div>
        <Link
          href="/app/contacten"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Terug naar lijst
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-white rounded-lg border p-4 space-y-2 md:col-span-1">
          <h2 className="text-sm font-semibold text-enervia-700">Gegevens</h2>
          {data.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} className="text-muted-foreground" />
              <a href={`mailto:${data.email}`} className="hover:underline">
                {data.email}
              </a>
            </div>
          )}
          {data.telefoon && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-muted-foreground" />
              {data.telefoon}
            </div>
          )}
          {data.gsm && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-muted-foreground" />
              {data.gsm}
            </div>
          )}
          {data.companies?.naam && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 size={14} className="text-muted-foreground" />
              {data.companies.naam}
            </div>
          )}
          {(data.adres_straat || data.gemeente) && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-muted-foreground mt-0.5" />
              <div>
                {data.adres_straat} {data.adres_nummer}
                <br />
                {data.postcode} {data.gemeente}
                {data.land && `, ${data.land}`}
              </div>
            </div>
          )}
          {data.beschrijving && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1">Notities</div>
              <div className="text-sm whitespace-pre-wrap">{data.beschrijving}</div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-enervia-700 mb-3">Deals</h2>
          {!dealsRes.data || dealsRes.data.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nog geen deals gekoppeld.{" "}
              <Link
                href={`/app/deals/nieuw?contact_id=${id}`}
                className="text-enervia-600 hover:underline"
              >
                + Nieuwe deal
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {dealsRes.data.map((d: any) => (
                <li key={d.id} className="py-2 flex items-center justify-between">
                  <Link
                    href={`/app/deals/${d.id}`}
                    className="text-enervia-700 hover:underline"
                  >
                    {d.titel}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {d.pipeline_stages?.naam} · €{" "}
                    {Number(d.waarde_excl_btw ?? 0).toLocaleString("nl-BE", {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {dossierRes.data && dossierRes.data.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h2 className="text-sm font-semibold text-enervia-700 mb-3">
                Renovatie-dossiers
              </h2>
              <ul className="divide-y">
                {dossierRes.data.map((d: any) => (
                  <li
                    key={d.id}
                    className="py-2 flex items-center justify-between"
                  >
                    <Link
                      href={`/dashboard/dossiers/${d.id}`}
                      className="text-enervia-700 hover:underline"
                    >
                      {d.offerte_referentie ?? d.id.slice(0, 8)}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {d.status}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
