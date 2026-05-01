"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import {
  Plus,
  Trash2,
  Save,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Power,
  PowerOff,
} from "lucide-react";

type Rule = {
  id?: string;
  naam: string;
  beschrijving?: string | null;
  trigger: string;
  filter_jsonb: any;
  acties_jsonb: any[];
  is_actief: boolean;
  uitgevoerd_count?: number;
  laatst_uitgevoerd_op?: string | null;
};

type Run = {
  id: string;
  rule_id: string;
  trigger: string;
  resultaat: string;
  acties_uitgevoerd: number;
  created_at: string;
};

const TRIGGERS = [
  { code: "deal_won", label: "Deal gewonnen" },
  { code: "deal_lost", label: "Deal verloren" },
  { code: "deal_created", label: "Deal aangemaakt" },
  { code: "deal_stage_change", label: "Deal van fase verwisseld" },
  { code: "quotation_accepted", label: "Offerte aanvaard" },
  { code: "invoice_created", label: "Factuur aangemaakt" },
  { code: "invoice_paid", label: "Factuur betaald" },
  { code: "task_completed", label: "Taak voltooid" },
];

const ACTION_TYPES = [
  { code: "create_task", label: "Maak taak aan" },
  { code: "create_project", label: "Maak project aan" },
  { code: "add_note", label: "Voeg notitie toe" },
  { code: "set_status", label: "Wijzig status" },
];

const PRIORITY = [
  { code: "laag", label: "Laag" },
  { code: "normaal", label: "Normaal" },
  { code: "hoog", label: "Hoog" },
  { code: "urgent", label: "Urgent" },
];

const EMPTY: Rule = {
  naam: "",
  trigger: "deal_won",
  filter_jsonb: {},
  acties_jsonb: [],
  is_actief: true,
};

export function WorkflowsBeheer({
  rules,
  recentRuns,
}: {
  rules: Rule[];
  recentRuns: Run[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(r: Rule) {
    setEditing({ ...r });
  }

  function startNew() {
    setEditing({ ...EMPTY });
  }

  async function save() {
    if (!editing) return;
    if (!editing.naam.trim()) {
      toast({ title: "Naam verplicht", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/workflows", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fout");
      toast({ title: "Regel opgeslagen", variant: "success" });
      setEditing(null);
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

  async function verwijder() {
    if (!editing?.id) return;
    if (!confirm("Regel verwijderen?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/workflows?id=${editing.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Fout");
      toast({ title: "Verwijderd", variant: "success" });
      setEditing(null);
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

  async function toggleActief(r: Rule) {
    try {
      const res = await fetch("/api/workflows", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: r.id, is_actief: !r.is_actief }),
      });
      if (!res.ok) throw new Error("Fout");
      router.refresh();
    } catch {
      toast({ title: "Kon niet wijzigen", variant: "destructive" });
    }
  }

  function addActie(type: string) {
    if (!editing) return;
    const baseActie: any = { type };
    if (type === "create_task") {
      baseActie.titel = "Nieuwe taak";
      baseActie.toegewezen_aan_eigenaar = true;
      baseActie.dagen_offset = 1;
      baseActie.prioriteit = "normaal";
    } else if (type === "create_project") {
      baseActie.naam_template = "#DEAL_TITLE";
      baseActie.kopieer_offerte_lijnen = true;
    } else if (type === "add_note") {
      baseActie.tekst = "Workflow heeft deze notitie toegevoegd.";
      baseActie.is_systeem = true;
    } else if (type === "set_status") {
      baseActie.status = "won";
    }
    setEditing({
      ...editing,
      acties_jsonb: [...(editing.acties_jsonb ?? []), baseActie],
    });
  }

  function updateActie(idx: number, k: string, v: any) {
    if (!editing) return;
    const acties = [...editing.acties_jsonb];
    acties[idx] = { ...acties[idx], [k]: v };
    setEditing({ ...editing, acties_jsonb: acties });
  }

  function removeActie(idx: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      acties_jsonb: editing.acties_jsonb.filter((_, i) => i !== idx),
    });
  }

  function actieLabel(actie: any) {
    if (actie.type === "create_task")
      return `📋 Taak: "${actie.titel ?? "?"}" — deadline +${actie.dagen_offset ?? 0}d`;
    if (actie.type === "create_project")
      return `🏗️ Project: "${actie.naam_template ?? "?"}"`;
    if (actie.type === "add_note") return `📝 Notitie toevoegen`;
    if (actie.type === "set_status") return `🔄 Status → ${actie.status ?? "?"}`;
    return actie.type;
  }

  return (
    <>
      {editing && (
        <div className="bg-enervia-50 border border-enervia-200 rounded-lg p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-enervia-700">
              {editing.id ? "Regel bewerken" : "Nieuwe regel"}
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              <X size={14} /> Sluiten
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Naam</Label>
              <Input
                value={editing.naam}
                onChange={(e) =>
                  setEditing({ ...editing, naam: e.target.value })
                }
                placeholder="bv. Bij gewonnen deal → maak project"
              />
            </div>
            <div>
              <Label>Trigger</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={editing.trigger}
                onChange={(e) =>
                  setEditing({ ...editing, trigger: e.target.value })
                }
              >
                {TRIGGERS.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Beschrijving</Label>
            <Input
              value={editing.beschrijving ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, beschrijving: e.target.value })
              }
              placeholder="Optioneel — wat doet deze regel?"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={editing.is_actief}
              onChange={(e) =>
                setEditing({ ...editing, is_actief: e.target.checked })
              }
            />
            Actief — voer deze regel uit bij elke matching trigger
          </label>

          {/* ACTIES */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Acties</Label>
              <div className="flex gap-1">
                {ACTION_TYPES.map((at) => (
                  <Button
                    key={at.code}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addActie(at.code)}
                  >
                    <Plus size={12} /> {at.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {editing.acties_jsonb.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Nog geen acties — voeg er minstens één toe.
                </p>
              )}
              {editing.acties_jsonb.map((actie, i) => (
                <div
                  key={i}
                  className="bg-white border rounded p-3 space-y-2 text-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-enervia-700">
                      {actieLabel(actie)}
                    </div>
                    <button
                      onClick={() => removeActie(i)}
                      className="text-red-600 hover:bg-red-50 rounded p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {actie.type === "create_task" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        className="md:col-span-2"
                        value={actie.titel ?? ""}
                        onChange={(e) =>
                          updateActie(i, "titel", e.target.value)
                        }
                        placeholder="Taaktitel"
                      />
                      <Input
                        type="number"
                        value={actie.dagen_offset ?? 0}
                        onChange={(e) =>
                          updateActie(
                            i,
                            "dagen_offset",
                            Number(e.target.value),
                          )
                        }
                        placeholder="Dagen offset"
                      />
                      <select
                        className="h-9 rounded border px-2 text-xs"
                        value={actie.prioriteit ?? "normaal"}
                        onChange={(e) =>
                          updateActie(i, "prioriteit", e.target.value)
                        }
                      >
                        {PRIORITY.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-xs md:col-span-2">
                        <input
                          type="checkbox"
                          checked={actie.toegewezen_aan_eigenaar ?? false}
                          onChange={(e) =>
                            updateActie(
                              i,
                              "toegewezen_aan_eigenaar",
                              e.target.checked,
                            )
                          }
                        />
                        Wijs toe aan eigenaar van de deal
                      </label>
                    </div>
                  )}
                  {actie.type === "create_project" && (
                    <div className="space-y-2">
                      <Input
                        value={actie.naam_template ?? ""}
                        onChange={(e) =>
                          updateActie(i, "naam_template", e.target.value)
                        }
                        placeholder="Naam — gebruik #DEAL_TITLE als merge-tag"
                      />
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={actie.kopieer_offerte_lijnen ?? false}
                          onChange={(e) =>
                            updateActie(
                              i,
                              "kopieer_offerte_lijnen",
                              e.target.checked,
                            )
                          }
                        />
                        Kopieer offerte-lijnen naar project-lijnen
                      </label>
                    </div>
                  )}
                  {actie.type === "add_note" && (
                    <textarea
                      className="w-full rounded border px-2 py-1 text-sm"
                      rows={2}
                      value={actie.tekst ?? ""}
                      onChange={(e) =>
                        updateActie(i, "tekst", e.target.value)
                      }
                      placeholder="Inhoud van de notitie"
                    />
                  )}
                  {actie.type === "set_status" && (
                    <select
                      className="w-full h-9 rounded border px-2 text-sm"
                      value={actie.status ?? "won"}
                      onChange={(e) =>
                        updateActie(i, "status", e.target.value)
                      }
                    >
                      <option value="open">Open</option>
                      <option value="won">Gewonnen</option>
                      <option value="lost">Verloren</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between border-t pt-3">
            {editing.id ? (
              <Button
                type="button"
                variant="outline"
                onClick={verwijder}
                disabled={busy}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 size={14} /> Verwijder
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} disabled={busy}>
              <Save size={14} /> {busy ? "Bezig..." : "Opslaan"}
            </Button>
          </div>
        </div>
      )}

      {!editing && (
        <div className="flex justify-end">
          <Button onClick={startNew}>
            <Plus size={14} /> Nieuwe regel
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {rules.length === 0 && (
          <div className="bg-white rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Nog geen regels. Maak er een aan met de knop hierboven.
          </div>
        )}
        {rules.map((r) => {
          const trigLabel = TRIGGERS.find((t) => t.code === r.trigger)?.label ??
            r.trigger;
          return (
            <div
              key={r.id}
              className="bg-white rounded-lg border p-4 flex items-start gap-3 hover:border-enervia-400 transition"
            >
              <div className="mt-1">
                <Zap
                  size={16}
                  className={r.is_actief ? "text-amber-500" : "text-muted-foreground"}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-enervia-700">
                    {r.naam}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {trigLabel}
                  </Badge>
                  {!r.is_actief && (
                    <Badge className="text-xs bg-slate-100 text-slate-600">
                      Inactief
                    </Badge>
                  )}
                  {r.uitgevoerd_count != null && r.uitgevoerd_count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {r.uitgevoerd_count}× uitgevoerd
                    </Badge>
                  )}
                </div>
                {r.beschrijving && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.beschrijving}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.acties_jsonb.map((a: any, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-enervia-50 text-enervia-700 px-1.5 py-0.5 rounded"
                    >
                      {a.type === "create_task"
                        ? `📋 ${a.titel ?? "Taak"}`
                        : a.type === "create_project"
                          ? "🏗️ Project"
                          : a.type === "add_note"
                            ? "📝 Notitie"
                            : a.type === "set_status"
                              ? `🔄 ${a.status}`
                              : a.type}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActief(r)}
                  title={r.is_actief ? "Pauzeer" : "Activeer"}
                >
                  {r.is_actief ? <Power size={14} /> : <PowerOff size={14} />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                  Bewerk
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {recentRuns.length > 0 && (
        <div>
          <h2 className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-2">
            Laatste uitvoeringen
          </h2>
          <div className="bg-white rounded-lg border divide-y">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className="p-3 flex items-center gap-3 text-sm"
              >
                {run.resultaat === "success" ? (
                  <CheckCircle2 size={14} className="text-green-600" />
                ) : (
                  <AlertCircle size={14} className="text-amber-600" />
                )}
                <span className="flex-1">
                  {TRIGGERS.find((t) => t.code === run.trigger)?.label ??
                    run.trigger}{" "}
                  · {run.acties_uitgevoerd} actie(s)
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleString("nl-BE")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
