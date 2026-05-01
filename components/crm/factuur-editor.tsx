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
  korting_pct: number;
  btw_tarief: number;
  is_kop?: boolean;
};

type Props = {
  contacts: { id: string; voornaam: string; achternaam: string }[];
  companies: { id: string; naam: string }[];
  products: {
    id: string;
    code: string | null;
    naam: string;
    prijs_excl_btw: number;
    btw_tarief: number;
    eenheid: string;
  }[];
  entities?: {
    id: string;
    naam: string;
    is_default: boolean;
    btw_nummer?: string | null;
    iban?: string | null;
    betalingstermijn_dagen?: number | null;
  }[];
  initial: {
    onderwerp: string;
    contact_id?: string | null;
    company_id?: string | null;
    deal_id?: string | null;
    quotation_id?: string | null;
    business_entity_id?: string | null;
    betalingstermijn_dagen: number;
    korting_pct: number;
    regels: Regel[];
  };
};

export function FactuurEditor(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const defaultEntity = props.entities?.find((e) => e.is_default) ?? props.entities?.[0];
  const [head, setHead] = useState({
    onderwerp: props.initial.onderwerp,
    contact_id: props.initial.contact_id ?? "",
    company_id: props.initial.company_id ?? "",
    deal_id: props.initial.deal_id ?? "",
    quotation_id: props.initial.quotation_id ?? "",
    business_entity_id:
      props.initial.business_entity_id ?? defaultEntity?.id ?? "",
    betalingstermijn_dagen:
      props.initial.betalingstermijn_dagen ||
      defaultEntity?.betalingstermijn_dagen ||
      30,
    korting_pct: props.initial.korting_pct,
    opmerkingen: "",
  });
  const [regels, setRegels] = useState<Regel[]>(props.initial.regels);

  function addProduct(id: string) {
    const p = props.products.find((x) => x.id === id);
    if (!p) return;
    setRegels((r) => [
      ...r,
      {
        product_id: p.id,
        omschrijving: p.naam,
        aantal: 1,
        eenheid: p.eenheid,
        prijs_excl_btw: Number(p.prijs_excl_btw),
        korting_pct: 0,
        btw_tarief: Number(p.btw_tarief),
      },
    ]);
  }
  function addLeeg() {
    setRegels((r) => [
      ...r,
      { omschrijving: "", aantal: 1, eenheid: "stuk", prijs_excl_btw: 0, korting_pct: 0, btw_tarief: 0.21 },
    ]);
  }
  function wijzig(i: number, k: keyof Regel, v: unknown) {
    setRegels((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  function verwijder(i: number) {
    setRegels((rs) => rs.filter((_, idx) => idx !== i));
  }

  const totalen = useMemo(() => {
    const subRaw = regels.reduce(
      (s, r) =>
        r.is_kop ? s : s + r.aantal * r.prijs_excl_btw * (1 - r.korting_pct / 100),
      0,
    );
    const kortingBedrag = subRaw * (head.korting_pct / 100);
    const sub = subRaw - kortingBedrag;
    const factor = subRaw > 0 ? sub / subRaw : 1;
    let btw = 0;
    for (const r of regels) {
      if (r.is_kop) continue;
      btw +=
        r.aantal *
        r.prijs_excl_btw *
        (1 - r.korting_pct / 100) *
        factor *
        r.btw_tarief;
    }
    return {
      sub: Math.round(sub * 100) / 100,
      btw: Math.round(btw * 100) / 100,
      totaal: Math.round((sub + btw) * 100) / 100,
    };
  }, [regels, head.korting_pct]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/facturen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...head,
          contact_id: head.contact_id || null,
          company_id: head.company_id || null,
          deal_id: head.deal_id || null,
          quotation_id: head.quotation_id || null,
          business_entity_id: head.business_entity_id || null,
          regels,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      const data = await res.json();
      toast({ title: "Factuur aangemaakt", variant: "success" });
      router.push(`/app/facturen/${data.id}`);
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
          {props.entities && props.entities.length > 0 && (
            <div>
              <Label>
                Bedrijfsentiteit <span className="text-red-600">*</span>
              </Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={head.business_entity_id}
                onChange={(e) => {
                  const ent = props.entities!.find(
                    (x) => x.id === e.target.value,
                  );
                  setHead({
                    ...head,
                    business_entity_id: e.target.value,
                    betalingstermijn_dagen:
                      ent?.betalingstermijn_dagen ??
                      head.betalingstermijn_dagen,
                  });
                }}
              >
                {props.entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.naam}
                    {ent.btw_nummer ? ` (${ent.btw_nummer})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Bedrijf</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={head.company_id}
              onChange={(e) => setHead({ ...head, company_id: e.target.value })}
            >
              <option value="">—</option>
              {props.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.naam}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Contact</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={head.contact_id}
              onChange={(e) => setHead({ ...head, contact_id: e.target.value })}
            >
              <option value="">—</option>
              {props.contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.voornaam} {c.achternaam}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Betalingstermijn (dagen)</Label>
            <Input
              type="number"
              value={head.betalingstermijn_dagen}
              onChange={(e) =>
                setHead({
                  ...head,
                  betalingstermijn_dagen: Number(e.target.value),
                })
              }
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
              {props.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ""}
                  {p.naam}
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
                  {f(r.aantal * r.prijs_excl_btw * (1 - r.korting_pct / 100))}
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
          {busy ? "Opslaan..." : "Factuur aanmaken"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/facturen")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
