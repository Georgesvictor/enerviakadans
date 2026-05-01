import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_KLEUR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  verzonden: "bg-blue-100 text-blue-700",
  bekeken: "bg-cyan-100 text-cyan-700",
  geaccepteerd: "bg-green-100 text-green-700",
  afgewezen: "bg-red-100 text-red-700",
  verlopen: "bg-amber-100 text-amber-700",
};

export default async function OffertesPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("quotations")
    .select(
      "id, nummer, onderwerp, status, datum, geldig_tot, totaal_incl_btw, contacts(voornaam,achternaam), companies(naam)",
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
          <h1 className="text-2xl font-bold text-enervia-700">Offertes</h1>
          <p className="text-muted-foreground text-sm">
            Alle uitgebrachte en ontvangen offertes.
          </p>
        </div>
        <Link
          href="/app/offertes/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuwe offerte
        </Link>
      </div>

      {!data || data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <FileText size={32} className="mx-auto text-muted-foreground mb-2" />
          <div className="text-muted-foreground">Nog geen offertes.</div>
          <Link
            href="/app/offertes/nieuw"
            className="inline-block mt-3 text-enervia-600 hover:underline"
          >
            + Eerste offerte opmaken
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nummer</th>
                <th className="text-left px-4 py-3">Onderwerp</th>
                <th className="text-left px-4 py-3">Klant</th>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-right px-4 py-3">Totaal</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((o: any) => (
                <tr key={o.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">
                    {o.nummer ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/offertes/${o.id}`}
                      className="font-medium text-enervia-700 hover:underline"
                    >
                      {o.onderwerp}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {o.companies?.naam ??
                      (o.contacts
                        ? `${o.contacts.voornaam} ${o.contacts.achternaam}`
                        : "—")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(o.datum).toLocaleDateString("nl-BE")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {f(o.totaal_incl_btw ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_KLEUR[o.status] ?? "bg-slate-100"}>
                      {o.status}
                    </Badge>
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
