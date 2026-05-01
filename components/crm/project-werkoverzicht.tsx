"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";

type Line = {
  id: string;
  groep: string | null;
  groep_volgorde: number;
  is_kop: boolean;
  omschrijving: string;
  beschrijving: string | null;
  aantal: number;
  eenheid: string;
  prijs_excl_btw: number;
  status: string;
  toegewezen_aan: string | null;
  begin_datum: string | null;
  eind_datum: string | null;
  is_extra_werk: boolean;
  extra_status: string | null;
  reeds_gefactureerd_aantal: number;
  volgorde: number;
  users?: { email: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  to_do: "To do",
  lopend: "Lopend",
  on_hold: "On hold",
  klaar: "Klaar",
};

const STATUS_KLEUR: Record<string, string> = {
  to_do: "bg-slate-100 text-slate-700",
  lopend: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
  klaar: "bg-green-100 text-green-700",
};

export function ProjectWerkoverzicht({
  projectId,
  lines: initial,
  members,
}: {
  projectId: string;
  lines: Line[];
  members: { id: string; email: string }[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(initial);
  const [busy, setBusy] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(lines.filter((l) => l.is_kop).map((l) => l.omschrijving)),
  );

  // Groepeer regels per "groep" (= laatste is_kop boven de regel of "Algemeen")
  const groepen = useMemo(() => {
    const result: { titel: string; kopId: string | null; lines: Line[]; voltooid: number; totaal: number }[] = [];
    let huidigeGroep: { titel: string; kopId: string | null; lines: Line[] } = {
      titel: "Algemeen",
      kopId: null,
      lines: [],
    };
    for (const l of lines) {
      if (l.is_kop) {
        if (huidigeGroep.lines.length > 0) result.push({ ...huidigeGroep, voltooid: 0, totaal: 0 } as any);
        huidigeGroep = { titel: l.omschrijving, kopId: l.id, lines: [] };
      } else {
        huidigeGroep.lines.push(l);
      }
    }
    if (huidigeGroep.lines.length > 0 || huidigeGroep.kopId)
      result.push({ ...huidigeGroep, voltooid: 0, totaal: 0 } as any);
    // Bereken voltooid + totaal
    return result.map((g) => ({
      ...g,
      totaal: g.lines.length,
      voltooid: g.lines.filter((l) => l.status === "klaar").length,
    }));
  }, [lines]);

  function toggleGroup(naam: string) {
    setOpenGroups((s) => {
      const n = new Set(s);
      if (n.has(naam)) n.delete(naam);
      else n.add(naam);
      return n;
    });
  }

  async function addLijn(groepTitel: string, isKop = false, isExtra = false) {
    const omschr = isKop
      ? window.prompt("Naam van de groep?")
      : window.prompt(isExtra ? "Naam van het extra werk?" : "Naam van de taak?");
    if (!omschr) return;
    let prijs = 0;
    let aantal = 1;
    if (isExtra && !isKop) {
      const prijsRaw = window.prompt("Prijs per stuk (excl. btw)?", "0");
      prijs = Number(prijsRaw ?? 0);
      const aantalRaw = window.prompt("Aantal?", "1");
      aantal = Number(aantalRaw ?? 1);
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/projecten/${projectId}/lines`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          omschrijving: omschr,
          is_kop: isKop,
          is_extra_werk: isExtra,
          aantal,
          prijs_excl_btw: prijs,
          groep: isKop ? null : groepTitel,
          volgorde: lines.length * 10 + 5,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      const newLine = await res.json();
      setLines((arr) => [...arr, newLine]);
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

  async function verstuurExtras() {
    const concept = lines.filter(
      (l) => l.is_extra_werk && l.extra_status === "concept",
    );
    if (concept.length === 0) {
      toast({ title: "Geen extra werken in concept", variant: "destructive" });
      return;
    }
    if (!confirm(`${concept.length} extra werken als mini-offerte naar klant?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projecten/${projectId}/extra-werken`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      const data = await res.json();
      toast({
        title: `Mini-offerte ${data.nummer} aangemaakt`,
        description: `Klant kan ondertekenen via /offerte/${data.klant_link_token}`,
        variant: "success",
      });
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

  async function update(lineId: string, key: keyof Line, val: unknown) {
    setLines((arr) =>
      arr.map((l) => (l.id === lineId ? { ...l, [key]: val } : l)),
    );
    try {
      await fetch(`/api/projecten/${projectId}/lines`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ line_id: lineId, [key]: val }),
      });
    } catch (err) {
      toast({
        title: "Wijziging niet opgeslagen",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  async function verwijder(lineId: string) {
    if (!confirm("Verwijder deze regel?")) return;
    try {
      await fetch(`/api/projecten/${projectId}/lines?line_id=${lineId}`, {
        method: "DELETE",
      });
      setLines((arr) => arr.filter((l) => l.id !== lineId));
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Type</span>
          <span>Status</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => addLijn("Algemeen", true)}
            disabled={busy}
          >
            <Plus size={14} /> Groep toevoegen
          </Button>
          <Button
            type="button"
            onClick={() => addLijn("Algemeen", false)}
            disabled={busy}
          >
            <Plus size={14} /> Taak toevoegen
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-orange-300 text-orange-700"
            onClick={() => addLijn("Algemeen", false, true)}
            disabled={busy}
          >
            <Plus size={14} /> Extra werk
          </Button>
          {lines.some(
            (l) => l.is_extra_werk && l.extra_status === "concept",
          ) && (
            <Button
              type="button"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={verstuurExtras}
              disabled={busy}
            >
              Verstuur extras ter goedkeuring
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs uppercase text-muted-foreground bg-muted/30 border-b">
          <div className="col-span-1"></div>
          <div className="col-span-4">Titel</div>
          <div className="col-span-2">Medewerkers</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Begin</div>
          <div className="col-span-1">Eind</div>
          <div className="col-span-1"></div>
        </div>

        {groepen.map((g) => {
          const open = openGroups.has(g.titel);
          const pct = g.totaal > 0 ? (g.voltooid / g.totaal) * 100 : 0;
          return (
            <div key={g.titel}>
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-enervia-50/40 items-center border-b">
                <button
                  onClick={() => toggleGroup(g.titel)}
                  className="col-span-1 text-muted-foreground hover:text-enervia-700"
                >
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="col-span-4 font-semibold">{g.titel}</div>
                <div className="col-span-2"></div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">
                    {pct.toFixed(0)} % voltooid
                  </div>
                  <div className="bg-muted/40 h-1.5 rounded overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-enervia-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-1 text-xs text-muted-foreground">—</div>
                <div className="col-span-1 text-xs text-muted-foreground">—</div>
                <div className="col-span-1 text-right">⋮</div>
              </div>

              {open && (
                <>
                  {g.lines.map((l) => (
                    <div
                      key={l.id}
                      className="grid grid-cols-12 gap-2 px-4 py-2 items-center border-b hover:bg-muted/20"
                    >
                      <div className="col-span-1"></div>
                      <div className="col-span-4">
                        <input
                          className="w-full bg-transparent outline-none text-sm"
                          value={l.omschrijving}
                          onChange={(e) =>
                            setLines((arr) =>
                              arr.map((x) =>
                                x.id === l.id
                                  ? { ...x, omschrijving: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          onBlur={() => update(l.id, "omschrijving", l.omschrijving)}
                        />
                        {l.is_extra_werk && (
                          <Badge className="text-xs bg-orange-100 text-orange-700">
                            Extra werk · {l.extra_status}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-2">
                        <select
                          value={l.toegewezen_aan ?? ""}
                          onChange={(e) =>
                            update(l.id, "toegewezen_aan", e.target.value || null)
                          }
                          className="text-xs border rounded bg-white px-1.5 py-0.5 max-w-full truncate"
                        >
                          <option value="">—</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <select
                          value={l.status}
                          onChange={(e) => update(l.id, "status", e.target.value)}
                          className={`text-xs px-2 py-0.5 rounded border-0 ${
                            STATUS_KLEUR[l.status] ?? "bg-slate-100"
                          }`}
                        >
                          {Object.entries(STATUS_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <input
                          type="date"
                          value={l.begin_datum ?? ""}
                          onChange={(e) =>
                            update(l.id, "begin_datum", e.target.value || null)
                          }
                          className="text-xs bg-transparent border-0 outline-none w-full"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="date"
                          value={l.eind_datum ?? ""}
                          onChange={(e) =>
                            update(l.id, "eind_datum", e.target.value || null)
                          }
                          className="text-xs bg-transparent border-0 outline-none w-full"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => verwijder(l.id)}
                          className="text-red-600 hover:bg-red-50 rounded p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-2 border-b flex items-center justify-between">
                    <button
                      onClick={() => addLijn(g.titel, false)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      + Lijn toevoegen
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {g.voltooid}/{g.totaal} voltooid
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
