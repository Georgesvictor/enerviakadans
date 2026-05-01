import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { NieuwProjectForm } from "@/components/crm/nieuw-project-form";

export const dynamic = "force-dynamic";

export default async function NieuwProjectPage({
  searchParams,
}: {
  searchParams: Promise<{
    deal_id?: string;
    contact_id?: string;
    company_id?: string;
  }>;
}) {
  const sp = await searchParams;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  let dealPrefill: {
    naam: string;
    contact_id: string | null;
    company_id: string | null;
    deal_id: string;
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
        naam: data.titel ?? "",
        contact_id: data.contact_id,
        company_id: data.company_id,
        deal_id: sp.deal_id,
      };
    }
  }

  const [contactsRes, companiesRes] = await Promise.all([
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
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-enervia-700 mb-1">Nieuw project</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {dealPrefill
          ? `Op basis van deal "${dealPrefill.naam}" — klant + naam automatisch ingevuld.`
          : "Projectdossier met fases, uren en bestanden."}
      </p>
      <NieuwProjectForm
        contacts={(contactsRes.data as any[]) ?? []}
        companies={(companiesRes.data as any[]) ?? []}
        initialNaam={dealPrefill?.naam ?? ""}
        initialContactId={
          sp.contact_id ?? dealPrefill?.contact_id ?? undefined
        }
        initialCompanyId={
          sp.company_id ?? dealPrefill?.company_id ?? undefined
        }
        initialDealId={sp.deal_id}
      />
    </div>
  );
}
