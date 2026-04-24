"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { formatEur } from "@/lib/utils/format";
import { toast } from "@/components/ui/toaster";
import { RefreshCw, AlertTriangle } from "lucide-react";
import type { OfferteExtractie } from "@/lib/berekeningen/types";

export function StapExtractieReview({
  dossier,
  onNext,
}: {
  dossier: any;
  onNext: () => void;
}) {
  const extractie = dossier.extractie?.[0];
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<OfferteExtractie | null>(
    extractie?.gestructureerde_data ?? null,
  );
  const score = extractie?.validatie_score ?? null;
  const validatieOpm = extractie?.validatie_opmerkingen;

  async function runExtractie() {
    setBusy(true);
    try {
      const res = await fetch(`/api/dossiers/${dossier.id}/extract`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json.extractie);
      toast({
        title: "Extractie klaar",
        description: `Score: ${(json.validatie.score * 100).toFixed(0)}%`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Extractie faalde",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stap 2 — Offerte-extractie</CardTitle>
          <CardDescription>
            Laat Claude de offerte automatisch uitlezen. Je kan de resultaten daarna nog aanpassen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runExtractie} disabled={busy} size="lg">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Extractie loopt..." : "Start extractie"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stap 2 — Offerte-extractie review</CardTitle>
        <CardDescription className="flex items-center gap-2">
          {score !== null && (
            <Badge variant={score >= 0.8 ? "success" : "warning"}>
              Validator {Math.round(score * 100)}%
            </Badge>
          )}
          {score !== null && score < 0.8 && (
            <span className="flex items-center gap-1 text-amber-700 text-sm">
              <AlertTriangle className="h-3 w-3" />
              {validatieOpm ?? "Gelieve de extractie te reviewen"}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Totalen</h3>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Excl. BTW" value={formatEur(data.totaal_excl_btw)} />
            <Stat label="Incl. BTW" value={formatEur(data.totaal_incl_btw)} />
            <Stat label="BTW tarief" value={`${(data.btw_tarief * 100).toFixed(0)}%`} />
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Categorieën</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categorie</TableHead>
                <TableHead className="text-right">Bedrag excl. BTW</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data.categorieen)
                .filter(([, v]) => v && v.excl_btw !== 0)
                .map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="capitalize">{k.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatEur(v!.excl_btw)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Specifieke velden</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Stat label="Dak m²" value={String(data.specifiek.dak_m2 ?? "-")} />
            <Stat label="Gevel m²" value={String(data.specifiek.gevel_m2 ?? "-")} />
            <Stat label="Ramen m²" value={String(data.specifiek.ramen_m2 ?? "-")} />
            <Stat label="PV Wp" value={String(data.specifiek.pv_wp ?? "-")} />
            <Stat label="Batterij kWh" value={String(data.specifiek.batterij_kwh ?? "-")} />
            <Stat label="WP type" value={data.specifiek.warmtepomp_type ?? "-"} />
            <Stat label="Asbest" value={data.specifiek.heeft_asbest ? "Ja" : "Nee"} />
            {data.specifiek.heeft_asbest && (
              <Stat label="Asbest kost" value={formatEur(data.specifiek.asbest_kosten_excl)} />
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={runExtractie} disabled={busy}>
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Opnieuw extracteren
          </Button>
          <Button onClick={onNext}>Goedkeuren en volgende →</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
