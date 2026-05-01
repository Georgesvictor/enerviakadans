"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function NieuwBedrijfForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    naam: "",
    btw_nummer: "",
    kbo_nummer: "",
    iban: "",
    website: "",
    sector: "",
    email: "",
    telefoon: "",
    adres_straat: "",
    adres_nummer: "",
    postcode: "",
    gemeente: "",
    land: "BE",
    is_klant: true,
    is_leverancier: false,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/bedrijven", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      const data = await res.json();
      toast({ title: "Bedrijf aangemaakt", variant: "success" });
      router.push(`/app/bedrijven/${data.id}`);
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
    <form onSubmit={submit} className="space-y-6">
      <section className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-enervia-700">Bedrijfsgegevens</h2>
        <div>
          <Label>
            Bedrijfsnaam <span className="text-red-600">*</span>
          </Label>
          <Input
            required
            value={form.naam}
            onChange={(e) => set("naam", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>BTW-nummer</Label>
            <Input
              value={form.btw_nummer}
              onChange={(e) => set("btw_nummer", e.target.value.toUpperCase())}
              placeholder="BE0123456789"
            />
          </div>
          <div>
            <Label>KBO-nummer</Label>
            <Input
              value={form.kbo_nummer}
              onChange={(e) => set("kbo_nummer", e.target.value)}
            />
          </div>
          <div>
            <Label>IBAN</Label>
            <Input
              value={form.iban}
              onChange={(e) => set("iban", e.target.value.toUpperCase())}
              placeholder="BE68 5390 0754 7034"
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="md:col-span-2">
            <Label>Sector</Label>
            <Input
              value={form.sector}
              onChange={(e) => set("sector", e.target.value)}
              placeholder="Bv. Bouw, Horeca, IT..."
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-enervia-700">Contact & adres</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <Label>Telefoon</Label>
            <Input
              value={form.telefoon}
              onChange={(e) => set("telefoon", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-4">
            <Label>Straat</Label>
            <Input
              value={form.adres_straat}
              onChange={(e) => set("adres_straat", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Nr</Label>
            <Input
              value={form.adres_nummer}
              onChange={(e) => set("adres_nummer", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Postcode</Label>
            <Input
              value={form.postcode}
              onChange={(e) => set("postcode", e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <Label>Gemeente</Label>
            <Input
              value={form.gemeente}
              onChange={(e) => set("gemeente", e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <Label>Land</Label>
            <Input
              value={form.land}
              onChange={(e) => set("land", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg border p-5 space-y-3">
        <h2 className="font-semibold text-enervia-700">Type</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_klant}
            onChange={(e) => set("is_klant", e.target.checked)}
          />
          Is klant
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_leverancier}
            onChange={(e) => set("is_leverancier", e.target.checked)}
          />
          Is leverancier
        </label>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Opslaan..." : "Bedrijf opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/bedrijven")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
