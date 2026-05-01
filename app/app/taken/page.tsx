import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { TakenLijst } from "@/components/crm/taken-lijst";

export const dynamic = "force-dynamic";

export default async function TakenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .select(
      "id, titel, status, prioriteit, deadline, toegewezen_aan, projects(naam), contacts(voornaam,achternaam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(300);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Taken</h1>
          <p className="text-muted-foreground text-sm">
            Opvolgtaken met deadlines en prioriteiten.
          </p>
        </div>
        <Link
          href="/app/taken/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuwe taak
        </Link>
      </div>
      <TakenLijst initial={(data as any[]) ?? []} huidigeUser={ctx.userId} />
    </div>
  );
}
