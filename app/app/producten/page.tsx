import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("gearchiveerd", false)
    .order("naam")
    .limit(500);

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">
            Producten & diensten
          </h1>
          <p className="text-muted-foreground text-sm">
            Herbruikbare items voor offertes en facturen.
          </p>
        </div>
        <Link
          href="/app/producten/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuw product
        </Link>
      </div>

      {!data || data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Package size={32} className="mx-auto text-muted-foreground mb-2" />
          <div className="text-muted-foreground">Nog geen producten.</div>
          <Link
            href="/app/producten/nieuw"
            className="inline-block mt-3 text-enervia-600 hover:underline"
          >
            + Eerste product toevoegen
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Naam</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Eenheid</th>
                <th className="text-right px-4 py-3">Prijs (excl.)</th>
                <th className="text-right px-4 py-3">BTW</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                    {p.code ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/producten/${p.id}`}
                      className="font-medium text-enervia-700 hover:underline"
                    >
                      {p.naam}
                    </Link>
                    {p.beschrijving && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {p.beschrijving}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{p.type}</td>
                  <td className="px-4 py-3 text-xs">{p.eenheid}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {f(p.prijs_excl_btw)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {(Number(p.btw_tarief) * 100).toFixed(0)} %
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
