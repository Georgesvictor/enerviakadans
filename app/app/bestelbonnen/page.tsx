import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BestelbonnenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select(
      "id, nummer, onderwerp, status, datum, verwachte_levering, totaal_incl_btw, companies:leverancier_id(naam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(200);

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Bestelbonnen</h1>
          <p className="text-muted-foreground text-sm">
            Inkoop bij leveranciers (purchase orders).
          </p>
        </div>
        <Link
          href="/app/bestelbonnen/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuwe bestelbon
        </Link>
      </div>

      {!data || data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Package size={32} className="mx-auto text-muted-foreground mb-2" />
          <div className="text-muted-foreground">Nog geen bestelbonnen.</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nr</th>
                <th className="text-left px-4 py-3">Onderwerp</th>
                <th className="text-left px-4 py-3">Leverancier</th>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Levering</th>
                <th className="text-right px-4 py-3">Bedrag</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">
                    {p.nummer ?? "—"}
                  </td>
                  <td className="px-4 py-3">{p.onderwerp}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.companies?.naam ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(p.datum).toLocaleDateString("nl-BE")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.verwachte_levering
                      ? new Date(p.verwachte_levering).toLocaleDateString("nl-BE")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {f(p.totaal_incl_btw ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
