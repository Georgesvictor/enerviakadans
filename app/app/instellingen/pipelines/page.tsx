import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { PipelineBeheer } from "@/components/crm/pipeline-beheer";

export const dynamic = "force-dynamic";

export default async function PipelinesInstellingen() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("pipelines")
    .select(
      "id, naam, is_default, gearchiveerd, pipeline_stages(id, naam, volgorde, waarschijnlijkheid, kleur, categorie, is_won, is_lost, rotting_dagen)",
    )
    .eq("tenant_id", ctx.tenantId)
    .eq("gearchiveerd", false)
    .order("volgorde");

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
          Pipelines
        </h1>
        <p className="text-muted-foreground text-sm">
          Verkoop-fases met 3 categorieën: <strong className="text-blue-600">Voor verkoop</strong>,{" "}
          <strong className="text-emerald-600">In verkoop</strong>,{" "}
          <strong className="text-red-600">Geweigerd/Verloren</strong>.
        </p>
      </div>

      <PipelineBeheer pipelines={(data as any[]) ?? []} />
    </div>
  );
}
