import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { BedrijfsentiteitenLijst } from "@/components/crm/bedrijfsentiteiten-lijst";

export const dynamic = "force-dynamic";

export default async function BedrijfsentiteitenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data: actief } = await supabase
    .from("business_entities")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("is_actief", true)
    .order("is_default", { ascending: false })
    .order("naam");
  const { data: gedeact } = await supabase
    .from("business_entities")
    .select("id, naam")
    .eq("tenant_id", ctx.tenantId)
    .eq("is_actief", false);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/app/instellingen"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Instellingen
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">
          Bedrijfsentiteiten
        </h1>
        <p className="text-muted-foreground text-sm">
          Beheer hier de juridische entiteiten waaruit je facturen, offertes en
          andere documenten verstuurt.
        </p>
      </div>

      <BedrijfsentiteitenLijst
        actief={(actief as any[]) ?? []}
        gedeactiveerd={(gedeact as any[]) ?? []}
      />
    </div>
  );
}
