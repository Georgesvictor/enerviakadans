import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { NieuweTaakForm } from "@/components/crm/nieuwe-taak-form";

export const dynamic = "force-dynamic";

export default async function NieuweTaakPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string; contact_id?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const [projRes, contactRes, membersRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, naam")
      .eq("tenant_id", ctx.tenantId)
      .order("naam"),
    supabase
      .from("contacts")
      .select("id, voornaam, achternaam")
      .eq("tenant_id", ctx.tenantId)
      .order("achternaam")
      .limit(500),
    supabase
      .from("tenant_members")
      .select("user_id, users(email)")
      .eq("tenant_id", ctx.tenantId),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-enervia-700 mb-6">Nieuwe taak</h1>
      <NieuweTaakForm
        projects={(projRes.data as any[]) ?? []}
        contacts={(contactRes.data as any[]) ?? []}
        members={((membersRes.data as any[]) ?? []).map((m) => ({
          id: m.user_id,
          email: m.users?.email ?? m.user_id,
        }))}
        initialProjectId={sp.project_id}
        initialContactId={sp.contact_id}
        currentUserId={ctx.userId}
      />
    </div>
  );
}
