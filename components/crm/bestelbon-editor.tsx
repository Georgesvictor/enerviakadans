"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Plus, Trash2 } from "lucide-react";

type Regel = {
  product_id?: string | null;
  omschrijving: string;
  aantal: number;
  eenheid: string;
  prijs_excl_btw: number;
  btw_tarief: number;
};

export function BestelbonEditor({
  leveranciers,
  products,
  entities,
  initial,
}: {
  leveranciers: { id: string; naam: string }[];
  products: {
    id: string;
    code: string | null;
    naam: string;
    aankoop_prijs: number | null;
    prijs_excl_btw: number;
    btw_tarief: number;
    eenheid: string;
  }[];
  entities?: {
    id: string;
    naam: string;
    is_default: boolean;
    btw_nummer?: string | null;
  }[];
  initial: {
    onderwerp: string;
    deal_id?: string | null;
    project_id?: string | null;
    leverancier_id?: string | null;
    business_entity_id?: string | null;
    regels: Regel[];
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const defaultEntity = entities?.find((e) => e.is_default) ?? entities?.[0];
  const [head, setHead] = useState({
    onderwerp: initial.onderwerp,
    leverancier_id: initial.leverancier_id ?? "",
    deal_id: initial.deal_id ?? "",
    project_id: initial.project_id ?? "",
    business_entity_id: initial.business_entity_id ?? defaultEntity?.id ?? "",
    verwachte_levering: "",
    opmerkingen: "",
  });
  const [regels, setRegels] = useState<Regel[]>(initial.regels);

  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setRegels((r) => [
      ...r,
      {
        product_id: p.id,
        omschrijving: p.naam,
        aantal: 1,
        eenheid: p.eenheid,
        prijs_excl_btw: Number(p.aankoop_prijs ?? p.prijs_excl_btw ?? 0),
        btw_tarief: Number(p.btw_tarief ?? 0.21),
      },
    ]);
  }
  function addLeeg() {
    setRegels((r) => [
      ...r,
      { omschrijving: "", aantal: 1, eenheid: "stuk", prijs_excl_btw: 0, btw_tarief: 0.21 },
    ]);
  }
  function wijzig(i: number, k: keyof Regel, v: unknown) {
    setRegels((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  function verwijder(i: number) {
    setRegels((rs) => rs.filter((_, idx) => idx !== i));
  }

  const totalen = useMemo(() => {
    const sub = regels.reduce(
      (s, r) => s + r.aantal * r.prijs_excl_btw,
      0,
    );
    const btw = regels.reduce(
      (s, r) => s + r.aantal * r.prijs_excl_btw * r.btw_tarief,
      0,
    );
    return {
      sub: Math.round(sub * 100) / 100,
      btw: Math.round(btw * 100) / 100,
      totaal: Math.round((sub + btw) * 100) / 100,
    };
  }, [regels]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!head.leverancier_id) {
      toast({ title: "Kies een leverancier", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/bestelbonnen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...head,
          deal_id: head.deal_id || null,
          project_id: head.project_id || null,
          business_entity_id: head.business_entity_id || null,
          verwachte_levering: head.verwachte_levering || null,
          regels,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      const data = await res.json();
      toast({ title: "Bestelbon aangemaakt", variant: "success" });
      // Redirect terug naar deal indien gekoppeld, anders lijst
      if (head.deal_id) {
        router.push(`/app/deals/${head.deal_id}?tab=bestelbonnen`);
      } else {
        router.push("/app/bestelbonnen");
      }
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

  const f = (n: number) =>
    `€ ${n.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="bg-white rounded-lg border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>
              Onderwerp <span className="text-red-600">*</span>
            </Label>
            <Input
              required
              value={head.onderwerp}
              onChange={(e) => setHead({ ...head, onderwerp: e.target.value })}
            />
          </div>
          {entities && entities.length > 0 && (
            <div>
              <Label>
                Bestellen vanuit <span className="text-red-600">*</span>
              </Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={head.business_entity_id}
                onChange={(e) =>
                  setHead({ ...head, business_entity_id: e.target.value })
                }
              >
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.naam}
                    {ent.btw_nummer ? ` (${ent.btw_nummer})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>
              Leverancier <span className="text-red-600">*</span>
            </Label>
            <select
              required
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={head.leverancier_id}
              onChange={(e) => setHead({ ...head, leverancier_id: e.target.value })}
            >
              <option value="">Kies leverancier...</option>
              {leveranciers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.naam}
                </option>
              ))}
            </select>
            {leveranciers.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Geen leveranciers gevonden. Voeg een bedrijf toe met "is leverancier" aan.
              </p>
            )}
          </div>
          <div>
            <Label>Verwachte levering</Label>
            <Input
              type="date"
              value={head.verwachte_levering}
              onChange={(e) => setHead({ ...head, verwachte_levering: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-enervia-700">Regels</h2>
          <div className="flex gap-2">
            <select
              className="h-9 rounded-md border bg-background px-3 text-xs"
              onChange={(e) => {
                if (e.target.value) addProduct(e.target.value);
                e.target.value = "";
              }}
              defaultValue=""
            >
              <option value="">+ Uit catalogus...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ""}{p.naam}{" "}
                  {p.aankoop_prijs ? `(aankoop: ${p.aankoop_prijs})` : ""}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={addLeeg}>
              <Plus size={14} /> Lege regel
            </Button>
          </div>
        </div>
        {regels.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Geen regels.
          </div>
        ) : (
          <div className="divide-y">
            {regels.map((r, i) => (
              <div key={i} className="p-3 grid grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-5 bg-transparent outline-none text-sm"
                  placeholder="Omschrijving"
                  value={r.omschrijving}
                  onChange={(e) => wijzig(i, "omschrijving", e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-1 bg-transparent outline-none text-sm text-right"
                  value={r.aantal}
                  onChange={(e) => wijzig(i, "aantal", Number(e.target.value))}
                />
                <input
                  className="col-span-1 bg-transparent outline-none text-xs"
                  value={r.eenheid}
                  onChange={(e) => wijzig(i, "eenheid", e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-2 bg-transparent outline-none text-sm text-right"
                  placeholder="Aankoopprijs"
                  value={r.prijs_excl_btw}
                  onChange={(e) =>
                    wijzig(i, "prijs_excl_btw", Number(e.target.value))
                  }
                />
                <select
                  className="col-span-1 bg-transparent outline-none text-xs"
                  value={r.btw_tarief}
                  onChange={(e) =>
                    wijzig(i, "btw_tarief", Number(e.target.value))
                  }
                >
                  <option value={0}>0%</option>
                  <option value={0.06}>6%</option>
                  <option value={0.12}>12%</option>
                  <option value={0.21}>21%</option>
                </select>
                <div className="col-span-1 text-sm text-right font-mono">
                  {f(r.aantal * r.prijs_excl_btw)}
                </div>
                <button
                  type="button"
                  onClick={() => verwijder(i)}
                  className="col-span-1 text-red-600 hover:bg-red-50 rounded p-1 justify-self-end"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="p-4 border-t bg-muted/30">
          <div className="max-w-sm ml-auto space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotaal excl. btw</span>
              <span className="font-mono">{f(totalen.sub)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">BTW</span>
              <span className="font-mono">{f(totalen.btw)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2 text-enervia-700">
              <span>Totaal incl. btw</span>
              <span className="font-mono">{f(totalen.totaal)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Opslaan..." : "Bestelbon aanmaken"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
