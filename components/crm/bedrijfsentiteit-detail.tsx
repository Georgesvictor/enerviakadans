"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";

const SUB_TABS = [
  { code: "info", label: "Bedrijfsinformatie" },
  { code: "voorwaarden", label: "Algemene voorwaarden" },
  { code: "peppol", label: "Peppol" },
  { code: "boekhouding", label: "Boekhouding" },
];

export function BedrijfsentiteitDetail({ entity: initial }: { entity: any }) {
  const router = useRouter();
  const [tab, setTab] = useState<"info" | "voorwaarden" | "peppol" | "boekhouding">(
    "info",
  );
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [e, setE] = useState<any>(initial);

  function set<K extends string>(k: K, v: unknown) {
    setE((prev: any) => ({ ...prev, [k]: v }));
  }

  async function bewaar() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bedrijfsentiteiten/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(e),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      toast({ title: "Opgeslagen", variant: "success" });
      setEdit(false);
      router.refresh();
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

  async function maakStandaard() {
    setBusy(true);
    try {
      await fetch(`/api/bedrijfsentiteiten/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      toast({ title: "Ingesteld als standaard", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Fout bij activeren", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b">
        {SUB_TABS.map((t) => (
          <button
            key={t.code}
            onClick={() => setTab(t.code as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.code
                ? "border-enervia-600 text-enervia-700"
                : "border-transparent text-muted-foreground hover:text-enervia-700"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        {edit ? (
          <div className="flex gap-1 p-2">
            <Button size="sm" onClick={bewaar} disabled={busy}>
              <Save size={14} /> {busy ? "Opslaan..." : "Bewaren"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setE(initial);
                setEdit(false);
              }}
            >
              <X size={14} /> Annuleren
            </Button>
          </div>
        ) : (
          <div className="flex gap-1 p-2">
            {!initial.is_default && (
              <Button size="sm" variant="outline" onClick={maakStandaard}>
                Maak standaard
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
              <Pencil size={14} /> Bewerken
            </Button>
          </div>
        )}
      </div>

      <div className="p-5">
        {tab === "info" && (
          <Bedrijfsinformatie e={e} edit={edit} set={set} />
        )}
        {tab === "voorwaarden" && (
          <AlgemeneVoorwaarden e={e} edit={edit} set={set} />
        )}
        {tab === "peppol" && <PeppolTab e={e} edit={edit} set={set} />}
        {tab === "boekhouding" && (
          <BoekhoudingTab e={e} edit={edit} set={set} />
        )}
      </div>
    </div>
  );
}

function Bedrijfsinformatie({
  e,
  edit,
  set,
}: {
  e: any;
  edit: boolean;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Beheer je bedrijfs- en bankgegevens. Deze info verschijnt op alle
        offertes en facturen die uit deze entiteit worden verstuurd.
      </p>

      <Section titel="Bedrijfsinformatie">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Veld label="Btw" value={e.btw_nummer} edit={edit} onChange={(v) => set("btw_nummer", v)} placeholder="BE0123456789" />
          <Veld label="KBO-nummer" value={e.kbo_nummer} edit={edit} onChange={(v) => set("kbo_nummer", v)} />
          <Veld label="Telefoon" value={e.telefoon} edit={edit} onChange={(v) => set("telefoon", v)} />
          <Veld label="Bedrijfsadres" value={[e.adres_straat, e.postcode, e.gemeente].filter(Boolean).join(", ")} edit={false} />
          {edit && (
            <>
              <Veld label="Adres straat + nr" value={e.adres_straat} edit onChange={(v) => set("adres_straat", v)} />
              <div className="grid grid-cols-2 gap-2">
                <Veld label="Postcode" value={e.postcode} edit onChange={(v) => set("postcode", v)} />
                <Veld label="Gemeente" value={e.gemeente} edit onChange={(v) => set("gemeente", v)} />
              </div>
            </>
          )}
          <Veld label="E-mail" value={e.email} edit={edit} onChange={(v) => set("email", v)} type="email" />
          <Veld label="Facturatie e-mailadres" value={e.email_facturatie} edit={edit} onChange={(v) => set("email_facturatie", v)} type="email" />
          <Veld label="Website" value={e.website} edit={edit} onChange={(v) => set("website", v)} />
          <Veld label="Datumnotatie" value={e.datum_formaat} edit={edit} onChange={(v) => set("datum_formaat", v)} />
          <Veld label="Fax" value={e.fax} edit={edit} onChange={(v) => set("fax", v)} />
          <Veld label="Korte afkorting" value={e.korte_afkorting} edit={edit} onChange={(v) => set("korte_afkorting", v)} placeholder="EBV" />
        </div>
      </Section>

      <Section titel="Bankgegevens">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Veld label="Bank" value={e.bank_naam} edit={edit} onChange={(v) => set("bank_naam", v)} />
          <Veld label="IBAN" value={e.iban} edit={edit} onChange={(v) => set("iban", v)} />
          <Veld label="Swift/BIC" value={e.bic} edit={edit} onChange={(v) => set("bic", v)} />
          <Veld label="IBAN (2)" value={e.iban_2} edit={edit} onChange={(v) => set("iban_2", v)} />
          <Veld label="Intrest %" value={e.intrest_pct} edit={edit} onChange={(v) => set("intrest_pct", Number(v))} type="number" />
          <Veld label="Schadebeding %" value={e.schadebeding_pct} edit={edit} onChange={(v) => set("schadebeding_pct", Number(v))} type="number" />
          <Veld label="Minimum schadebeding" value={e.schadebeding_min} edit={edit} onChange={(v) => set("schadebeding_min", Number(v))} type="number" prefix="€" />
          <Veld label="Betalingstermijn (dagen)" value={e.betalingstermijn_dagen} edit={edit} onChange={(v) => set("betalingstermijn_dagen", Number(v))} type="number" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <Toggle
            label="Bereken intrest op basis van eerste herinnering voor klanten zonder btw"
            value={e.intrest_op_eerste_herinnering}
            edit={edit}
            onChange={(v) => set("intrest_op_eerste_herinnering", v)}
          />
          <Toggle
            label="Schadebeding begrenzen op basis van het verschuldigde bedrag voor klanten zonder btw"
            value={e.schadebeding_begrenzen_op_btw}
            edit={edit}
            onChange={(v) => set("schadebeding_begrenzen_op_btw", v)}
          />
        </div>
      </Section>
    </div>
  );
}

function AlgemeneVoorwaarden({
  e,
  edit,
  set,
}: {
  e: any;
  edit: boolean;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Algemene voorwaarden worden onderaan elke offerte en factuur weergegeven
        die met deze entiteit wordt aangemaakt.
      </p>
      {edit ? (
        <textarea
          className="w-full min-h-[300px] rounded border bg-background px-3 py-2 text-sm font-mono"
          value={e.algemene_voorwaarden ?? ""}
          onChange={(ev) => set("algemene_voorwaarden", ev.target.value)}
          placeholder="<p>1. Alle facturen zijn betaalbaar binnen 30 dagen...</p>"
        />
      ) : (
        <div
          className="prose prose-sm max-w-none border rounded p-4 bg-muted/20"
          dangerouslySetInnerHTML={{
            __html:
              e.algemene_voorwaarden ?? "<em>Nog geen voorwaarden ingesteld.</em>",
          }}
        />
      )}
    </div>
  );
}

function PeppolTab({
  e,
  edit,
  set,
}: {
  e: any;
  edit: boolean;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Peppol is verplicht voor B2B-facturatie in België vanaf 2026. Configureer
        hier het Peppol-identifier voor deze entiteit.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Toggle
          label="Peppol actief"
          value={e.peppol_actief}
          edit={edit}
          onChange={(v) => set("peppol_actief", v)}
        />
        <Toggle
          label="Alleen via Peppol verzenden"
          value={e.alleen_via_peppol}
          edit={edit}
          onChange={(v) => set("alleen_via_peppol", v)}
        />
        <Veld
          label="Identifier-type"
          value={e.peppol_identifier_type}
          edit={edit}
          onChange={(v) => set("peppol_identifier_type", v)}
          placeholder="0208"
        />
        <Veld
          label="Peppol identifier"
          value={e.peppol_identifier}
          edit={edit}
          onChange={(v) => set("peppol_identifier", v)}
          placeholder="BE0123456789"
        />
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
        ℹ️ De Peppol identifier is meestal je BTW-nummer met type <code>0208</code>.
      </div>
    </div>
  );
}

function BoekhoudingTab({
  e,
  edit,
  set,
}: {
  e: any;
  edit: boolean;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Koppel je boekhoudpakket. Verzonden facturen worden automatisch
        gesynchroniseerd.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Boekhoudsysteem</Label>
          {edit ? (
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={e.boekhouding_systeem ?? ""}
              onChange={(ev) => set("boekhouding_systeem", ev.target.value)}
            >
              <option value="">— Geen koppeling —</option>
              <option value="billit">Billit</option>
              <option value="yuki">Yuki</option>
              <option value="exact">Exact Online</option>
              <option value="codabox">Codabox</option>
              <option value="winbooks">Winbooks</option>
            </select>
          ) : (
            <div className="text-sm py-2">
              {e.boekhouding_systeem ?? "—"}
            </div>
          )}
        </div>
        <Veld label="Klant-ID" value={e.boekhouding_klant_id} edit={edit} onChange={(v) => set("boekhouding_klant_id", v)} />
        <Veld label="API Key" value={e.boekhouding_api_key ? "••••••••" : ""} edit={edit} onChange={(v) => set("boekhouding_api_key", v)} type="password" />
        <Veld label="E-mail boekhouder" value={e.boekhouder_email} edit={edit} onChange={(v) => set("boekhouder_email", v)} type="email" />
      </div>
    </div>
  );
}

// ============ Helpers ============
function Section({
  titel,
  children,
}: {
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-3">
        {titel}
      </div>
      {children}
    </div>
  );
}

function Veld({
  label,
  value,
  edit,
  onChange,
  type = "text",
  placeholder,
  prefix,
}: {
  label: string;
  value: any;
  edit: boolean;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  prefix?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {edit && onChange ? (
        <div className="flex">
          {prefix && (
            <span className="inline-flex items-center px-2 border border-r-0 rounded-l bg-muted/40 text-sm">
              {prefix}
            </span>
          )}
          <Input
            type={type}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={prefix ? "rounded-l-none" : ""}
          />
        </div>
      ) : (
        <div className="text-sm py-1.5 min-h-[2rem]">
          {value || <span className="text-muted-foreground">—</span>}
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  value,
  edit,
  onChange,
}: {
  label: string;
  value: boolean;
  edit: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={!!value}
        disabled={!edit}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}
