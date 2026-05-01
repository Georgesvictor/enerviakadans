"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

type Stage = {
  id: string;
  naam: string;
  volgorde: number;
  waarschijnlijkheid: number;
  kleur: string;
  categorie: "pre_sales" | "in_sales" | "refused" | "won";
  is_won: boolean;
  is_lost: boolean;
  rotting_dagen?: number;
};

type Pipeline = {
  id: string;
  naam: string;
  is_default: boolean;
  pipeline_stages: Stage[];
};

const CAT_KLEUREN: Record<string, { kleur: string; label: string; bg: string }> = {
  pre_sales: { kleur: "#3B82F6", label: "Voor verkoop", bg: "bg-blue-50" },
  in_sales: { kleur: "#10B981", label: "In verkoop", bg: "bg-emerald-50" },
  won: { kleur: "#1F4D3F", label: "Gewonnen", bg: "bg-enervia-50" },
  refused: { kleur: "#DC2626", label: "Geweigerd / verloren", bg: "bg-red-50" },
};

export function PipelineBeheer({ pipelines }: { pipelines: Pipeline[] }) {
  const router = useRouter();
  const [actief, setActief] = useState<Pipeline | null>(pipelines[0] ?? null);
  const [stages, setStages] = useState<Stage[]>(
    [...((pipelines[0]?.pipeline_stages ?? []) as Stage[])].sort(
      (a, b) => a.volgorde - b.volgorde,
    ),
  );
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  function pickPipeline(p: Pipeline) {
    setActief(p);
    setStages([...p.pipeline_stages].sort((a, b) => a.volgorde - b.volgorde));
    setDirty(false);
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= stages.length) return;
    const arr = [...stages];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setStages(arr.map((s, i) => ({ ...s, volgorde: (i + 1) * 10 })));
    setDirty(true);
  }

  function update<K extends keyof Stage>(idx: number, key: K, val: Stage[K]) {
    setStages((arr) =>
      arr.map((s, i) => (i === idx ? { ...s, [key]: val } : s)),
    );
    setDirty(true);
  }

  async function addStage() {
    if (!actief) return;
    const naam = window.prompt("Naam van de nieuwe fase?");
    if (!naam) return;
    const cat = window.prompt(
      "Categorie? (pre_sales / in_sales / won / refused)",
      "in_sales",
    ) as Stage["categorie"];
    if (!cat || !["pre_sales", "in_sales", "won", "refused"].includes(cat)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pipelines/stages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pipeline_id: actief.id,
          naam,
          categorie: cat,
          volgorde: (stages.length + 1) * 10,
          waarschijnlijkheid: cat === "won" ? 100 : cat === "refused" ? 0 : 50,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      router.refresh();
      toast({ title: "Fase toegevoegd", variant: "success" });
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

  async function verwijder(id: string) {
    if (!confirm("Fase verwijderen?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/pipelines/stages?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      router.refresh();
      toast({ title: "Fase verwijderd", variant: "success" });
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

  async function bewaar() {
    setBusy(true);
    try {
      const res = await fetch("/api/pipelines/stages", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stages: stages.map((s) => ({
            id: s.id,
            naam: s.naam,
            volgorde: s.volgorde,
            waarschijnlijkheid: s.waarschijnlijkheid,
            categorie: s.categorie,
            kleur: CAT_KLEUREN[s.categorie]?.kleur ?? s.kleur,
            rotting_dagen: s.rotting_dagen,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      setDirty(false);
      router.refresh();
      toast({ title: "Pipeline opgeslagen", variant: "success" });
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

  if (!actief) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Geen pipelines.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pipelines.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => pickPipeline(p)}
              className={`px-3 py-1.5 text-sm rounded ${
                actief.id === p.id
                  ? "bg-enervia-600 text-white"
                  : "bg-white border hover:bg-muted"
              }`}
            >
              {p.naam} {p.is_default && "·default"}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-enervia-700">
          Fases voor: {actief.naam}
        </h2>
        <div className="flex gap-2">
          <Button onClick={addStage} disabled={busy} variant="outline">
            <Plus size={14} /> Nieuwe fase
          </Button>
          <Button onClick={bewaar} disabled={busy || !dirty}>
            {busy ? "Opslaan..." : dirty ? "Wijzigingen opslaan" : "Opgeslagen"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase text-muted-foreground bg-muted/30 border-b">
          <div className="col-span-1"></div>
          <div className="col-span-3">Naam</div>
          <div className="col-span-2">Categorie</div>
          <div className="col-span-2 text-right">Slaagkans %</div>
          <div className="col-span-2 text-right">Rotting (dagen)</div>
          <div className="col-span-1"></div>
          <div className="col-span-1"></div>
        </div>
        {stages.map((s, idx) => (
          <div
            key={s.id}
            className={`grid grid-cols-12 gap-2 items-center px-3 py-2 border-b ${
              CAT_KLEUREN[s.categorie]?.bg ?? ""
            }`}
          >
            <div className="col-span-1 flex flex-col">
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="text-muted-foreground hover:text-enervia-600 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === stages.length - 1}
                className="text-muted-foreground hover:text-enervia-600 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <div className="col-span-3">
              <Input
                value={s.naam}
                onChange={(e) => update(idx, "naam", e.target.value)}
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <select
                value={s.categorie}
                onChange={(e) =>
                  update(
                    idx,
                    "categorie",
                    e.target.value as Stage["categorie"],
                  )
                }
                className="w-full h-8 rounded border bg-white px-2 text-xs"
              >
                {Object.entries(CAT_KLEUREN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                value={s.waarschijnlijkheid}
                onChange={(e) =>
                  update(idx, "waarschijnlijkheid", Number(e.target.value))
                }
                className="h-8 text-right"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                value={s.rotting_dagen ?? 14}
                onChange={(e) =>
                  update(idx, "rotting_dagen", Number(e.target.value))
                }
                className="h-8 text-right"
              />
            </div>
            <div className="col-span-1">
              <span
                className="inline-block w-4 h-4 rounded"
                style={{
                  backgroundColor:
                    CAT_KLEUREN[s.categorie]?.kleur ?? s.kleur,
                }}
              />
            </div>
            <div className="col-span-1 text-right">
              <button
                onClick={() => verwijder(s.id)}
                className="text-red-600 hover:bg-red-50 rounded p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        💡 <strong>Rotting</strong> = na hoeveel dagen zonder activiteit een
        deal als 'verlopen' wordt gemarkeerd in deze fase.
      </p>
    </div>
  );
}
