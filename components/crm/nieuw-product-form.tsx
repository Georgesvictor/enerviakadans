"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function NieuwProductForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    naam: "",
    beschrijving: "",
    type: "product",
    eenheid: "stuk",
    prijs_excl_btw: "0",
    btw_tarief: "0.21",
    categorie: "",
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/producten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          prijs_excl_btw: Number(form.prijs_excl_btw),
          btw_tarief: Number(form.btw_tarief),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      toast({ title: "Product toegevoegd", variant: "success" });
      router.push("/app/producten");
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
  return (
    <form
      onSubmit={submit}
      className="space-y-4 bg-white rounded-lg border p-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Code</Label>
          <Input
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="bv. DAK-140PIR"
          />
        </div>
        <div>
          <Label>Type</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            <option value="product">Product</option>
            <option value="dienst">Dienst</option>
            <option value="uren">Uren</option>
          </select>
        </div>
      </div>
      <div>
        <Label>
          Naam <span className="text-red-600">*</span>
        </Label>
        <Input
          required
          value={form.naam}
          onChange={(e) => set("naam", e.target.value)}
        />
      </div>
      <div>
        <Label>Beschrijving</Label>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
          value={form.beschrijving}
          onChange={(e) => set("beschrijving", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Eenheid</Label>
          <Input
            value={form.eenheid}
            onChange={(e) => set("eenheid", e.target.value)}
            placeholder="stuk, m², uur..."
          />
        </div>
        <div>
          <Label>Prijs (excl. btw)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.prijs_excl_btw}
            onChange={(e) => set("prijs_excl_btw", e.target.value)}
          />
        </div>
        <div>
          <Label>BTW-tarief</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.btw_tarief}
            onChange={(e) => set("btw_tarief", e.target.value)}
          >
            <option value="0">0 %</option>
            <option value="0.06">6 %</option>
            <option value="0.12">12 %</option>
            <option value="0.21">21 %</option>
          </select>
        </div>
      </div>
      <div>
        <Label>Categorie</Label>
        <Input
          value={form.categorie}
          onChange={(e) => set("categorie", e.target.value)}
          placeholder="Bv. Isolatie, Ramen, Installatie..."
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Opslaan..." : "Opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/producten")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
