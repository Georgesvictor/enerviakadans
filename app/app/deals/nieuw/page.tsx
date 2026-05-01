import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { NieuwDealForm } from "@/components/crm/nieuw-deal-form";

export const dynamic = "force-dynamic";

export default async function NieuweDealPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; contact_id?: string; company_id?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [pipelinesRes, contactsRes, companiesRes] = await Promise.all([
    supabase
      .from("pipelines")
      .select("id, naam, is_default, pipeline_stages(id,naam,volgorde)")
      .eq("tenant_id", ctx.tenantId)
      .eq("gearchiveerd", false)
      .order("volgorde"),
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
  ]);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-enervia-700">Nieuwe deal</h1>
        <p className="text-muted-foreground text-sm">
          Voeg een nieuwe verkoopkans toe aan een pipeline.
        </p>
      </div>
      <NieuwDealForm
        pipelines={(pipelinesRes.data as any[]) ?? []}
        contacts={(contactsRes.data as any[]) ?? []}
        companies={(companiesRes.data as any[]) ?? []}
        initialContactId={sp.contact_id}
        initialCompanyId={sp.company_id}
        initialPipelineId={sp.pipeline}
      />
    </div>
  );
}
