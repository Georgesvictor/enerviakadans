"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEur } from "@/lib/utils/format";
import { toast } from "@/components/ui/toaster";
import type {
  BesparingResultaat,
  IngreepBesparing,
  EPCImpactNiveau,
} from "@/lib/berekeningen/types";

const niveauLabel: Record<EPCImpactNiveau, string> = {
  geen: "–",
  klein: "Klein",
  middel: "Middel",
  groot: "Groot",
  zeer_groot: "Zeer groot",
};

const niveauKleur: Record<EPCImpactNiveau, string> = {
  geen: "bg-gray-100 text-gray-500",
  klein: "bg-yellow-100 text-yellow-800",
  middel: "bg-orange-100 text-orange-800",
  groot: "bg-green-100 text-green-800",
  zeer_groot: "bg-enervia-50 text-enervia-700 border border-enervia-600",
};

export function StapBesparing({
  dossier,
  onNext,
}: {
  dossier: any;
  onNext: () => void;
}) {
  const existing = dossier.besparing?.[0];
  const [resultaat, setResultaat] = useState<BesparingResultaat | null>(
    existing
      ? ({
          jaarlijkse_besparing_warmtepomp: existing.jaarlijkse_besparing_warmtepomp,
          jaarlijkse_besparing_pv: existing.jaarlijkse_besparing_pv,
          jaarlijkse_besparing_batterij: existing.jaarlijkse_besparing_batterij,
          totale_jaarlijkse_besparing: existing.totale_jaarlijkse_besparing,
          terugverdientijd_jaar: existing.terugverdientijd_jaar,
          projectie_10j: existing.projectie_10j_jsonb ?? [],
          gebruikte_energieprijzen: existing.gebruikte_energieprijzen_jsonb ?? {},
          jaarlijkse_prijsstijging: existing.jaarlijkse_prijsstijging ?? 0.03,
          ingrepen: existing.ingrepen_jsonb ?? undefined,
          maandelijkse_besparing_gas_euro: existing.maandelijks_gas_euro,
          maandelijkse_besparing_elek_euro: existing.maandelijks_elek_euro,
          maandelijkse_besparing_totaal_euro: existing.maandelijks_totaal_euro,
          co2_reductie_kg_jaar: existing.co2_reductie_kg_jaar,
          epc_label_verwacht: existing.epc_label_verwacht,
          epc_kwh_m2_voor: existing.epc_kwh_m2_voor,
          epc_kwh_m2_na: existing.epc_kwh_m2_na,
        } as BesparingResultaat)
      : null,
  );
  const [busy, setBusy] = useState(false);
  const eigenInbreng = dossier.lening?.[0]?.eigen_inbreng ?? 0;

  async function bereken() {
    setBusy(true);
    try {
      const res = await fetch(`/api/dossiers/${dossier.id}/besparing`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eigen_inbreng: eigenInbreng }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as BesparingResultaat;
      setResultaat(json);
      toast({ title: "Besparing berekend", variant: "success" });
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!resultaat) bereken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ingrepen: IngreepBesparing[] = resultaat?.ingrepen ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stap 6 — Besparing per ingreep, EPC-impact & terugverdientijd</CardTitle>
        <CardDescription>
          Elke ingreep apart doorgerekend: dak, gevel, ramen, warmtepomp, PV en batterij.
          Energieprijzen: elektriciteit{" "}
          {formatEur(resultaat?.gebruikte_energieprijzen?.elektriciteit_per_kwh ?? 0)}/kWh,
          gas {formatEur(resultaat?.gebruikte_energieprijzen?.gas_per_kwh ?? 0)}/kWh.{" "}
          {((resultaat?.jaarlijkse_prijsstijging ?? 0.03) * 100).toFixed(0)} % jaarlijkse
          prijsstijging.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {resultaat && (
          <>
            {/* ============ HEADLINE KPI's ============ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-enervia-50 rounded-lg">
              <Stat
                label="Totale besparing/jaar"
                value={formatEur(resultaat.totale_jaarlijkse_besparing)}
                large
                accent
              />
              <Stat
                label="Bespaard per maand"
                value={formatEur(resultaat.maandelijkse_besparing_totaal_euro ?? 0)}
                large
              />
              <Stat
                label="Terugverdientijd"
                value={`${resultaat.terugverdientijd_jaar?.toFixed(1) ?? "—"} jaar`}
                large
              />
              <Stat
                label="CO₂-reductie/jaar"
                value={`${((resultaat.co2_reductie_kg_jaar ?? 0) / 1000).toFixed(1)} ton`}
                large
              />
            </div>

            {/* ============ EPC-IMPACT CARD ============ */}
            {resultaat.epc_kwh_m2_voor && (
              <div className="rounded-lg border border-enervia-600/20 p-4 flex items-center justify-between bg-white">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Verwachte EPC-sprong
                  </div>
                  <div className="text-2xl font-bold text-enervia-700 mt-1">
                    Label {resultaat.epc_label_voor ?? "—"} → Label{" "}
                    <span className="text-accent-400">
                      {resultaat.epc_label_verwacht}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {resultaat.epc_kwh_m2_voor} → {resultaat.epc_kwh_m2_na} kWh/m²·jaar
                    (indicatief, geen EPB-certificaat)
                  </div>
                </div>
                <div className="text-6xl font-black text-accent-400">
                  {resultaat.epc_label_verwacht}
                </div>
              </div>
            )}

            {/* ============ MAANDELIJKSE GAS/ELEK SPLITSING ============ */}
            <div>
              <h3 className="font-semibold mb-3">
                Maandelijkse besparing — gas vs. elektriciteit
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="rounded border p-3 bg-blue-50 text-center">
                  <div className="text-xs text-blue-800">Gas/stookolie per maand</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {formatEur(resultaat.maandelijkse_besparing_gas_euro ?? 0)}
                  </div>
                </div>
                <div className="rounded border p-3 bg-amber-50 text-center">
                  <div className="text-xs text-amber-800">Elek per maand</div>
                  <div className="text-2xl font-bold text-amber-900 mt-1">
                    {formatEur(resultaat.maandelijkse_besparing_elek_euro ?? 0)}
                  </div>
                </div>
                <div className="rounded border p-3 bg-enervia-50 text-center">
                  <div className="text-xs text-enervia-700">Totaal per maand</div>
                  <div className="text-2xl font-bold text-enervia-700 mt-1">
                    {formatEur(resultaat.maandelijkse_besparing_totaal_euro ?? 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* ============ INGREPEN TABEL ============ */}
            {ingrepen.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">
                  Overzicht per ingreep ({ingrepen.length})
                </h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-enervia-50 text-enervia-700">
                      <tr>
                        <th className="text-left px-3 py-2">Ingreep</th>
                        <th className="text-right px-2 py-2">Investering</th>
                        <th className="text-right px-2 py-2">Premie</th>
                        <th className="text-right px-2 py-2">Netto</th>
                        <th className="text-right px-2 py-2">Besparing/jaar</th>
                        <th className="text-right px-2 py-2">€/maand</th>
                        <th className="text-center px-2 py-2">EPC-impact</th>
                        <th className="text-right px-2 py-2">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ingrepen.map((i) => (
                        <tr key={i.code} className="hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <div className="font-medium">{i.titel}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-md">
                              {i.korte_omschrijving}
                            </div>
                          </td>
                          <td className="text-right font-mono px-2 py-2">
                            {formatEur(i.investering_incl_btw)}
                          </td>
                          <td className="text-right font-mono px-2 py-2 text-accent-400">
                            {i.premie_bedrag > 0 ? `−${formatEur(i.premie_bedrag)}` : "—"}
                          </td>
                          <td className="text-right font-mono px-2 py-2 font-semibold">
                            {formatEur(i.netto_investering)}
                          </td>
                          <td className="text-right font-mono px-2 py-2 text-enervia-700 font-semibold">
                            {formatEur(i.jaarlijkse_besparing_euro)}
                          </td>
                          <td className="text-right font-mono px-2 py-2">
                            {formatEur(i.maandelijkse_besparing_euro)}
                          </td>
                          <td className="text-center px-2 py-2">
                            <Badge
                              className={`font-normal ${niveauKleur[i.epc_impact_niveau]}`}
                            >
                              {niveauLabel[i.epc_impact_niveau]}
                            </Badge>
                          </td>
                          <td className="text-right font-mono px-2 py-2">
                            {i.terugverdientijd_jaar !== null
                              ? `${i.terugverdientijd_jaar.toFixed(1)}j`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-enervia-600 text-white font-bold">
                        <td className="px-3 py-2">TOTAAL PROJECT</td>
                        <td className="text-right font-mono px-2 py-2">
                          {formatEur(
                            ingrepen.reduce((s, i) => s + i.investering_incl_btw, 0),
                          )}
                        </td>
                        <td className="text-right font-mono px-2 py-2">
                          −{formatEur(
                            ingrepen.reduce((s, i) => s + i.premie_bedrag, 0),
                          )}
                        </td>
                        <td className="text-right font-mono px-2 py-2">
                          {formatEur(
                            ingrepen.reduce((s, i) => s + i.netto_investering, 0),
                          )}
                        </td>
                        <td className="text-right font-mono px-2 py-2">
                          {formatEur(resultaat.totale_jaarlijkse_besparing)}
                        </td>
                        <td className="text-right font-mono px-2 py-2">
                          {formatEur(resultaat.maandelijkse_besparing_totaal_euro ?? 0)}
                        </td>
                        <td className="text-center px-2 py-2">→ {resultaat.epc_label_verwacht}</td>
                        <td className="text-right font-mono px-2 py-2">
                          {resultaat.terugverdientijd_jaar?.toFixed(1)}j
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============ BALKDIAGRAM BESPARING PER INGREEP ============ */}
            {ingrepen.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">
                  Jaarlijkse besparing per ingreep
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={ingrepen.map((i) => ({
                      naam: i.titel.split(" ").slice(0, 3).join(" "),
                      besparing: i.jaarlijkse_besparing_euro,
                      code: i.code,
                    }))}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#D1E1DB" />
                    <XAxis type="number" tickFormatter={(v) => `€${v}`} />
                    <YAxis
                      dataKey="naam"
                      type="category"
                      width={180}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v: unknown) =>
                        typeof v === "number" ? formatEur(v) : String(v)
                      }
                    />
                    <Bar dataKey="besparing" name="Besparing €/jaar">
                      {ingrepen.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            [
                              "#1F4D3F",
                              "#2A6654",
                              "#E87722",
                              "#B8651E",
                              "#7A9E8F",
                              "#A8C5B9",
                              "#C4D9CF",
                            ][idx % 7]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ============ 10-JAAR PROJECTIE ============ */}
            <div>
              <h3 className="font-semibold mb-3">
                10-jaar cumulatieve besparing
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={resultaat.projectie_10j}>
                  <defs>
                    <linearGradient id="cumColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F4D3F" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#1F4D3F" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1E1DB" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(v: unknown) =>
                      typeof v === "number" ? formatEur(v) : String(v)
                    }
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cumulatief"
                    name="Cumulatieve besparing"
                    stroke="#1F4D3F"
                    fill="url(#cumColor)"
                  />
                  <Line
                    type="monotone"
                    dataKey="besparing"
                    name="Jaarlijkse besparing"
                    stroke="#E87722"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ============ TECHNISCHE FICHES (expandable) ============ */}
            {ingrepen.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Technische details</h3>
                <div className="space-y-2">
                  {ingrepen.map((i) => (
                    <details
                      key={i.code}
                      className="group rounded-lg border bg-white"
                    >
                      <summary className="cursor-pointer px-4 py-3 font-medium list-none flex items-center justify-between hover:bg-muted/30">
                        <span>{i.titel}</span>
                        <span className="text-xs text-muted-foreground group-open:hidden">
                          Toon details →
                        </span>
                        <span className="text-xs text-muted-foreground hidden group-open:inline">
                          Verberg ↑
                        </span>
                      </summary>
                      <div className="px-4 pb-4 pt-1 text-sm space-y-3">
                        <p className="text-muted-foreground">{i.toelichting}</p>
                        <div>
                          <div className="text-xs font-semibold text-enervia-700 mb-1">
                            Technische specificaties
                          </div>
                          <ul className="list-disc list-inside text-xs space-y-0.5 text-muted-foreground">
                            {i.technische_specs.map((spec, idx) => (
                              <li key={idx}>{spec}</li>
                            ))}
                          </ul>
                        </div>
                        {i.formule && (
                          <div className="text-xs font-mono text-muted-foreground bg-muted/40 p-2 rounded">
                            Berekening: {i.formule}
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                          <MiniStat
                            label="kWh bespaard/jaar"
                            value={i.jaarlijkse_besparing_kwh.toLocaleString("nl-BE")}
                          />
                          <MiniStat
                            label="Gas-bespaard/jaar"
                            value={`${i.besparing_gas_kwh.toLocaleString("nl-BE")} kWh`}
                          />
                          <MiniStat
                            label="Elek-bespaard/jaar"
                            value={`${i.besparing_elek_kwh.toLocaleString("nl-BE")} kWh`}
                          />
                          <MiniStat
                            label="CO₂/jaar"
                            value={`${i.co2_reductie_kg_jaar.toLocaleString("nl-BE")} kg`}
                          />
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded">
              <strong>Methodologie:</strong> isolatie-besparingen berekend via U-waarde
              methode (graaddagen Ukkel 2100 Kd/j), warmtepomp-besparing via
              seizoensgemiddelde COP, PV-opbrengst via standaard Vlaamse opbrengst
              (920 kWh/kWp × 92 %). EPC-impact is indicatief; definitieve EPC-waarde
              vereist een EPB-certificering.
            </div>
          </>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={bereken} disabled={busy}>
            {busy ? "Berekenen..." : "Herbereken met actuele prijzen"}
          </Button>
          <Button onClick={onNext} disabled={!resultaat}>
            Naar dossier-samenvatting →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
  large,
}: {
  label: string;
  value: string;
  accent?: boolean;
  large?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`font-bold font-mono ${large ? "text-2xl" : "text-lg"} ${
          accent ? "text-accent-400" : "text-enervia-600"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold text-enervia-700">{value}</div>
    </div>
  );
}
