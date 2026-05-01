import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { BestelbonEditor } from "@/components/crm/bestelbon-editor";

export const dynamic = "force-dynamic";

export default async function NieuweBestelbonPage({
  searchParams,
}: {
  searchParams: Promise<{ deal_id?: string; project_id?: string; leverancier_id?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  let dealOnderwerp = "";
  if (sp.deal_id) {
    const { data } = await supabase
      .from("deals")
      .select("titel")
      .eq("id", sp.deal_id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    dealOnderwerp = data?.titel ?? "";
  }

  const [companiesRes, productsRes, entitiesRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, naam")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_leverancier", true)
      .order("naam"),
    supabase
      .from("products")
      .select("id, code, naam, aankoop_prijs, prijs_excl_btw, btw_tarief, eenheid")
      .eq("tenant_id", ctx.tenantId)
      .eq("gearchiveerd", false)
      .order("naam"),
    supabase
      .from("business_entities")
      .select("id, naam, is_default, btw_nummer")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_actief", true)
      .order("is_default", { ascending: false })
      .order("naam"),
  ]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-enervia-700">Nieuwe bestelbon</h1>
        <p className="text-muted-foreground text-sm">
          Inkoop bij leverancier voor {dealOnderwerp ? `deal "${dealOnderwerp}"` : "een deal"}.
        </p>
      </div>
      <BestelbonEditor
        leveranciers={(companiesRes.data as any[]) ?? []}
        products={(productsRes.data as any[]) ?? []}
        entities={(entitiesRes.data as any[]) ?? []}
        initial={{
          onderwerp: dealOnderwerp ? `Bestelbon — ${dealOnderwerp}` : "",
          deal_id: sp.deal_id ?? null,
          project_id: sp.project_id ?? null,
          leverancier_id: sp.leverancier_id ?? null,
          business_entity_id: null,
          regels: [],
        }}
      />
    </div>
  );
}
