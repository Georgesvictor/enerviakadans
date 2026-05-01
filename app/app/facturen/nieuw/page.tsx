import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { FactuurEditor } from "@/components/crm/factuur-editor";

export const dynamic = "force-dynamic";

export default async function NieuweFactuurPage({
  searchParams,
}: {
  searchParams: Promise<{ offerte?: string; deal_id?: string; contact_id?: string; company_id?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [contactsRes, companiesRes, productsRes, entitiesRes] = await Promise.all([
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
      .select("id, code, naam, prijs_excl_btw, btw_tarief, eenheid")
      .eq("tenant_id", ctx.tenantId)
      .eq("gearchiveerd", false)
      .order("naam")
      .limit(500),
    supabase
      .from("business_entities")
      .select("id, naam, is_default, btw_nummer, iban, betalingstermijn_dagen")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_actief", true)
      .order("is_default", { ascending: false })
      .order("naam"),
  ]);

  // Prefill vanaf offerte óf deal óf querystring
  let initial: any = {
    onderwerp: "",
    contact_id: sp.contact_id ?? null,
    company_id: sp.company_id ?? null,
    deal_id: sp.deal_id ?? null,
    quotation_id: sp.offerte ?? null,
    betalingstermijn_dagen: 30,
    korting_pct: 0,
    regels: [],
  };
  if (sp.offerte) {
    const { data: o } = await supabase
      .from("quotations")
      .select("*, quotation_lines(*)")
      .eq("id", sp.offerte)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (o) {
      initial = {
        onderwerp: `Factuur — ${o.onderwerp}`,
        contact_id: o.contact_id ?? null,
        company_id: o.company_id ?? null,
        deal_id: o.deal_id ?? null,
        quotation_id: o.id,
        betalingstermijn_dagen: 30,
        korting_pct: o.korting_pct ?? 0,
        regels: (o.quotation_lines ?? []).sort((a: any, b: any) => a.volgorde - b.volgorde),
      };
    }
  } else if (sp.deal_id) {
    const { data: d } = await supabase
      .from("deals")
      .select("titel, contact_id, company_id")
      .eq("id", sp.deal_id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (d) {
      initial = {
        ...initial,
        onderwerp: d.titel ?? "",
        contact_id: sp.contact_id ?? d.contact_id ?? null,
        company_id: sp.company_id ?? d.company_id ?? null,
        deal_id: sp.deal_id,
      };
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-enervia-700">Nieuwe factuur</h1>
        <p className="text-muted-foreground text-sm">
          {sp.offerte
            ? "Gemaakt op basis van een offerte. Pas aan waar nodig."
            : "Maak een nieuwe factuur aan."}
        </p>
      </div>
      <FactuurEditor
        contacts={(contactsRes.data as any[]) ?? []}
        companies={(companiesRes.data as any[]) ?? []}
        products={(productsRes.data as any[]) ?? []}
        entities={(entitiesRes.data as any[]) ?? []}
        initial={initial}
      />
    </div>
  );
}
