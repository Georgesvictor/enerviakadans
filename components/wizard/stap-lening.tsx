"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatEur } from "@/lib/utils/format";
import { berekenLening, checkMVLGeschiktheid, COMMERCIEEL_DEFAULT_RENTE } from "@/lib/veka/lening";
import { toast } from "@/components/ui/toaster";

export function StapLening({ dossier, onNext }: { dossier: any; onNext: () => void }) {
  const params = dossier.parameters?.[0];
  const premies = dossier.premie?.[0];
  const extractie = dossier.extractie?.[0]?.gestructureerde_data;
  const totaalIncl = extractie?.totaal_incl_btw ?? 0;
  const totaalPremies = premies?.totaal_premies ?? 0;
  const netto = Math.max(0, totaalIncl - totaalPremies);

  const mvl = useMemo(() => (params ? checkMVLGeschiktheid(params) : null), [params]);

  const [type, setType] = useState<"mijnverbouwlening" | "commercieel">(
    mvl?.geschikt ? "mijnverbouwlening" : "commercieel",
  );
  const [eigenInbreng, setEigenInbreng] = useState(0);
  const [rente, setRente] = useState(COMMERCIEEL_DEFAULT_RENTE);
  const [looptijd, setLooptijd] = useState(15);
  const [busy, setBusy] = useState(false);

  const leenbedrag = Math.max(0, netto - eigenInbreng);
  const effectieveRente = type === "mijnverbouwlening" ? mvl?.rentevoet ?? 0 : rente;
  const lening =
    leenbedrag > 0
      ? berekenLening({
          type,
          leenbedrag,
          rentevoet_jaarlijks: effectieveRente,
          looptijd_jaar: looptijd,
          eigen_inbreng: eigenInbreng,
        })
      : null;

  async function opslaan() {
    if (!lening) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dossiers/${dossier.id}/lening`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          leenbedrag,
          looptijd_jaar: looptijd,
          eigen_inbreng: eigenInbreng,
          rentevoet: effectieveRente,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Lening opgeslagen", variant: "success" });
      onNext();
    } catch (err) {
      toast({
        title: "Opslaan mislukt",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stap 5 — Leningsimulatie</CardTitle>
        <CardDescription>
          {mvl?.geschikt
            ? `Klant komt in aanmerking voor MijnVerbouwLening aan ${(mvl.rentevoet * 100).toFixed(0)}% rente.`
            : `MijnVerbouwLening niet beschikbaar. Reden: ${mvl?.reden}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Totale investering" value={formatEur(totaalIncl)} />
          <Stat label="Premies" value={formatEur(totaalPremies)} accent />
          <Stat label="Netto investering" value={formatEur(netto)} />
        </div>

        <Tabs value={type} onValueChange={(v) => setType(v as any)}>
          <TabsList>
            <TabsTrigger value="mijnverbouwlening" disabled={!mvl?.geschikt}>
              MijnVerbouwLening {mvl?.geschikt && <Badge variant="success" className="ml-2">Geschikt</Badge>}
            </TabsTrigger>
            <TabsTrigger value="commercieel">Commerciële lening</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          <div>
            <Label className="flex justify-between">
              <span>Eigen inbreng</span>
              <span className="font-mono">{formatEur(eigenInbreng, true)}</span>
            </Label>
            <Slider
              min={0}
              max={Math.round(netto)}
              step={500}
              value={[eigenInbreng]}
              onValueChange={(v) => setEigenInbreng(v[0])}
              className="mt-2"
            />
          </div>

          {type === "commercieel" && (
            <div>
              <Label className="flex justify-between">
                <span>Rentevoet</span>
                <span className="font-mono">{(rente * 100).toFixed(2)}%</span>
              </Label>
              <Slider
                min={0.01}
                max={0.08}
                step={0.001}
                value={[rente]}
                onValueChange={(v) => setRente(v[0])}
                className="mt-2"
              />
            </div>
          )}

          <div>
            <Label className="flex justify-between">
              <span>Looptijd</span>
              <span className="font-mono">{looptijd} jaar</span>
            </Label>
            <Slider
              min={5}
              max={25}
              step={1}
              value={[looptijd]}
              onValueChange={(v) => setLooptijd(v[0])}
              className="mt-2"
            />
          </div>
        </div>

        {lening && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-enervia-50 rounded-lg">
            <Stat label="Leenbedrag" value={formatEur(leenbedrag)} />
            <Stat label="Maandaflossing" value={formatEur(lening.maandelijkse_afbetaling)} accent large />
            <Stat label="Totale rente" value={formatEur(lening.totale_interestkost)} />
            <Stat label="Totaal terug" value={formatEur(lening.totaal_terug_te_betalen)} />
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={opslaan} disabled={busy || !lening}>
            Opslaan en volgende →
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
