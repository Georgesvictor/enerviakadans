"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEur } from "@/lib/utils/format";

export function DossierSamenvatting({
  dossier,
  mode,
  onModeChange,
}: {
  dossier: any;
  mode: "bank" | "klant";
  onModeChange: (m: "bank" | "klant") => void;
}) {
  const extractie = dossier.extractie?.[0]?.gestructureerde_data;
  const premie = dossier.premie?.[0];
  const lening = dossier.lening?.[0];
  const besparing = dossier.besparing?.[0];

  const totaalIncl = extractie?.totaal_incl_btw ?? 0;
  const netto = Math.max(0, totaalIncl - (premie?.totaal_premies ?? 0));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Complete dossier-samenvatting</CardTitle>
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as any)}>
          <TabsList>
            <TabsTrigger value="bank">Bank-focus</TabsTrigger>
            <TabsTrigger value="klant">Klant-focus</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Totale investering" value={formatEur(totaalIncl, true)} />
          <Stat
            label="Premies"
            value={formatEur(premie?.totaal_premies ?? 0, true)}
            accent
          />
          <Stat label="Netto investering" value={formatEur(netto, true)} />
          <Stat
            label="Maandaflossing"
            value={formatEur(lening?.maandelijkse_afbetaling ?? 0)}
          />
        </div>

        {mode === "bank" ? (
          <BankView dossier={dossier} />
        ) : (
          <KlantView dossier={dossier} />
        )}

        <div className="text-xs text-muted-foreground border-t border-enervia-100 pt-4">
          Disclaimer: Premies zijn indicatief en gebaseerd op VEKA-simulatie.
          Finale bedragen bij aanvraag. Energieprijzen op basis van VREG/CREG
          snapshot op {new Date(dossier.besparing?.[0]?.created_at ?? dossier.created_at).toLocaleDateString("nl-BE")}.
        </div>
      </CardContent>
    </Card>
  );
}

function BankView({ dossier }: { dossier: any }) {
  const lening = dossier.lening?.[0];
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-enervia-600">Bank-focus overzicht</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <InfoRow label="Type lening" value={lening?.type_lening ?? "-"} />
        <InfoRow
          label="MijnVerbouwLening geschikt"
          value={
            <Badge variant={lening?.geschikt_voor_mijnverbouwlening ? "success" : "outline"}>
              {lening?.geschikt_voor_mijnverbouwlening ? "Ja" : "Nee"}
            </Badge>
          }
        />
        <InfoRow
          label="Rentevoet"
          value={`${((lening?.rentevoet ?? 0) * 100).toFixed(2)}%`}
        />
        <InfoRow label="Looptijd" value={`${lening?.looptijd_jaar} jaar`} />
        <InfoRow
          label="Totale rentekost"
          value={formatEur(lening?.totale_interestkost ?? 0)}
        />
        <InfoRow
          label="Eigen inbreng"
          value={formatEur(lening?.eigen_inbreng ?? 0)}
        />
      </div>
    </div>
  );
}

function KlantView({ dossier }: { dossier: any }) {
  const besparing = dossier.besparing?.[0];
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-enervia-600">Klant-focus overzicht</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <InfoRow
          label="Jaarlijkse besparing"
          value={formatEur(besparing?.totale_jaarlijkse_besparing ?? 0)}
        />
        <InfoRow
          label="Terugverdientijd"
          value={`${besparing?.terugverdientijd_jaar?.toFixed(1) ?? "-"} jaar`}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md border-enervia-100">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="p-4 border rounded-md border-enervia-100">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-xl font-bold font-mono ${accent ? "text-accent-400" : "text-enervia-600"}`}
      >
        {value}
      </div>
    </div>
  );
}
