"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function InstellingenForm({ settings }: { settings: any }) {
  const [form, setForm] = useState({
    commerciele_rente: settings?.commerciele_rente ?? 0.035,
    wp_cop_default: settings?.wp_cop_default ?? 3.2,
    jaarlijkse_prijsstijging: settings?.jaarlijkse_prijsstijging ?? 0.03,
    inkomensdrempels: settings?.inkomensdrempels ?? {
      alleenstaand: { cat1: 27440, cat2: 45550 },
      koppel: { cat1: 38170, cat2: 65080 },
      verhoging_per_persoon_ten_laste: 4290,
    },
  });
  const [busy, setBusy] = useState(false);

  async function opslaan() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Instellingen opgeslagen", variant: "success" });
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
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label>Commerciële rente (default)</Label>
          <Input
            type="number"
            step="0.001"
            value={form.commerciele_rente}
            onChange={(e) =>
              setForm({ ...form, commerciele_rente: Number(e.target.value) })
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {(form.commerciele_rente * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <Label>COP warmtepomp (lucht-water)</Label>
          <Input
            type="number"
            step="0.1"
            value={form.wp_cop_default}
            onChange={(e) =>
              setForm({ ...form, wp_cop_default: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Jaarlijkse prijsstijging</Label>
          <Input
            type="number"
            step="0.001"
            value={form.jaarlijkse_prijsstijging}
            onChange={(e) =>
              setForm({
                ...form,
                jaarlijkse_prijsstijging: Number(e.target.value),
              })
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {(form.jaarlijkse_prijsstijging * 100).toFixed(1)}% (energie)
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-enervia-600 mb-3">
          Inkomensdrempels 2026
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <DrempelGroep
            label="Alleenstaand"
            data={form.inkomensdrempels.alleenstaand}
            onChange={(v) =>
              setForm({
                ...form,
                inkomensdrempels: { ...form.inkomensdrempels, alleenstaand: v },
              })
            }
          />
          <DrempelGroep
            label="Koppel"
            data={form.inkomensdrempels.koppel}
            onChange={(v) =>
              setForm({
                ...form,
                inkomensdrempels: { ...form.inkomensdrempels, koppel: v },
              })
            }
          />
        </div>
        <div className="mt-3">
          <Label>Verhoging per persoon ten laste (€)</Label>
          <Input
            type="number"
            value={form.inkomensdrempels.verhoging_per_persoon_ten_laste}
            onChange={(e) =>
              setForm({
                ...form,
                inkomensdrempels: {
                  ...form.inkomensdrempels,
                  verhoging_per_persoon_ten_laste: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      <Button onClick={opslaan} disabled={busy}>
        {busy ? "Opslaan..." : "Instellingen opslaan"}
      </Button>
    </div>
  );
}

function DrempelGroep({
  label,
  data,
  onChange,
}: {
  label: string;
  data: { cat1: number; cat2: number };
  onChange: (v: { cat1: number; cat2: number }) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Cat. 1 max</Label>
          <Input
            type="number"
            value={data.cat1}
            onChange={(e) =>
              onChange({ ...data, cat1: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Cat. 2 max</Label>
          <Input
            type="number"
            value={data.cat2}
            onChange={(e) =>
              onChange({ ...data, cat2: Number(e.target.value) })
            }
          />
        </div>
      </div>
    </div>
  );
}
