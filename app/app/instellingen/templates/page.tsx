import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { TemplatesBeheer } from "@/components/crm/templates-beheer";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("document_templates")
    .select("id, naam, type, is_default, inhoud_html, updated_at")
    .eq("tenant_id", ctx.tenantId)
    .order("type")
    .order("is_default", { ascending: false })
    .order("naam");

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link
          href="/app/instellingen"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Instellingen
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">Templates</h1>
        <p className="text-muted-foreground text-sm">
          Begeleidende teksten voor offertes, facturen en e-mails. Gebruik
          merge-tags zoals <code>#DEAL_TITLE</code>, <code>#OFFER_NR</code>,{" "}
          <code>#TODAY</code> die automatisch ingevuld worden bij gebruik.
        </p>
      </div>

      <TemplatesBeheer initial={(data as any[]) ?? []} />
    </div>
  );
}
