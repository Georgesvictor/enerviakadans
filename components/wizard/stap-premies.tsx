"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { formatEur } from "@/lib/utils/format";
import { Calculator } from "lucide-react";
import type { PremiesOverzicht } from "@/lib/berekeningen/types";

const LABELS: Record<keyof Omit<PremiesOverzicht, "totaal">, string> = {
  dak: "Dakisolatie",
  ramen_deuren: "Ramen & deuren",
  gevel: "Gevelisolatie",
  vloer: "Vloerisolatie",
  warmtepomp: "Warmtepomp",
  warmtepompboiler: "Warmtepompboiler",
  zonnepanelen: "Zonnepanelen",
  asbest: "Asbestverwijdering",
  asbest_veka_bonus: "VEKA bonus asbest",
  epc_label: "EPC-labelpremie",
  voorbereidingswerken: "Voorbereidingswerken",
};

export function StapPremies({ dossier, onNext }: { dossier: any; onNext: () => void }) {
  const router = useRouter();
  const bestaand = dossier.premie?.[0];
  const [premies, setPremies] = useState<PremiesOverzicht | null>(
    bestaand?.premies_jsonb ?? null,
  );
  const [busy, setBusy] = useState(false);

  async function bereken() {
    setBusy(true);
    try {
      const res = await fetch(`/api/dossiers/${dossier.id}/premies`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const p = (await res.json()) as PremiesOverzicht;
      setPremies(p);
      router.refresh(); // refetch dossier zodat Lening/Besparing de premies zien
      toast({ title: "Premies berekend", variant: "success" });
    } catch (err) {
      toast({
        title: "Fout bij berekenen",
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
        <CardTitle>Stap 4 — Premieberekening</CardTitle>
        <CardDescription>
          MijnVerbouwPremie + asbest + EPC-labelpremie volgens tarieven 2026.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={bereken} disabled={busy}>
          <Calculator className="h-4 w-4" />
          {busy ? "Berekenen..." : premies ? "Herberekenen" : "Bereken premies"}
        </Button>

        {premies && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Premie</TableHead>
                  <TableHead>Formule</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((k) => {
                  const p = premies[k];
                  return (
                    <TableRow key={k} className={!p.van_toepassing ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{LABELS[k]}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.formule}
                        {p.maximum_bereikt && (
                          <Badge variant="warning" className="ml-2">
                            Max bereikt
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatEur(p.bedrag)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold bg-enervia-50">
                  <TableCell colSpan={2}>Totaal premies</TableCell>
                  <TableCell className="text-right font-mono text-lg text-enervia-600">
                    {formatEur(premies.totaal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <p className="text-xs text-muted-foreground">
              Disclaimer: Premies zijn indicatief en gebaseerd op VEKA-simulatie.
              Finale bedragen worden bepaald bij aanvraag.
            </p>

            <div className="flex justify-end">
              <Button onClick={onNext}>Volgende: lening →</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
