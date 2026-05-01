"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";

type Line = {
  id: string;
  groep: string | null;
  is_kop: boolean;
  omschrijving: string;
  aantal: number;
  eenheid: string;
  prijs_excl_btw: number;
  btw_tarief: number;
  facturatie_methode: string;
  reeds_gefactureerd_aantal: number;
};

type Invoice = {
  id: string;
  nummer: string | null;
  onderwerp: string;
  status: string;
  factuur_type: string;
  datum: string;
  totaal_incl_btw: number;
  reeds_betaald: number;
};

const METHODE_LABEL: Record<string, string> = {
  stukprijs: "Stukprijs",
  tijd_materialen: "Tijd & materialen",
  vast_bedrag: "Vast bedrag",
  termijnen: "Termijnen",
};

export function ProjectFacturen({
  projectId,
  invoices,
  lines,
  totaalPrijs,
  gefactureerd,
}: {
  projectId: string;
  invoices: Invoice[];
  lines: Line[];
  totaalPrijs: number;
  gefactureerd: number;
}) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [type, setType] = useState<"projectlijnen" | "manueel" | "voorschot">(
    "projectlijnen",
  );

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`;

  const pct = totaalPrijs > 0 ? (gefactureerd / totaalPrijs) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div
            className="w-16 h-16 rounded-full border-4 border-enervia-600 flex items-center justify-center text-sm font-bold"
            style={{
              background: `conic-gradient(#1F4D3F ${pct * 3.6}deg, #f3f4f6 0deg)`,
            }}
          >
            <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center">
              {pct.toFixed(0)}%
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">
                Totale prijs (excl. btw)
              </div>
              <div className="font-semibold">{f(totaalPrijs)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Gefactureerd bedrag
              </div>
              <div className="font-semibold">{f(gefactureerd)}</div>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          Factuur toevoegen
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-muted-foreground">
            Nog geen facturen voor dit project.{" "}
            <button
              onClick={() => setShowWizard(true)}
              className="text-enervia-600 hover:underline"
            >
              Voeg er één toe!
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Nr.</th>
                <th className="text-left px-4 py-2">Onderwerp</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Datum</th>
                <th className="text-right px-4 py-2">Totaal</th>
                <th className="text-right px-4 py-2">Betaald</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((i) => (
                <tr key={i.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs">{i.nummer ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/app/facturen/${i.id}`}
                      className="text-enervia-700 hover:underline"
                    >
                      {i.onderwerp}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <Badge variant="outline">{i.factuur_type}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {new Date(i.datum).toLocaleDateString("nl-BE")}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {f(i.totaal_incl_btw)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {f(i.reeds_betaald ?? 0)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge>{i.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showWizard && (
        <FactuurWizardModal
          onClose={() => setShowWizard(false)}
          type={type}
          onPickType={setType}
          projectId={projectId}
          lines={lines}
        />
      )}
    </div>
  );
}

function FactuurWizardModal({
  onClose,
  type,
  onPickType,
  projectId,
  lines,
}: {
  onClose: () => void;
  type: "projectlijnen" | "manueel" | "voorschot";
  onPickType: (t: any) => void;
  projectId: string;
  lines: Line[];
}) {
  const router = useRouter();
  const [stap, setStap] = useState<"keuze" | "lijnen">("keuze");
  const [selectie, setSelectie] = useState<
    Record<string, { aan: boolean; aantal: number }>
  >({});
  const [busy, setBusy] = useState(false);

  // Initialiseer selectie: voor elke factureerbare regel max te factureren = aantal - reeds_gefactureerd
  function init() {
    const init: typeof selectie = {};
    for (const l of lines) {
      if (l.is_kop) continue;
      const open = Number(l.aantal) - Number(l.reeds_gefactureerd_aantal);
      init[l.id] = { aan: open > 0, aantal: open };
    }
    setSelectie(init);
  }

  function ga(t: typeof type) {
    onPickType(t);
    if (t === "projectlijnen") {
      init();
      setStap("lijnen");
    } else if (t === "voorschot") {
      maakVoorschot();
    } else {
      // manueel = redirect naar standaard nieuwe factuur
      router.push(`/app/facturen/nieuw?project_id=${projectId}`);
    }
  }

  async function maakVoorschot() {
    const pctRaw = window.prompt("Voorschot in % van totaal (bv. 30):", "30");
    if (!pctRaw) return;
    const pct = Number(pctRaw);
    if (isNaN(pct) || pct <= 0 || pct >= 100) {
      toast({ title: "Ongeldig %", variant: "destructive" });
      return;
    }
    const totaal = lines.reduce(
      (s, l) =>
        l.is_kop ? s : s + Number(l.aantal) * Number(l.prijs_excl_btw),
      0,
    );
    const bedrag = totaal * (pct / 100);
    setBusy(true);
    try {
      const res = await fetch("/api/facturen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          onderwerp: `Voorschot ${pct}% — Project`,
          project_id: projectId,
          factuur_type: "voorschot",
          regels: [
            {
              omschrijving: `Voorschot ${pct}% op project`,
              aantal: 1,
              eenheid: "stuk",
              prijs_excl_btw: bedrag,
              btw_tarief: 0.21,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      const data = await res.json();
      toast({ title: "Voorschotfactuur aangemaakt", variant: "success" });
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

  async function maakUitLijnen() {
    const teFactureren = lines
      .filter((l) => !l.is_kop && selectie[l.id]?.aan && selectie[l.id]?.aantal > 0)
      .map((l) => ({
        project_line_id: l.id,
        omschrijving: l.omschrijving,
        aantal: selectie[l.id].aantal,
        eenheid: l.eenheid,
        prijs_excl_btw: l.prijs_excl_btw,
        btw_tarief: l.btw_tarief,
      }));
    if (teFactureren.length === 0) {
      toast({ title: "Geen lijnen geselecteerd", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/facturen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          onderwerp: "Factuur uit project",
          project_id: projectId,
          factuur_type: "termijn",
          regels: teFactureren,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      const data = await res.json();
      // Update reeds_gefactureerd_aantal op project_lines
      for (const r of teFactureren) {
        const huidig = lines.find((x) => x.id === r.project_line_id);
        if (huidig) {
          await fetch(`/api/projecten/${projectId}/lines`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              line_id: r.project_line_id,
              reeds_gefactureerd_aantal:
                Number(huidig.reeds_gefactureerd_aantal) + r.aantal,
            }),
          });
        }
      }
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

  const totaalSelectie = useMemo(() => {
    return lines.reduce((s, l) => {
      if (l.is_kop) return s;
      const sel = selectie[l.id];
      if (!sel?.aan) return s;
      return s + sel.aantal * Number(l.prijs_excl_btw);
    }, 0);
  }, [lines, selectie]);

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold text-enervia-700">
            {stap === "keuze"
              ? "Factuur voor project toevoegen"
              : "Selecteer projectlijnen om te factureren"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-enervia-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {stap === "keuze" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => ga("projectlijnen")}
                className={`border rounded-lg p-5 text-center transition ${
                  type === "projectlijnen"
                    ? "border-enervia-600 ring-2 ring-enervia-600/20"
                    : "hover:border-enervia-300"
                }`}
              >
                <div className="text-4xl mb-2">📄</div>
                <div className="font-semibold">
                  Factuur aanmaken op basis van projectlijnen
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Vink aan welke lijnen + aantallen je wil factureren.
                  Deelfacturatie ondersteund.
                </div>
              </button>
              <button
                onClick={() => ga("manueel")}
                className="border rounded-lg p-5 text-center hover:border-enervia-300"
              >
                <div className="text-4xl mb-2">📝</div>
                <div className="font-semibold">Manuele factuur aanmaken</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Standaard factuur-editor zonder voor-ingevulde lijnen.
                </div>
              </button>
              <button
                onClick={() => ga("voorschot")}
                disabled={busy}
                className="border rounded-lg p-5 text-center hover:border-enervia-300"
              >
                <div className="text-4xl mb-2">💰</div>
                <div className="font-semibold">Voorschotfactuur aanmaken</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Vraag een % van het totaal als voorschot.
                </div>
              </button>
            </div>
          )}

          {stap === "lijnen" && (
            <div className="space-y-2">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 w-8"></th>
                    <th className="text-left px-3 py-2">Titel</th>
                    <th className="text-left px-3 py-2">Methode</th>
                    <th className="text-right px-3 py-2">Aantal</th>
                    <th className="text-right px-3 py-2">Bedrag</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((l) => {
                    if (l.is_kop) {
                      return (
                        <tr key={l.id} className="bg-enervia-50/40">
                          <td colSpan={6} className="px-3 py-2 font-semibold">
                            {l.omschrijving}
                          </td>
                        </tr>
                      );
                    }
                    const open =
                      Number(l.aantal) - Number(l.reeds_gefactureerd_aantal);
                    const sel = selectie[l.id] ?? { aan: false, aantal: open };
                    const bedrag = sel.aantal * Number(l.prijs_excl_btw);
                    return (
                      <tr key={l.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={sel.aan}
                            disabled={open <= 0}
                            onChange={(e) =>
                              setSelectie((s) => ({
                                ...s,
                                [l.id]: { ...sel, aan: e.target.checked },
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">{l.omschrijving}</td>
                        <td className="px-3 py-2 text-xs">
                          {METHODE_LABEL[l.facturatie_methode] ?? l.facturatie_methode}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={sel.aantal}
                            min={0}
                            max={open}
                            disabled={!sel.aan}
                            onChange={(e) =>
                              setSelectie((s) => ({
                                ...s,
                                [l.id]: {
                                  ...sel,
                                  aantal: Math.min(open, Number(e.target.value)),
                                },
                              }))
                            }
                            className="h-7 text-right w-24 ml-auto"
                          />
                          <div className="text-xs text-muted-foreground">
                            van {l.aantal} {l.eenheid}
                            {l.reeds_gefactureerd_aantal > 0 &&
                              ` (${l.reeds_gefactureerd_aantal} gefactureerd)`}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {f(bedrag)}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {open <= 0 ? (
                            <Badge variant="outline">Gefactureerd</Badge>
                          ) : (
                            <Badge className="bg-blue-50 text-blue-700">
                              Factureerbaar
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-5 border-t bg-muted/20 flex items-center justify-between">
          <div>
            {stap === "lijnen" && (
              <div className="text-sm">
                Bedrag: <strong className="font-mono">{f(totaalSelectie)}</strong>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {stap === "lijnen" && (
              <Button variant="outline" onClick={() => setStap("keuze")}>
                Terug
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            {stap === "lijnen" && (
              <Button onClick={maakUitLijnen} disabled={busy || totaalSelectie <= 0}>
                {busy ? "Bezig..." : "Factuur aanmaken"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
