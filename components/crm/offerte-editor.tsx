"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Search } from "lucide-react";
import { AIOfferteKnop } from "./ai-offerte-knop";

type Regel = {
  product_id?: string | null;
  omschrijving: string;
  beschrijving?: string;
  aantal: number;
  eenheid: string;
  prijs_excl_btw: number;
  aankoop_prijs_excl_btw?: number;
  korting_pct: number;
  btw_tarief: number;
  facturatie_methode: "stukprijs" | "tijd_materialen" | "vast_bedrag" | "termijnen";
  /** Type-kolom zoals Teamleader: eenmalige kosten, recurrent, korting, opmerking */
  regel_type?: "eenmalig" | "recurrent" | "korting" | "opmerking";
  is_kop?: boolean;
  _expanded?: boolean; // alleen UI-state
};

const REGEL_TYPES = [
  { code: "eenmalig", label: "Eenmalige kosten" },
  { code: "recurrent", label: "Maandelijks recurrent" },
  { code: "korting", label: "Korting" },
  { code: "opmerking", label: "Opmerking (geen prijs)" },
] as const;

type Template = {
  id: string;
  naam: string;
  inhoud_html: string;
  is_default: boolean;
};

type Props = {
  mode: "create" | "edit";
  id?: string;
  contacts: { id: string; voornaam: string; achternaam: string }[];
  companies: { id: string; naam: string }[];
  products: {
    id: string;
    code: string | null;
    naam: string;
    beschrijving?: string | null;
    prijs_excl_btw: number;
    aankoop_prijs?: number | null;
    btw_tarief: number;
    eenheid: string;
  }[];
  deals: { id: string; titel: string }[];
  templates?: Template[];
  entities?: { id: string; naam: string; is_default: boolean }[];
  initial: {
    onderwerp: string;
    contact_id?: string | null;
    company_id?: string | null;
    deal_id?: string | null;
    business_entity_id?: string | null;
    geldig_tot?: string | null;
    template_id?: string | null;
    begeleidende_tekst_html?: string;
    opmerkingen?: string;
    voorwaarden?: string;
    korting_pct: number;
    inclusief_btw?: boolean;
    regels: Regel[];
  };
};

export function OfferteEditor(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const defaultTemplate =
    props.initial.template_id
      ? props.templates?.find((t) => t.id === props.initial.template_id)
      : props.templates?.find((t) => t.is_default);

  const defaultEntity = props.entities?.find((e) => e.is_default);
  const [head, setHead] = useState({
    onderwerp: props.initial.onderwerp,
    contact_id: props.initial.contact_id ?? "",
    company_id: props.initial.company_id ?? "",
    deal_id: props.initial.deal_id ?? "",
    business_entity_id:
      props.initial.business_entity_id ?? defaultEntity?.id ?? "",
    geldig_tot: props.initial.geldig_tot ?? "",
    template_id: props.initial.template_id ?? defaultTemplate?.id ?? "",
    begeleidende_tekst_html:
      props.initial.begeleidende_tekst_html ??
      defaultTemplate?.inhoud_html ??
      "",
    opmerkingen: props.initial.opmerkingen ?? "",
    voorwaarden: props.initial.voorwaarden ?? "",
    korting_pct: props.initial.korting_pct,
    inclusief_btw: props.initial.inclusief_btw ?? false,
  });

  const [regels, setRegels] = useState<Regel[]>(
    props.initial.regels.length > 0 ? props.initial.regels : [],
  );

  function pickTemplate(id: string) {
    const t = props.templates?.find((x) => x.id === id);
    if (!t) return;
    if (
      head.begeleidende_tekst_html.trim() &&
      head.begeleidende_tekst_html !== t.inhoud_html &&
      !confirm("Huidige begeleidende tekst overschrijven?")
    )
      return;
    setHead((h) => ({ ...h, template_id: id, begeleidende_tekst_html: t.inhoud_html }));
  }

  function addLeegLijn(insertAfterIdx?: number) {
    const newR: Regel = {
      omschrijving: "",
      aantal: 1,
      eenheid: "stuk",
      prijs_excl_btw: 0,
      korting_pct: 0,
      btw_tarief: 0.21,
      facturatie_methode: "stukprijs",
    };
    setRegels((arr) => {
      if (insertAfterIdx === undefined) return [...arr, newR];
      const copy = [...arr];
      copy.splice(insertAfterIdx + 1, 0, newR);
      return copy;
    });
  }

  function addKop(insertAfterIdx?: number) {
    const titel = window.prompt("Titel van de sectie:");
    if (!titel) return;
    const newR: Regel = {
      omschrijving: titel,
      aantal: 0,
      eenheid: "",
      prijs_excl_btw: 0,
      korting_pct: 0,
      btw_tarief: 0,
      facturatie_methode: "stukprijs",
      is_kop: true,
    };
    setRegels((arr) => {
      if (insertAfterIdx === undefined) return [...arr, newR];
      const copy = [...arr];
      copy.splice(insertAfterIdx + 1, 0, newR);
      return copy;
    });
  }

  function addProduct(productId: string) {
    const p = props.products.find((x) => x.id === productId);
    if (!p) return;
    setRegels((r) => [
      ...r,
      {
        product_id: p.id,
        omschrijving: p.naam,
        beschrijving: p.beschrijving ?? "",
        aantal: 1,
        eenheid: p.eenheid,
        prijs_excl_btw: Number(p.prijs_excl_btw),
        aankoop_prijs_excl_btw: Number(p.aankoop_prijs ?? 0),
        korting_pct: 0,
        btw_tarief: Number(p.btw_tarief),
        facturatie_methode: "stukprijs",
      },
    ]);
  }

  function wijzig(i: number, key: keyof Regel, v: unknown) {
    setRegels((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  function toggleExpand(i: number) {
    setRegels((rs) =>
      rs.map((r, idx) => (idx === i ? { ...r, _expanded: !r._expanded } : r)),
    );
  }

  function verwijder(i: number) {
    setRegels((rs) => rs.filter((_, idx) => idx !== i));
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= regels.length) return;
    const copy = [...regels];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setRegels(copy);
  }

  // Auto-complete: wanneer omschrijving van een nieuwe regel matchet met product → suggesties
  function onOmschrijvingChange(idx: number, val: string) {
    wijzig(idx, "omschrijving", val);
  }

  function pickProductFromAutocomplete(idx: number, productId: string) {
    const p = props.products.find((x) => x.id === productId);
    if (!p) return;
    setRegels((rs) =>
      rs.map((r, i) =>
        i === idx
          ? {
              ...r,
              product_id: p.id,
              omschrijving: p.naam,
              beschrijving: p.beschrijving ?? r.beschrijving ?? "",
              eenheid: p.eenheid,
              prijs_excl_btw: Number(p.prijs_excl_btw),
              aankoop_prijs_excl_btw: Number(p.aankoop_prijs ?? 0),
              btw_tarief: Number(p.btw_tarief),
            }
          : r,
      ),
    );
  }

  // Totalen
  const totalen = useMemo(() => {
    const bruto = regels.reduce((s, r) => {
      if (r.is_kop) return s;
      const v = r.aantal * r.prijs_excl_btw * (1 - (r.korting_pct ?? 0) / 100);
      return s + v;
    }, 0);
    const kortingBedrag = bruto * (head.korting_pct / 100);
    const sub = bruto - kortingBedrag;
    const factor = bruto > 0 ? sub / bruto : 1;
    let btw = 0;
    for (const r of regels) {
      if (r.is_kop) continue;
      btw +=
        r.aantal * r.prijs_excl_btw * (1 - (r.korting_pct ?? 0) / 100) *
        factor *
        r.btw_tarief;
    }
    const marge = regels.reduce((s, r) => {
      if (r.is_kop) return s;
      const inkomsten = r.aantal * r.prijs_excl_btw * (1 - (r.korting_pct ?? 0) / 100);
      const kost = r.aantal * (r.aankoop_prijs_excl_btw ?? 0);
      return s + (inkomsten - kost);
    }, 0);
    return {
      sub: round2(sub),
      btw: round2(btw),
      totaal: round2(sub + btw),
      marge: round2(marge),
    };
  }, [regels, head.korting_pct]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...head,
        contact_id: head.contact_id || null,
        company_id: head.company_id || null,
        deal_id: head.deal_id || null,
        business_entity_id: head.business_entity_id || null,
        template_id: head.template_id || null,
        geldig_tot: head.geldig_tot || null,
        regels: regels.map((r) => {
          const { _expanded, ...rest } = r;
          return rest;
        }),
      };
      const url =
        props.mode === "create"
          ? "/api/offertes"
          : `/api/offertes/${props.id}`;
      const method = props.mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      const data = await res.json();
      toast({ title: "Offerte opgeslagen", variant: "success" });
      router.push(`/app/offertes/${data.id ?? props.id}`);
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
      {/* ---------- Header ---------- */}
      <section className="bg-white rounded-lg border p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>
            Naam van de offerte <span className="text-red-600">*</span>
          </Label>
          <Input
            required
            value={head.onderwerp}
            onChange={(e) => setHead({ ...head, onderwerp: e.target.value })}
            placeholder="Offerte 358"
          />
        </div>
        <div>
          <Label>Munteenheid</Label>
          <select className="w-full h-9 rounded-md border bg-background px-3 text-sm">
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
        {props.entities && props.entities.length > 0 && (
          <div>
            <Label>
              Bedrijfsentiteit <span className="text-red-600">*</span>
            </Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={head.business_entity_id}
              onChange={(e) =>
                setHead({ ...head, business_entity_id: e.target.value })
              }
              required
            >
              {props.entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.naam}
                  {ent.is_default ? " (standaard)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Bepaalt header, IBAN, voorwaarden op de PDF.
            </p>
          </div>
        )}
        <div>
          <Label>Lay-out</Label>
          <Input value="Standaard" disabled />
        </div>
        <div>
          <Label>Klant</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={head.company_id || head.contact_id}
            onChange={(e) => {
              // Probeer eerst als company, anders contact
              const v = e.target.value;
              if (props.companies.find((c) => c.id === v))
                setHead({ ...head, company_id: v, contact_id: "" });
              else setHead({ ...head, contact_id: v, company_id: "" });
            }}
          >
            <option value="">—</option>
            <optgroup label="Bedrijven">
              {props.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.naam}
                </option>
              ))}
            </optgroup>
            <optgroup label="Personen">
              {props.contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.voornaam} {c.achternaam}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <Label>Deal</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={head.deal_id}
            onChange={(e) => setHead({ ...head, deal_id: e.target.value })}
          >
            <option value="">—</option>
            {props.deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.titel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Geldig tot en met</Label>
          <Input
            type="date"
            value={head.geldig_tot}
            onChange={(e) => setHead({ ...head, geldig_tot: e.target.value })}
          />
        </div>
        <div>
          <Label>Globale korting (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={head.korting_pct}
            onChange={(e) =>
              setHead({ ...head, korting_pct: Number(e.target.value) })
            }
          />
        </div>
      </section>

      {/* ---------- Begeleidende tekst ---------- */}
      <section className="bg-white rounded-lg border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-enervia-700">Begeleidende tekst</h2>
          {props.templates && props.templates.length > 0 && (
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={head.template_id}
              onChange={(e) => pickTemplate(e.target.value)}
            >
              <option value="">— Geen template —</option>
              {props.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.naam}
                </option>
              ))}
            </select>
          )}
        </div>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[200px] font-mono"
          value={head.begeleidende_tekst_html}
          onChange={(e) =>
            setHead({ ...head, begeleidende_tekst_html: e.target.value })
          }
          placeholder="Begeleidende tekst (HTML)..."
        />
        <div className="text-xs text-muted-foreground">
          💡 Beschikbare merge-tags: <code>#DEAL_TITLE</code> ·{" "}
          <code>#OFFER_NR</code> · <code>#VALID_UNTIL_DATE</code> ·{" "}
          <code>#TODAY</code> · <code>#CUSTOMER_ADDRESS</code> ·{" "}
          <code>#PRICE_EXCL</code> · <code>#PRICE_INCL</code> ·{" "}
          <code>#SALE_CONTACT_PERSON</code> · <code>#MY_NAME</code> ·{" "}
          <code>#DEPARTMENT_NAME</code>
        </div>
      </section>

      {/* ---------- Items ---------- */}
      <section className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-enervia-700">Items op de offerte</h2>
            <div className="text-xs text-muted-foreground">
              Sleep ▲▼ om volgorde te wijzigen · klik ▶ voor details/beschrijving
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="radio"
                name="btw"
                checked={!head.inclusief_btw}
                onChange={() => setHead({ ...head, inclusief_btw: false })}
              />
              Exclusief btw
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="radio"
                name="btw"
                checked={head.inclusief_btw}
                onChange={() => setHead({ ...head, inclusief_btw: true })}
              />
              Inclusief btw
            </label>
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
                  {p.code ? `[${p.code}] ` : ""}{p.naam}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={() => addLeegLijn()}>
              <Plus size={14} /> Lijn
            </Button>
            <Button type="button" variant="outline" onClick={() => addKop()}>
              <Plus size={14} /> Titel
            </Button>
            <AIOfferteKnop
              klantNaam={
                props.contacts.find((c) => c.id === head.contact_id)
                  ?.voornaam ?? undefined
              }
              defaultBtw={0.21}
              onGegenereerd={(nieuweRegels) => {
                setRegels((curr) => [...curr, ...(nieuweRegels as any)]);
              }}
            />
          </div>
        </div>

        {regels.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nog geen regels. Klik <strong>+ Titel</strong> voor een sectie of{" "}
            <strong>+ Lijn</strong> voor een product/dienst.
          </div>
        ) : (
          <div className="divide-y">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground bg-muted/30">
              <div className="col-span-1"></div>
              <div className="col-span-3">Beschrijving</div>
              <div className="col-span-1 text-right">Aantal</div>
              <div className="col-span-1">Eenheid</div>
              <div className="col-span-2 text-right">Eenheidsprijs</div>
              <div className="col-span-1 text-right">Subtotaal</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Btw</div>
              <div className="col-span-1"></div>
            </div>
            {regels.map((r, i) => (
              <RegelRow
                key={i}
                r={r}
                idx={i}
                products={props.products}
                isLast={i === regels.length - 1}
                onOmschrijving={(v) => onOmschrijvingChange(i, v)}
                onPickProduct={(pid) => pickProductFromAutocomplete(i, pid)}
                onChange={(k, v) => wijzig(i, k, v)}
                onMove={(d) => move(i, d)}
                onToggleExpand={() => toggleExpand(i)}
                onVerwijder={() => verwijder(i)}
                onAddLijnNa={() => addLeegLijn(i)}
                onAddKopNa={() => addKop(i)}
                f={f}
              />
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
            <div className="flex justify-between text-xs text-emerald-600 border-t pt-2">
              <span>Marge (uit aankoopprijzen)</span>
              <span className="font-mono">{f(totalen.marge)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2 sticky bottom-0 bg-background py-3 border-t">
        <Button type="submit" disabled={busy}>
          {busy
            ? "Opslaan..."
            : props.mode === "create"
              ? "Offerte aanmaken"
              : "Opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/offertes")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// =================================================================
// RegelRow met auto-complete + expand voor beschrijving
// =================================================================

function RegelRow({
  r,
  idx,
  products,
  onOmschrijving,
  onPickProduct,
  onChange,
  onMove,
  onToggleExpand,
  onVerwijder,
  onAddLijnNa,
  onAddKopNa,
  isLast,
  f,
}: {
  r: Regel;
  idx: number;
  products: Props["products"];
  onOmschrijving: (v: string) => void;
  onPickProduct: (productId: string) => void;
  onChange: (k: keyof Regel, v: unknown) => void;
  onMove: (dir: -1 | 1) => void;
  onToggleExpand: () => void;
  onVerwijder: () => void;
  onAddLijnNa: () => void;
  onAddKopNa: () => void;
  isLast: boolean;
  f: (n: number) => string;
}) {
  const [showSuggest, setShowSuggest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggesties = useMemo(() => {
    if (!r.omschrijving || r.product_id) return [];
    const q = r.omschrijving.toLowerCase().trim();
    if (q.length < 2) return [];
    return products
      .filter(
        (p) =>
          p.naam.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [r.omschrijving, r.product_id, products]);

  return (
    <>
      <div
        className={`grid grid-cols-12 gap-2 px-3 py-2 items-start ${
          r.is_kop ? "bg-enervia-50/60 font-semibold" : ""
        } ${r._expanded ? "bg-blue-50/30" : ""}`}
      >
        <div className="col-span-1 flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleExpand}
            title="Toon/verberg beschrijving"
            className="text-muted-foreground hover:text-enervia-700"
          >
            {r._expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onMove(-1)}
              className="text-muted-foreground hover:text-enervia-600 leading-none"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              className="text-muted-foreground hover:text-enervia-600 leading-none"
            >
              ▼
            </button>
          </div>
        </div>

        <div className="col-span-3 relative">
          <input
            ref={inputRef}
            className={`w-full bg-transparent outline-none text-sm ${
              r.is_kop ? "font-semibold text-enervia-700 text-base" : ""
            }`}
            placeholder={r.is_kop ? "Sectietitel..." : "Omschrijving (typ 'zon' voor zonnepanelen)"}
            value={r.omschrijving}
            onChange={(e) => {
              onOmschrijving(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
          />
          {showSuggest && suggesties.length > 0 && !r.is_kop && (
            <div className="absolute left-0 right-0 top-full z-30 bg-white border rounded shadow-lg max-h-72 overflow-y-auto">
              {suggesties.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    onPickProduct(p.id);
                    setShowSuggest(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-enervia-50 text-sm border-b last:border-b-0"
                >
                  <div className="font-medium flex items-center gap-2">
                    {p.code && (
                      <span className="text-xs font-mono bg-muted px-1.5 rounded">
                        {p.code}
                      </span>
                    )}
                    {p.naam}
                  </div>
                  {p.beschrijving && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {p.beschrijving}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>
                      €{" "}
                      {Number(p.prijs_excl_btw).toLocaleString("nl-BE", {
                        minimumFractionDigits: 2,
                      })}
                      /{p.eenheid}
                    </span>
                    <span>·</span>
                    <span>{(p.btw_tarief * 100).toFixed(0)}% btw</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {!r.is_kop ? (
          <>
            <input
              type="number"
              step="0.01"
              className="col-span-1 bg-transparent outline-none text-sm text-right"
              value={r.aantal}
              onChange={(e) => onChange("aantal", Number(e.target.value))}
            />
            <input
              className="col-span-1 bg-transparent outline-none text-xs text-muted-foreground"
              value={r.eenheid}
              onChange={(e) => onChange("eenheid", e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              className="col-span-2 bg-transparent outline-none text-sm text-right"
              value={r.prijs_excl_btw}
              onChange={(e) =>
                onChange("prijs_excl_btw", Number(e.target.value))
              }
            />
            <div className="col-span-1 text-right text-sm font-mono">
              {f(r.aantal * r.prijs_excl_btw * (1 - (r.korting_pct ?? 0) / 100))}
            </div>
            <select
              className="col-span-1 bg-transparent outline-none text-xs"
              value={r.regel_type ?? "eenmalig"}
              onChange={(e) =>
                onChange("regel_type", e.target.value as Regel["regel_type"])
              }
              title="Type kost"
            >
              {REGEL_TYPES.map((rt) => (
                <option key={rt.code} value={rt.code}>
                  {rt.label}
                </option>
              ))}
            </select>
            <select
              className="col-span-1 bg-transparent outline-none text-xs"
              value={r.btw_tarief}
              onChange={(e) => onChange("btw_tarief", Number(e.target.value))}
            >
              <option value={0}>0%</option>
              <option value={0.06}>6%</option>
              <option value={0.12}>12%</option>
              <option value={0.21}>21%</option>
            </select>
          </>
        ) : (
          <div className="col-span-7"></div>
        )}

        <div className="col-span-1 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onVerwijder}
            className="text-red-600 hover:bg-red-50 rounded p-1"
            title="Verwijder regel"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded panel: beschrijving + facturatie-methode + aankoopprijs + korting */}
      {r._expanded && !r.is_kop && (
        <div className="px-3 pb-3 pt-1 bg-blue-50/30 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <Label className="text-xs">Beschrijving (lange tekst voor offerte)</Label>
            <textarea
              className="w-full rounded border bg-background px-2 py-1 text-sm min-h-[60px]"
              value={r.beschrijving ?? ""}
              onChange={(e) => onChange("beschrijving", e.target.value)}
              placeholder="Bv. 12x JA Solar 505 Wp full black, inclusief omvormer en AREI-keuring..."
            />
          </div>
          <div>
            <Label className="text-xs">Facturatie-methode</Label>
            <select
              className="w-full h-8 rounded border bg-background px-2 text-xs"
              value={r.facturatie_methode}
              onChange={(e) =>
                onChange("facturatie_methode", e.target.value as any)
              }
            >
              <option value="stukprijs">Stukprijs</option>
              <option value="tijd_materialen">Tijd & materialen</option>
              <option value="vast_bedrag">Vast bedrag</option>
              <option value="termijnen">Termijnen</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Aankoopprijs (excl. btw)</Label>
            <Input
              type="number"
              step="0.01"
              className="h-8"
              value={r.aankoop_prijs_excl_btw ?? 0}
              onChange={(e) =>
                onChange("aankoop_prijs_excl_btw", Number(e.target.value))
              }
            />
          </div>
          <div>
            <Label className="text-xs">Regel-korting (%)</Label>
            <Input
              type="number"
              step="0.01"
              className="h-8"
              value={r.korting_pct}
              onChange={(e) => onChange("korting_pct", Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Quick-add knoppen onder elke regel */}
      <div className="px-3 pb-1 pt-0.5 flex gap-2 text-xs">
        <button
          type="button"
          onClick={onAddLijnNa}
          className="text-muted-foreground hover:text-enervia-700"
        >
          + Lijn
        </button>
        <button
          type="button"
          onClick={onAddKopNa}
          className="text-muted-foreground hover:text-enervia-700"
        >
          + Titel
        </button>
      </div>
    </>
  );
}
