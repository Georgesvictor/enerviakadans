import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { DocumentActies } from "@/components/crm/document-acties";

export const dynamic = "force-dynamic";

export default async function FactuurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("invoices")
    .select(
      "*, contacts(id,voornaam,achternaam,email), companies(id,naam,btw_nummer,adres_straat,adres_nummer,postcode,gemeente), invoice_lines(*)",
    )
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!data) notFound();

  const regels = ((data.invoice_lines as any[]) ?? []).sort(
    (a, b) => a.volgorde - b.volgorde,
  );
  const openstaand =
    Number(data.totaal_incl_btw) - Number(data.reeds_betaald ?? 0);

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Factuur {data.nummer ?? ""}
          </div>
          <h1 className="text-2xl font-bold text-enervia-700">
            {data.onderwerp}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{data.status}</Badge>
            {data.peppol_status && data.peppol_status !== "niet_verzonden" && (
              <Badge variant="outline">Peppol: {data.peppol_status}</Badge>
            )}
          </div>
        </div>
        <DocumentActies id={id} type="factuur" nummer={data.nummer} canPeppol />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">Totaal</div>
          <div className="text-xl font-bold text-enervia-700 mt-1">
            {f(data.totaal_incl_btw)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Reeds betaald
          </div>
          <div className="text-xl font-bold text-green-700 mt-1">
            {f(data.reeds_betaald ?? 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Openstaand
          </div>
          <div
            className={`text-xl font-bold mt-1 ${
              openstaand > 0 ? "text-accent-400" : "text-enervia-700"
            }`}
          >
            {f(openstaand)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Vervaldatum
          </div>
          <div className="text-xl font-bold text-enervia-700 mt-1">
            {data.vervaldatum
              ? new Date(data.vervaldatum).toLocaleDateString("nl-BE")
              : "—"}
          </div>
        </div>
      </div>

      {data.gestructureerde_mededeling && (
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground mb-1">
            Gestructureerde mededeling voor overschrijving
          </div>
          <div className="font-mono text-lg text-enervia-700">
            {data.gestructureerde_mededeling}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Omschrijving</th>
              <th className="text-right px-4 py-3">Aantal</th>
              <th className="text-right px-4 py-3">Prijs</th>
              <th className="text-right px-4 py-3">BTW</th>
              <th className="text-right px-4 py-3">Subtotaal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {regels.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.omschrijving}</td>
                <td className="px-4 py-3 text-right">
                  {r.aantal} {r.eenheid}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {f(r.prijs_excl_btw)}
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  {(Number(r.btw_tarief) * 100).toFixed(0)} %
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {f(r.subtotaal_excl_btw)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30 border-t">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">
                Subtotaal excl. btw
              </td>
              <td className="px-4 py-2 text-right font-mono">
                {f(data.subtotaal_excl_btw)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">
                BTW
              </td>
              <td className="px-4 py-2 text-right font-mono">
                {f(data.totaal_btw)}
              </td>
            </tr>
            <tr className="bg-enervia-50 font-bold text-enervia-700">
              <td colSpan={4} className="px-4 py-3 text-right">
                Totaal incl. btw
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {f(data.totaal_incl_btw)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
