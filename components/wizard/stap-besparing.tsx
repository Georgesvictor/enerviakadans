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
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/utils/format";
import { toast } from "@/components/ui/toaster";
import type { BesparingResultaat } from "@/lib/berekeningen/types";

export function StapBesparing({ dossier, onNext }: { dossier: any; onNext: () => void }) {
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
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stap 6 — Besparing &amp; projectie</CardTitle>
        <CardDescription>
          10-jaar projectie van energiebesparing met {((resultaat?.jaarlijkse_prijsstijging ?? 0.03) * 100).toFixed(0)}%
          jaarlijkse prijsstijging.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {resultaat && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-enervia-50 rounded-lg">
              <Stat label="Warmtepomp/jaar" value={formatEur(resultaat.jaarlijkse_besparing_warmtepomp)} />
              <Stat label="PV/jaar" value={formatEur(resultaat.jaarlijkse_besparing_pv)} />
              <Stat label="Batterij/jaar" value={formatEur(resultaat.jaarlijkse_besparing_batterij)} />
              <Stat
                label="Totaal/jaar"
                value={formatEur(resultaat.totale_jaarlijkse_besparing)}
                accent
                large
              />
            </div>

            <div className="p-4 bg-accent-50 rounded-lg text-center">
              <div className="text-sm text-muted-foreground">Terugverdientijd</div>
              <div className="text-3xl font-bold text-accent-400">
                {resultaat.terugverdientijd_jaar?.toFixed(1)} jaar
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">10-jaar projectie</h3>
              <ResponsiveContainer width="100%" height={320}>
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
