import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { UrenDagboek } from "@/components/crm/uren-dagboek";

export const dynamic = "force-dynamic";

export default async function UrenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const vandaag = new Date();
  const vanDatum = new Date();
  vanDatum.setDate(vandaag.getDate() - 30);

  const [entriesRes, projectsRes, tasksRes] = await Promise.all([
    supabase
      .from("time_entries")
      .select(
        "id, datum, minuten, omschrijving, is_factureerbaar, gefactureerd, project_id, task_id, tarief_per_uur, projects(naam), tasks(titel)",
      )
      .eq("tenant_id", ctx.tenantId)
      .eq("user_id", ctx.userId)
      .gte("datum", vanDatum.toISOString().slice(0, 10))
      .order("datum", { ascending: false })
      .limit(200),
    supabase
      .from("projects")
      .select("id, naam, tarief_per_uur")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "lopend")
      .order("naam"),
    supabase
      .from("tasks")
      .select("id, titel, project_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("toegewezen_aan", ctx.userId)
      .neq("status", "afgerond")
      .order("titel"),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Uren</h1>
          <p className="text-muted-foreground text-sm">
            Tijdregistratie per project, gekoppeld aan facturatie.
          </p>
        </div>
      </div>
      <UrenDagboek
        initial={(entriesRes.data as any[]) ?? []}
        projects={(projectsRes.data as any[]) ?? []}
        tasks={(tasksRes.data as any[]) ?? []}
      />
    </div>
  );
}
