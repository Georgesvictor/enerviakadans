import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { WorkflowsBeheer } from "@/components/crm/workflows-beheer";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const [rulesRes, runsRes] = await Promise.all([
    supabase
      .from("workflow_rules")
      .select(
        "id, naam, beschrijving, trigger, filter_jsonb, acties_jsonb, is_actief, uitgevoerd_count, laatst_uitgevoerd_op",
      )
      .eq("tenant_id", ctx.tenantId)
      .order("trigger")
      .order("naam"),
    supabase
      .from("workflow_runs")
      .select("id, rule_id, trigger, resultaat, acties_uitgevoerd, created_at")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link
          href="/app/instellingen"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Instellingen
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">
          Workflow-automatisering
        </h1>
        <p className="text-muted-foreground text-sm">
          Maak regels die automatisch acties uitvoeren wanneer iets gebeurt:
          taken aanmaken bij gewonnen deal, projecten genereren, notities
          loggen, status wijzigen, ...
        </p>
      </div>

      <WorkflowsBeheer
        rules={(rulesRes.data as any[]) ?? []}
        recentRuns={(runsRes.data as any[]) ?? []}
      />
    </div>
  );
}
