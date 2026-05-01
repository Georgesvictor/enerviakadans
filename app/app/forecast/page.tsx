/**
 * Forecast: gewogen omzet per maand voor open deals.
 * Formule: som(deal.waarde * (deal.slaagkans ?? stage.waarschijnlijkheid) / 100)
 * gegroepeerd per maand op basis van verwacht_afgesloten.
 */

import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { TrendingUp, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const { data: deals } = await supabase
    .from("deals")
    .select(
      "id, titel, waarde_excl_btw, slaagkans, verwacht_afgesloten, eigenaar_id, pipeline_stages(waarschijnlijkheid, categorie), contacts(voornaam, achternaam), companies(naam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "open")
    .order("verwacht_afgesloten", { ascending: true, nullsFirst: false });

  const open = (deals ?? []) as any[];

  // Bouw 12 maanden vooruit
  const maanden: { key: string; label: string; deals: any[]; gewogen: number; totaal: number }[] =
    [];
  const nu = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(nu.getFullYear(), nu.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    maanden.push({
      key,
      label: d.toLocaleDateString("nl-BE", { year: "numeric", month: "long" }),
      deals: [],
      gewogen: 0,
      totaal: 0,
    });
  }
  const noDateBucket = {
    key: "no-date",
    label: "Geen beslissingsdatum",
    deals: [] as any[],
    gewogen: 0,
    totaal: 0,
  };

  for (const d of open) {
    const slaagkans = Number(
      d.slaagkans ?? d.pipeline_stages?.waarschijnlijkheid ?? 0,
    );
    const waarde = Number(d.waarde_excl_btw ?? 0);
    const gewogen = (waarde * slaagkans) / 100;

    if (!d.verwacht_afgesloten) {
      noDateBucket.deals.push(d);
      noDateBucket.gewogen += gewogen;
      noDateBucket.totaal += waarde;
      continue;
    }
    const dt = new Date(d.verwacht_afgesloten);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const m = maanden.find((m) => m.key === key);
    if (m) {
      m.deals.push(d);
      m.gewogen += gewogen;
      m.totaal += waarde;
    }
  }

  const totaalGewogen = maanden.reduce((s, m) => s + m.gewogen, 0);
  const totaalGewogenPlusNoDate =
    totaalGewogen + noDateBucket.gewogen;
  const maxGewogen = Math.max(...maanden.map((m) => m.gewogen), 1);

  const f = (n: number) =>
    `€ ${n.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enervia-700">Forecast</h1>
        <p className="text-muted-foreground text-sm">
          Verwachte omzet (gewogen op slaagkans) over de komende 12 maanden.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Open deals
          </div>
          <div className="text-2xl font-bold text-enervia-700 mt-1">
            {open.length.toLocaleString("nl-BE")}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Gewogen 12 maanden
          </div>
          <div className="text-2xl font-bold text-enervia-700 mt-1">
            {f(totaalGewogen)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Gewogen totaal (incl. zonder datum)
          </div>
          <div className="text-2xl font-bold text-accent-400 mt-1">
            {f(totaalGewogenPlusNoDate)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5">
        <h2 className="font-semibold text-enervia-700 mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> Gewogen omzet per maand
        </h2>
        <div className="space-y-2">
          {maanden.map((m) => (
            <div key={m.key} className="flex items-center gap-3">
              <div className="w-32 text-sm capitalize">{m.label}</div>
              <div className="flex-1 bg-muted/30 rounded h-8 relative overflow-hidden">
                <div
                  className="h-full bg-enervia-600 transition-all"
                  style={{
                    width: `${(m.gewogen / maxGewogen) * 100}%`,
                    minWidth: m.gewogen > 0 ? "2px" : "0",
                  }}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono">
                  {m.deals.length} deal{m.deals.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="w-32 text-right font-mono text-sm">
                {f(m.gewogen)}
              </div>
              <div className="w-28 text-right text-xs text-muted-foreground">
                / {f(m.totaal)}
              </div>
            </div>
          ))}
        </div>
        {noDateBucket.deals.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-3 text-amber-700">
            <Calendar size={16} />
            <div className="flex-1 text-sm">
              <strong>{noDateBucket.deals.length}</strong> deals zonder
              beslissingsdatum (gewogen {f(noDateBucket.gewogen)})
            </div>
            <Link
              href="/app/deals?zonder_datum=1"
              className="text-xs text-enervia-600 hover:underline"
            >
              Bekijk →
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border p-5">
        <h2 className="font-semibold text-enervia-700 mb-3">
          Top deals per maand
        </h2>
        <div className="space-y-4">
          {maanden
            .filter((m) => m.deals.length > 0)
            .slice(0, 6)
            .map((m) => (
              <div key={m.key}>
                <div className="text-sm font-semibold capitalize text-enervia-700 mb-1">
                  {m.label}
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {m.deals.slice(0, 5).map((d: any) => (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="py-1.5">
                          <Link
                            href={`/app/deals/${d.id}`}
                            className="text-enervia-700 hover:underline"
                          >
                            {d.titel}
                          </Link>
                          {d.companies?.naam && (
                            <span className="text-xs text-muted-foreground ml-2">
                              · {d.companies.naam}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right text-xs">
                          {Math.round(
                            d.slaagkans ??
                              d.pipeline_stages?.waarschijnlijkheid ??
                              0,
                          )}{" "}
                          %
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {f(Number(d.waarde_excl_btw ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
