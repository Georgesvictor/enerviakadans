import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Globe, MapPin, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BedrijfDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [bedrijfRes, contactenRes, dealsRes] = await Promise.all([
    supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    supabase
      .from("contacts")
      .select("id, voornaam, achternaam, functie, email, telefoon")
      .eq("company_id", id)
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("deals")
      .select(
        "id, titel, waarde_excl_btw, status, stage_id, pipeline_stages(naam)",
      )
      .eq("company_id", id)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false }),
  ]);

  const c = bedrijfRes.data;
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Bedrijf
          </div>
          <h1 className="text-2xl font-bold text-enervia-700">{c.naam}</h1>
          <div className="flex items-center gap-2 mt-2">
            {c.is_klant && (
              <Badge className="bg-enervia-50 text-enervia-700 border border-enervia-600/30">
                Klant
              </Badge>
            )}
            {c.is_leverancier && <Badge variant="outline">Leverancier</Badge>}
          </div>
        </div>
        <Link
          href="/app/bedrijven"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Terug naar lijst
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-white rounded-lg border p-4 space-y-2">
          <h2 className="text-sm font-semibold text-enervia-700">Gegevens</h2>
          {c.btw_nummer && (
            <div className="text-sm">
              <span className="text-muted-foreground">BTW: </span>
              {c.btw_nummer}
            </div>
          )}
          {c.iban && (
            <div className="text-sm">
              <span className="text-muted-foreground">IBAN: </span>
              {c.iban}
            </div>
          )}
          {c.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe size={14} className="text-muted-foreground" />
              <a
                href={c.website}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {c.website}
              </a>
            </div>
          )}
          {c.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} className="text-muted-foreground" />
              <a href={`mailto:${c.email}`} className="hover:underline">
                {c.email}
              </a>
            </div>
          )}
          {c.telefoon && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-muted-foreground" />
              {c.telefoon}
            </div>
          )}
          {(c.adres_straat || c.gemeente) && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-muted-foreground mt-0.5" />
              <div>
                {c.adres_straat} {c.adres_nummer}
                <br />
                {c.postcode} {c.gemeente}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-enervia-700">
              Contactpersonen ({contactenRes.data?.length ?? 0})
            </h2>
            <Link
              href={`/app/contacten/nieuw?company_id=${id}`}
              className="text-xs text-enervia-600 hover:underline"
            >
              + Nieuwe contactpersoon
            </Link>
          </div>
          {!contactenRes.data || contactenRes.data.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Geen contactpersonen gekoppeld.
            </div>
          ) : (
            <ul className="divide-y">
              {contactenRes.data.map((p: any) => (
                <li key={p.id} className="py-2 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/app/contacten/${p.id}`}
                      className="text-enervia-700 hover:underline"
                    >
                      {p.voornaam} {p.achternaam}
                    </Link>
                    {p.functie && (
                      <div className="text-xs text-muted-foreground">
                        {p.functie}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.email ?? p.telefoon ?? ""}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {dealsRes.data && dealsRes.data.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h2 className="text-sm font-semibold text-enervia-700 mb-3">
                Deals ({dealsRes.data.length})
              </h2>
              <ul className="divide-y">
                {dealsRes.data.map((d: any) => (
                  <li
                    key={d.id}
                    className="py-2 flex items-center justify-between"
                  >
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
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
