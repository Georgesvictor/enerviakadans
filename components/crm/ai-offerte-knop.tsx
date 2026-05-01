"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Sparkles, X, Loader2 } from "lucide-react";

type Regel = {
  product_id?: string | null;
  omschrijving: string;
  beschrijving?: string;
  aantal: number;
  eenheid: string;
  prijs_excl_btw: number;
  korting_pct?: number;
  btw_tarief: number;
  is_kop?: boolean;
};

export function AIOfferteKnop({
  onGegenereerd,
  klantNaam,
  defaultBtw = 0.21,
}: {
  onGegenereerd: (regels: Regel[], toelichting?: string) => void;
  klantNaam?: string;
  defaultBtw?: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [beschrijving, setBeschrijving] = useState("");
  const [type, setType] = useState<
    "renovatie" | "installatie" | "diensten" | "algemeen"
  >("algemeen");
  const [btw, setBtw] = useState(defaultBtw);

  async function genereer() {
    if (beschrijving.trim().length < 10) {
      toast({
        title: "Minimaal 10 tekens",
        description: "Beschrijf het project iets uitgebreider.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/offerte-genereren", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          beschrijving,
          klantNaam,
          type,
          btw_voorkeur: btw,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "AI gaf geen antwoord");
      }
      const data = await res.json();
      const regels: Regel[] = (data.regels ?? []).map((r: any) => ({
        product_id: r.product_id ?? null,
        omschrijving: r.omschrijving,
        beschrijving: r.beschrijving ?? null,
        aantal: Number(r.aantal ?? 1),
        eenheid: r.eenheid ?? "stuk",
        prijs_excl_btw: Number(r.prijs_excl_btw ?? 0),
        korting_pct: 0,
        btw_tarief: Number(r.btw_tarief ?? defaultBtw),
        is_kop: !!r.is_kop,
      }));
      onGegenereerd(regels, data.toelichting);
      toast({
        title: "Offerte gegenereerd",
        description: `${regels.length} regels toegevoegd. ${data.samenvatting ?? ""}`,
        variant: "success",
      });
      setOpen(false);
      setBeschrijving("");
    } catch (err) {
      toast({
        title: "AI fout",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200 text-violet-700 hover:from-violet-100 hover:to-blue-100"
      >
        <Sparkles size={14} /> AI genereer
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-xl border shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-violet-50 to-blue-50">
              <h2 className="font-semibold text-violet-700 flex items-center gap-2">
                <Sparkles size={18} /> AI Offerte-generator
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="hover:bg-white/50 rounded p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Wat moet er in de offerte komen?
                </label>
                <textarea
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[140px]"
                  value={beschrijving}
                  onChange={(e) => setBeschrijving(e.target.value)}
                  placeholder={`Bv: "Volledige dakrenovatie van 96 m². Verwijder asbest-platen, plaats nieuwe Koramic dakpannen met 140 mm PIR-isolatie, vernieuw bakgoten in zink. Klant is alleenstaande, woning ouder dan 10 jaar."`}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Hoe gedetailleerder, hoe beter het resultaat. AI gebruikt
                  je productcatalogus als input.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Type project</label>
                  <select
                    className="w-full mt-1 h-9 rounded-md border bg-background px-3 text-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    disabled={busy}
                  >
                    <option value="renovatie">Renovatie</option>
                    <option value="installatie">Installatie</option>
                    <option value="diensten">Diensten</option>
                    <option value="algemeen">Algemeen</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Standaard BTW</label>
                  <select
                    className="w-full mt-1 h-9 rounded-md border bg-background px-3 text-sm"
                    value={btw}
                    onChange={(e) => setBtw(Number(e.target.value))}
                    disabled={busy}
                  >
                    <option value={0.06}>6% (renovatie)</option>
                    <option value={0.12}>12%</option>
                    <option value={0.21}>21% (standaard)</option>
                    <option value={0}>0% (vrijgesteld)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Annuleren
              </Button>
              <Button onClick={genereer} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Bezig...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Genereer regels
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
