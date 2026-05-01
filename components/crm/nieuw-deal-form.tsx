"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

type Pipeline = {
  id: string;
  naam: string;
  is_default: boolean;
  pipeline_stages: { id: string; naam: string; volgorde: number }[];
};

export function NieuwDealForm({
  pipelines,
  contacts,
  companies,
  initialContactId,
  initialCompanyId,
  initialPipelineId,
}: {
  pipelines: Pipeline[];
  contacts: { id: string; voornaam: string; achternaam: string }[];
  companies: { id: string; naam: string }[];
  initialContactId?: string;
  initialCompanyId?: string;
  initialPipelineId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const defaultPipeline =
    pipelines.find((p) => p.id === initialPipelineId) ??
    pipelines.find((p) => p.is_default) ??
    pipelines[0];

  const [form, setForm] = useState({
    titel: "",
    beschrijving: "",
    pipeline_id: defaultPipeline?.id ?? "",
    stage_id:
      defaultPipeline?.pipeline_stages.sort(
        (a, b) => a.volgorde - b.volgorde,
      )[0]?.id ?? "",
    contact_id: initialContactId ?? "",
    company_id: initialCompanyId ?? "",
    waarde_excl_btw: "",
    btw_tarief: "0.21",
    verwacht_afgesloten: "",
  });

  const currentStages = useMemo(
    () => pipelines.find((p) => p.id === form.pipeline_id)?.pipeline_stages ?? [],
    [pipelines, form.pipeline_id],
  );

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        waarde_excl_btw: form.waarde_excl_btw
          ? Number(form.waarde_excl_btw)
          : 0,
        btw_tarief: Number(form.btw_tarief),
        contact_id: form.contact_id || null,
        company_id: form.company_id || null,
        verwacht_afgesloten: form.verwacht_afgesloten || null,
      };
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      const data = await res.json();
      toast({ title: "Deal aangemaakt", variant: "success" });
      router.push(`/app/deals/${data.id}`);
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

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="bg-white rounded-lg border p-5 space-y-4">
        <div>
          <Label>
            Titel <span className="text-red-600">*</span>
          </Label>
          <Input
            required
            value={form.titel}
            onChange={(e) => set("titel", e.target.value)}
            placeholder="Bv. Totaalrenovatie Waumans"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Pipeline</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.pipeline_id}
              onChange={(e) => {
                const newPipe = e.target.value;
                const stages =
                  pipelines.find((p) => p.id === newPipe)?.pipeline_stages ?? [];
                set("pipeline_id", newPipe);
                set(
                  "stage_id",
                  stages.sort((a, b) => a.volgorde - b.volgorde)[0]?.id ?? "",
                );
              }}
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.naam}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Fase</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.stage_id}
              onChange={(e) => set("stage_id", e.target.value)}
            >
              {currentStages
                .sort((a, b) => a.volgorde - b.volgorde)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.naam}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Contact</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.contact_id}
              onChange={(e) => set("contact_id", e.target.value)}
            >
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.voornaam} {c.achternaam}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Bedrijf</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.company_id}
              onChange={(e) => set("company_id", e.target.value)}
            >
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.naam}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Waarde (excl. btw)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.waarde_excl_btw}
              onChange={(e) => set("waarde_excl_btw", e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label>BTW-tarief</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.btw_tarief}
              onChange={(e) => set("btw_tarief", e.target.value)}
            >
              <option value="0.06">6 %</option>
              <option value="0.12">12 %</option>
              <option value="0.21">21 %</option>
              <option value="0">0 %</option>
            </select>
          </div>
          <div>
            <Label>Verwacht afgesloten</Label>
            <Input
              type="date"
              value={form.verwacht_afgesloten}
              onChange={(e) => set("verwacht_afgesloten", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Beschrijving</Label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
            value={form.beschrijving}
            onChange={(e) => set("beschrijving", e.target.value)}
          />
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Opslaan..." : "Deal opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/deals")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
