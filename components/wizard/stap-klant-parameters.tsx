"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toaster";
import { bepaalCategorie } from "@/lib/veka/inkomenscategorieen";
import { formatEur } from "@/lib/utils/format";
import type { KlantParameters } from "@/lib/berekeningen/types";

export function StapKlantParameters({
  dossier,
  onNext,
}: {
  dossier: any;
  onNext: () => void;
}) {
  const existing = (dossier.parameters?.[0] as KlantParameters) ?? null;
  const [form, setForm] = useState<KlantParameters>(
    existing ?? {
      inkomenscategorie: 3,
      gezamenlijk_inkomen: 0,
      burgerlijke_staat: "alleenstaand",
      personen_ten_laste: 0,
      epc_label_voor: "E",
      epc_label_verwacht: "A",
      woning_ouderdom: "voor_2006",
      is_eigenaar: true,
      andere_woning_eigendom: false,
      is_gedomicilieerd: true,
      heeft_ventilatie: false,
      jaarverbruik_gas_kwh: 0,
      jaarverbruik_elektriciteit_kwh: 0,
      jaarverbruik_stookolie_liter: 0,
      huidig_verwarmingstype: "gas",
    },
  );
  const [busy, setBusy] = useState(false);

  const autoCat = bepaalCategorie(
    form.gezamenlijk_inkomen,
    form.burgerlijke_staat,
    form.personen_ten_laste,
  );

  function upd<K extends keyof KlantParameters>(k: K, v: KlantParameters[K]) {
    setForm((cur) => ({ ...cur, [k]: v }));
  }

  async function opslaan() {
    setBusy(true);
    try {
      const res = await fetch(`/api/dossiers/${dossier.id}/parameters`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, inkomenscategorie: autoCat }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Klantparameters opgeslagen", variant: "success" });
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
        <CardTitle>Stap 3 — Klant &amp; woning</CardTitle>
        <CardDescription>
          Inkomen, gezinssituatie en energieverbruik bepalen de premies en
          MijnVerbouwLening-geschiktheid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Burgerlijke staat</Label>
            <Select
              value={form.burgerlijke_staat}
              onValueChange={(v) => upd("burgerlijke_staat", v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alleenstaand">Alleenstaand</SelectItem>
                <SelectItem value="koppel">Koppel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Personen ten laste</Label>
            <Input
              type="number"
              min={0}
              value={form.personen_ten_laste}
              onChange={(e) => upd("personen_ten_laste", Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Gezamenlijk inkomen (€/jaar)</Label>
            <Input
              type="number"
              value={form.gezamenlijk_inkomen}
              onChange={(e) => upd("gezamenlijk_inkomen", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              Berekende categorie:{" "}
              <Badge variant="secondary">Cat. {autoCat}</Badge>{" "}
              {formatEur(form.gezamenlijk_inkomen)}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>EPC label voor</Label>
            <Select value={form.epc_label_voor} onValueChange={(v) => upd("epc_label_voor", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["A", "B", "C", "D", "E", "F"].map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>EPC label verwacht</Label>
            <Select
              value={form.epc_label_verwacht}
              onValueChange={(v) => upd("epc_label_verwacht", v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["A", "B", "C"].map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Woning ouderdom</Label>
            <Select
              value={form.woning_ouderdom ?? "voor_2006"}
              onValueChange={(v) => upd("woning_ouderdom", v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="voor_2006">Voor 2006</SelectItem>
                <SelectItem value="na_2006_min_5j">Na 2006 (min 5 jaar oud)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <SwitchRow label="Eigenaar" checked={form.is_eigenaar} onChange={(v) => upd("is_eigenaar", v)} />
          <SwitchRow
            label="Andere woning"
            checked={form.andere_woning_eigendom}
            onChange={(v) => upd("andere_woning_eigendom", v)}
          />
          <SwitchRow label="Gedomicilieerd" checked={form.is_gedomicilieerd} onChange={(v) => upd("is_gedomicilieerd", v)} />
          <SwitchRow label="Met ventilatie" checked={form.heeft_ventilatie} onChange={(v) => upd("heeft_ventilatie", v)} />
        </div>

        <Separator />

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Huidig verwarmingstype</Label>
            <Select
              value={form.huidig_verwarmingstype ?? "gas"}
              onValueChange={(v) => upd("huidig_verwarmingstype", v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gas">Aardgas</SelectItem>
                <SelectItem value="stookolie">Stookolie</SelectItem>
                <SelectItem value="elektrisch">Elektrisch</SelectItem>
                <SelectItem value="hout">Hout</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gas kWh/jaar</Label>
            <Input
              type="number"
              value={form.jaarverbruik_gas_kwh}
              onChange={(e) => upd("jaarverbruik_gas_kwh", Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Elek kWh/jaar</Label>
            <Input
              type="number"
              value={form.jaarverbruik_elektriciteit_kwh}
              onChange={(e) => upd("jaarverbruik_elektriciteit_kwh", Number(e.target.value))}
            />
          </div>
          {form.huidig_verwarmingstype === "stookolie" && (
            <div>
              <Label>Stookolie liter/jaar</Label>
              <Input
                type="number"
                value={form.jaarverbruik_stookolie_liter ?? 0}
                onChange={(e) =>
                  upd("jaarverbruik_stookolie_liter", Number(e.target.value))
                }
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={opslaan} disabled={busy}>
            {busy ? "Opslaan..." : "Opslaan en volgende →"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md border-enervia-100">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
