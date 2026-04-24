"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { formatEur } from "@/lib/utils/format";
import { berekenLening } from "@/lib/veka/lening";
import { bouwProjectie10j } from "@/lib/berekeningen/projectie-10j";

export function KlantPortalInhoud({ dossier }: { dossier: any }) {
  const extractie = dossier.extractie?.[0]?.gestructureerde_data;
  const premie = dossier.premie?.[0];
  const leningRow = dossier.lening?.[0];
  const besparingRow = dossier.besparing?.[0];

  const totaalIncl = extractie?.totaal_incl_btw ?? 0;
  const premies = premie?.totaal_premies ?? 0;
  const netto = Math.max(0, totaalIncl - premies);
  const besparingJaar = besparingRow?.totale_jaarlijkse_besparing ?? 0;

  const rentevoetInit = leningRow?.rentevoet ?? 0.035;
  const looptijdInit = leningRow?.looptijd_jaar ?? 15;
  const inbrengInit = leningRow?.eigen_inbreng ?? 0;

  const [eigenInbreng, setEigenInbreng] = useState<number>(inbrengInit);
  const [rente, setRente] = useState<number>(rentevoetInit);
  const [looptijd, setLooptijd] = useState<number>(looptijdInit);

  const isMVL = leningRow?.type_lening === "mijnverbouwlening";
  const effRente = isMVL ? rentevoetInit : rente;

  const leenbedrag = Math.max(0, netto - eigenInbreng);
  const lening =
    leenbedrag > 0
      ? berekenLening({
          type: isMVL ? "mijnverbouwlening" : "commercieel",
          leenbedrag,
          rentevoet_jaarlijks: effRente,
          looptijd_jaar: looptijd,
          eigen_inbreng: eigenInbreng,
        })
      : null;

  const projectie = useMemo(
    () =>
      bouwProjectie10j({
        basis_jaarlijkse_besparing: besparingJaar,
        eigen_inbreng: eigenInbreng,
        jaarlijkse_prijsstijging: besparingRow?.jaarlijkse_prijsstijging ?? 0.03,
      }),
    [besparingJaar, eigenInbreng, besparingRow?.jaarlijkse_prijsstijging],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Welkom {dossier.klant?.voornaam ?? ""} {dossier.klant?.achternaam ?? ""}
          </CardTitle>
          <CardDescription>
            Dit is jouw persoonlijke simulatie. Beweeg de sliders om verschillende
            scenario's te bekijken. Alle berekeningen zijn indicatief.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BigStat label="Totale investering" value={formatEur(totaalIncl, true)} />
            <BigStat label="Premies" value={formatEur(premies, true)} accent />
            <BigStat label="Netto voor jou" value={formatEur(netto, true)} highlight />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jouw persoonlijk scenario</CardTitle>
          <CardDescription>
            Pas eigen inbreng, rentevoet en looptijd aan naar wens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderRow
            label="Eigen inbreng"
            min={0}
            max={Math.round(netto)}
            step={500}
            value={eigenInbreng}
            onChange={setEigenInbreng}
            format={(v) => formatEur(v, true)}
          />
          {!isMVL && (
            <SliderRow
              label="Rentevoet commerciële lening"
              min={0.01}
              max={0.08}
              step={0.001}
              value={rente}
              onChange={setRente}
              format={(v) => `${(v * 100).toFixed(2)}%`}
            />
          )}
          {isMVL && (
            <p className="text-sm text-enervia-600">
              <Badge variant="success" className="mr-2">MijnVerbouwLening</Badge>
              Jij komt in aanmerking voor een lening aan {(rentevoetInit * 100).toFixed(0)}% rente.
            </p>
          )}
          <SliderRow
            label="Looptijd lening"
            min={5}
            max={25}
            step={1}
            value={looptijd}
            onChange={setLooptijd}
            format={(v) => `${v} jaar`}
          />

          {lening && (
            <div className="p-4 bg-enervia-500 text-white rounded-lg">
              <div className="text-sm opacity-90">Maandelijks</div>
              <div className="text-3xl font-bold">
                {formatEur(lening.maandelijkse_afbetaling)}
              </div>
              <div className="text-xs opacity-90 mt-1">
                over {looptijd} jaar aan {(effRente * 100).toFixed(2)}% rente
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jaarlijkse besparing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-accent-400 text-white rounded-lg text-center mb-4">
            <div className="text-sm opacity-90">Je bespaart gemiddeld</div>
            <div className="text-4xl font-bold my-2">
              {formatEur(besparingJaar, true)} /jaar
            </div>
            <div className="text-sm opacity-90">
              Dat is {formatEur(besparingJaar / 12)} /maand op je energiefactuur
            </div>
          </div>
          <h3 className="font-semibold text-enervia-600 mb-3">
            Jouw 10-jaar projectie
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projectie.jaren}>
              <defs>
                <linearGradient id="cumClient" x1="0" y1="0" x2="0" y2="1">
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
                name="Cumulatief bespaard"
                stroke="#1F4D3F"
                fill="url(#cumClient)"
              />
              <Line
                type="monotone"
                dataKey="besparing"
                name="Per jaar"
                stroke="#E87722"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground mt-4">
            Terugverdientijd: <strong>{projectie.terugverdientijd_jaar.toFixed(1)} jaar</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function BigStat({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-6 rounded-lg ${
        highlight ? "bg-enervia-500 text-white" : accent ? "bg-accent-400 text-white" : "bg-enervia-50"
      }`}
    >
      <div className="text-sm opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <Label className="flex justify-between mb-2">
        <span>{label}</span>
        <span className="font-mono text-enervia-600">{format(value)}</span>
      </Label>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}
