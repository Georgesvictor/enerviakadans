import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { OfferteEditor } from "@/components/crm/offerte-editor";

export const dynamic = "force-dynamic";

export default async function BewerkOffertePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const { data: q } = await supabase
    .from("quotations")
    .select("*, quotation_lines(*)")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!q) notFound();

  const [contactsRes, companiesRes, productsRes, dealsRes, templatesRes, entitiesRes] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id, voornaam, achternaam")
        .eq("tenant_id", ctx.tenantId)
        .order("achternaam")
        .limit(500),
      supabase
        .from("companies")
        .select("id, naam")
        .eq("tenant_id", ctx.tenantId)
        .order("naam")
        .limit(500),
      supabase
        .from("products")
        .select("id, code, naam, beschrijving, prijs_excl_btw, aankoop_prijs, btw_tarief, eenheid")
        .eq("tenant_id", ctx.tenantId)
        .eq("gearchiveerd", false)
        .order("naam")
        .limit(500),
      supabase
        .from("deals")
        .select("id, titel")
        .eq("tenant_id", ctx.tenantId)
        .order("laatste_activiteit", { ascending: false })
        .limit(100),
      supabase
        .from("document_templates")
        .select("id, naam, inhoud_html, is_default")
        .eq("tenant_id", ctx.tenantId)
        .eq("type", "offerte")
        .order("is_default", { ascending: false }),
      supabase
        .from("business_entities")
        .select("id, naam, is_default, btw_nummer, iban, betalingstermijn_dagen")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_actief", true)
        .order("is_default", { ascending: false })
        .order("naam"),
    ]);

  const regels = ((q.quotation_lines as any[]) ?? []).sort(
    (a, b) => a.volgorde - b.volgorde,
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/app/offertes/${id}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Terug naar offerte
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">
          Offerte bewerken — {q.nummer ?? ""}
        </h1>
      </div>
      <OfferteEditor
        mode="edit"
        id={id}
        contacts={(contactsRes.data as any[]) ?? []}
        companies={(companiesRes.data as any[]) ?? []}
        products={(productsRes.data as any[]) ?? []}
        deals={(dealsRes.data as any[]) ?? []}
        templates={(templatesRes.data as any[]) ?? []}
        entities={(entitiesRes.data as any[]) ?? []}
        initial={{
          onderwerp: q.onderwerp ?? "",
          contact_id: q.contact_id,
          company_id: q.company_id,
          deal_id: q.deal_id,
          business_entity_id: q.business_entity_id,
          geldig_tot: q.geldig_tot,
          template_id: q.template_id,
          begeleidende_tekst_html: q.begeleidende_tekst_html,
          opmerkingen: q.opmerkingen,
          voorwaarden: q.voorwaarden,
          korting_pct: q.korting_pct ?? 0,
          inclusief_btw: q.inclusief_btw ?? false,
          regels: regels as any[],
        }}
      />
    </div>
  );
}
