"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function NieuwContactForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    voornaam: "",
    achternaam: "",
    email: "",
    telefoon: "",
    gsm: "",
    functie: "",
    aanspreking: "",
    adres_straat: "",
    adres_nummer: "",
    postcode: "",
    gemeente: "",
    land: "BE",
    beschrijving: "",
    is_klant: false,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/contacten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      const data = await res.json();
      toast({ title: "Contact aangemaakt", variant: "success" });
      router.push(`/app/contacten/${data.id}`);
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
        <h2 className="font-semibold text-enervia-700">Persoonsgegevens</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Aanspreking</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.aanspreking}
              onChange={(e) => set("aanspreking", e.target.value)}
            >
              <option value="">—</option>
              <option value="Dhr.">Dhr.</option>
              <option value="Mevr.">Mevr.</option>
            </select>
          </div>
          <div>
            <Label>Functie</Label>
            <Input
              value={form.functie}
              onChange={(e) => set("functie", e.target.value)}
              placeholder="Bv. Zaakvoerder"
            />
          </div>
          <div>
            <Label>
              Voornaam <span className="text-red-600">*</span>
            </Label>
            <Input
              required
              value={form.voornaam}
              onChange={(e) => set("voornaam", e.target.value)}
            />
          </div>
          <div>
            <Label>
              Achternaam <span className="text-red-600">*</span>
            </Label>
            <Input
              required
              value={form.achternaam}
              onChange={(e) => set("achternaam", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-enervia-700">Contactgegevens</h2>
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
              placeholder="03 808 8666"
            />
          </div>
          <div>
            <Label>GSM</Label>
            <Input
              value={form.gsm}
              onChange={(e) => set("gsm", e.target.value)}
              placeholder="04XX XX XX XX"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-enervia-700">Adres</h2>
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

      <section className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-enervia-700">Extra</h2>
        <div>
          <Label>Notities / beschrijving</Label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
            value={form.beschrijving}
            onChange={(e) => set("beschrijving", e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_klant}
            onChange={(e) => set("is_klant", e.target.checked)}
          />
          Is klant
        </label>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Opslaan..." : "Contact opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/contacten")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
