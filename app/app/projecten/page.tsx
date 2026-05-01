import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProjectenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, naam, code, status, start_datum, deadline, budget_excl_btw, companies(naam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Projecten</h1>
          <p className="text-muted-foreground text-sm">
            Werfopvolging, milestones en uren per klant.
          </p>
        </div>
        <Link
          href="/app/projecten/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuw project
        </Link>
      </div>
      {!data || data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Briefcase size={32} className="mx-auto text-muted-foreground mb-2" />
          <div className="text-muted-foreground">Nog geen projecten.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p: any) => (
            <Link
              key={p.id}
              href={`/app/projecten/${p.id}`}
              className="bg-white rounded-lg border p-4 hover:border-enervia-600 hover:shadow transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-enervia-700 truncate">
                    {p.naam}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.code ?? ""} {p.companies?.naam ? `· ${p.companies.naam}` : ""}
                  </div>
                </div>
                <Badge>{p.status}</Badge>
              </div>
              {p.deadline && (
                <div className="text-xs text-muted-foreground mt-3">
                  Deadline: {new Date(p.deadline).toLocaleDateString("nl-BE")}
                </div>
              )}
              {p.budget_excl_btw && (
                <div className="text-xs text-muted-foreground">
                  Budget: €{" "}
                  {Number(p.budget_excl_btw).toLocaleString("nl-BE", {
                    maximumFractionDigits: 0,
                  })}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
