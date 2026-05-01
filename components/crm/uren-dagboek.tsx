"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { Plus, Euro, Clock } from "lucide-react";

type Entry = {
  id: string;
  datum: string;
  minuten: number;
  omschrijving: string | null;
  is_factureerbaar: boolean;
  gefactureerd: boolean;
  project_id: string | null;
  task_id: string | null;
  tarief_per_uur: number | null;
  projects?: { naam: string } | null;
  tasks?: { titel: string } | null;
};

export function UrenDagboek({
  initial,
  projects,
  tasks,
}: {
  initial: Entry[];
  projects: { id: string; naam: string; tarief_per_uur: number | null }[];
  tasks: { id: string; titel: string; project_id: string | null }[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    datum: new Date().toISOString().slice(0, 10),
    minuten: "60",
    project_id: "",
    task_id: "",
    omschrijving: "",
    is_factureerbaar: true,
  });
  const [busy, setBusy] = useState(false);

  const taakOpties = form.project_id
    ? tasks.filter((t) => t.project_id === form.project_id)
    : tasks;

  const perDag = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!m.has(e.datum)) m.set(e.datum, []);
      m.get(e.datum)!.push(e);
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const totaalMinuten = entries.reduce((s, e) => s + Number(e.minuten), 0);
  const factureerbaarMinuten = entries
    .filter((e) => e.is_factureerbaar && !e.gefactureerd)
    .reduce((s, e) => s + Number(e.minuten), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/uren", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          minuten: Number(form.minuten),
          project_id: form.project_id || null,
          task_id: form.task_id || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      const data = await res.json();
      const proj = projects.find((p) => p.id === data.project_id);
      const task = tasks.find((t) => t.id === data.task_id);
      setEntries((es) => [
        {
          ...data,
          projects: proj ? { naam: proj.naam } : null,
          tasks: task ? { titel: task.titel } : null,
        },
        ...es,
      ]);
      setForm({
        ...form,
        minuten: "60",
        omschrijving: "",
      });
      setShowForm(false);
      toast({ title: "Uren geboekt", variant: "success" });
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

  const h = (m: number) => `${Math.floor(m / 60)}u ${m % 60}m`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Totaal laatste 30 dagen
          </div>
          <div className="text-2xl font-bold text-enervia-700 mt-1">
            {h(totaalMinuten)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Factureerbaar
          </div>
          <div className="text-2xl font-bold text-accent-400 mt-1">
            {h(factureerbaarMinuten)}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Dagen geregistreerd
          </div>
          <div className="text-2xl font-bold text-enervia-700 mt-1">
            {perDag.length}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Nieuwe urenboeking
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white rounded-lg border p-5 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={form.datum}
                onChange={(e) => setForm({ ...form, datum: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Minuten</Label>
              <Input
                type="number"
                value={form.minuten}
                onChange={(e) => setForm({ ...form, minuten: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Project</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={form.project_id}
                onChange={(e) =>
                  setForm({ ...form, project_id: e.target.value, task_id: "" })
                }
              >
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.naam}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Taak</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={form.task_id}
                onChange={(e) => setForm({ ...form, task_id: e.target.value })}
              >
                <option value="">—</option>
                {taakOpties.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titel}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <Label>Omschrijving</Label>
              <Input
                value={form.omschrijving}
                onChange={(e) =>
                  setForm({ ...form, omschrijving: e.target.value })
                }
                placeholder="Wat heb je gedaan?"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_factureerbaar}
              onChange={(e) =>
                setForm({ ...form, is_factureerbaar: e.target.checked })
              }
            />
            Factureerbaar
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Opslaan..." : "Uren boeken"}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {perDag.map(([datum, rows]) => {
          const totaal = rows.reduce((s, r) => s + Number(r.minuten), 0);
          return (
            <div key={datum} className="bg-white rounded-lg border">
              <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                <div className="font-semibold text-enervia-700">
                  {new Date(datum).toLocaleDateString("nl-BE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {h(totaal)}
                </div>
              </div>
              <div className="divide-y">
                {rows.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 flex items-center gap-3 text-sm"
                  >
                    <Clock size={14} className="text-muted-foreground shrink-0" />
                    <div className="font-mono w-16 text-right">
                      {h(Number(e.minuten))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        {e.omschrijving ?? (
                          <span className="text-muted-foreground italic">
                            Geen omschrijving
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {e.projects?.naam ?? "—"}
                        {e.tasks?.titel && ` · ${e.tasks.titel}`}
                      </div>
                    </div>
                    {e.is_factureerbaar && !e.gefactureerd && (
                      <Badge className="bg-accent-50 text-accent-400">
                        <Euro size={10} /> factureerbaar
                      </Badge>
                    )}
                    {e.gefactureerd && (
                      <Badge variant="outline">gefactureerd</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
