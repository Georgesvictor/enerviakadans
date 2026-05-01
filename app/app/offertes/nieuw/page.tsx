import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { OfferteEditor } from "@/components/crm/offerte-editor";

export const dynamic = "force-dynamic";

export default async function NieuweOffertePage({
  searchParams,
}: {
  searchParams: Promise<{ deal_id?: string; contact_id?: string; company_id?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  // Als deal_id gezet → haal deal op om klant + onderwerp te prefillen
  let dealPrefill: {
    contact_id: string | null;
    company_id: string | null;
    onderwerp: string;
  } | null = null;
  if (sp.deal_id) {
    const { data } = await supabase
      .from("deals")
      .select("titel, contact_id, company_id")
      .eq("id", sp.deal_id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (data) {
      dealPrefill = {
        contact_id: data.contact_id,
        company_id: data.company_id,
        onderwerp: data.titel ?? "",
      };
    }
  }

  const [contactsRes, companiesRes, productsRes, dealsRes, templatesRes, entitiesRes] = await Promise.all([
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
      .select("id, naam, is_default")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_actief", true)
      .order("is_default", { ascending: false })
      .order("naam"),
  ]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-enervia-700">Nieuwe offerte</h1>
        <p className="text-muted-foreground text-sm">
          {dealPrefill
            ? `Op basis van deal "${dealPrefill.onderwerp}" — klant automatisch ingevuld.`
            : "Maak een nieuwe offerte aan met lijnen uit je productcatalogus."}
        </p>
      </div>
      <OfferteEditor
        mode="create"
        contacts={(contactsRes.data as any[]) ?? []}
        companies={(companiesRes.data as any[]) ?? []}
        products={(productsRes.data as any[]) ?? []}
        deals={(dealsRes.data as any[]) ?? []}
        templates={(templatesRes.data as any[]) ?? []}
        entities={(entitiesRes.data as any[]) ?? []}
        initial={{
          onderwerp: dealPrefill?.onderwerp ?? "",
          contact_id: sp.contact_id ?? dealPrefill?.contact_id ?? null,
          company_id: sp.company_id ?? dealPrefill?.company_id ?? null,
          deal_id: sp.deal_id ?? null,
          regels: [],
          korting_pct: 0,
        }}
      />
    </div>
  );
}
