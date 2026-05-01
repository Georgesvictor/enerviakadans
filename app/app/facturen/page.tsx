import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_KLEUR: Record<string, string> = {
  concept: "bg-slate-100 text-slate-700",
  verzonden: "bg-blue-100 text-blue-700",
  deels_betaald: "bg-amber-100 text-amber-700",
  betaald: "bg-green-100 text-green-700",
  vervallen: "bg-red-100 text-red-700",
  geannuleerd: "bg-gray-100 text-gray-500",
};

export default async function FacturenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "id, nummer, onderwerp, status, datum, vervaldatum, totaal_incl_btw, reeds_betaald, peppol_status, contacts(voornaam,achternaam), companies(naam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(200);

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`;

  const totals = (data ?? []).reduce(
    (s: any, i: any) => {
      const openstaand =
        Number(i.totaal_incl_btw) - Number(i.reeds_betaald ?? 0);
      if (i.status !== "betaald" && i.status !== "geannuleerd") {
        s.openstaand += openstaand;
      }
      if (
        i.status === "vervallen" ||
        (i.vervaldatum && new Date(i.vervaldatum) < new Date() &&
          i.status !== "betaald" && i.status !== "geannuleerd")
      ) {
        s.vervallen += openstaand;
      }
      return s;
    },
    { openstaand: 0, vervallen: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Facturen</h1>
          <p className="text-muted-foreground text-sm">
            Openstaand: <strong>{f(totals.openstaand)}</strong> · Vervallen:{" "}
            <strong className="text-red-600">{f(totals.vervallen)}</strong>
          </p>
        </div>
        <Link
          href="/app/facturen/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuwe factuur
        </Link>
      </div>

      {!data || data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Receipt size={32} className="mx-auto text-muted-foreground mb-2" />
          <div className="text-muted-foreground">Nog geen facturen.</div>
          <Link
            href="/app/facturen/nieuw"
            className="inline-block mt-3 text-enervia-600 hover:underline"
          >
            + Eerste factuur opmaken
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
                <th className="text-left px-4 py-3">Vervaldatum</th>
                <th className="text-right px-4 py-3">Totaal</th>
                <th className="text-right px-4 py-3">Openstaand</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Peppol</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((o: any) => {
                const open = Number(o.totaal_incl_btw) - Number(o.reeds_betaald ?? 0);
                const vervallen =
                  o.vervaldatum && new Date(o.vervaldatum) < new Date() &&
                  o.status !== "betaald" && o.status !== "geannuleerd";
                return (
                  <tr key={o.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">
                      {o.nummer ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/facturen/${o.id}`}
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
                    <td
                      className={`px-4 py-3 text-xs ${
                        vervallen ? "text-red-600 font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {o.vervaldatum
                        ? new Date(o.vervaldatum).toLocaleDateString("nl-BE")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {f(o.totaal_incl_btw ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {open > 0 ? f(open) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={STATUS_KLEUR[o.status] ?? "bg-slate-100"}
                      >
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {o.peppol_status ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
