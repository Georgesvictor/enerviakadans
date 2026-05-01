"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DealsFilters({
  pipelines,
  activePipelineId,
  owners,
  bronnen,
  categorieen,
}: {
  pipelines: { id: string; naam: string }[];
  activePipelineId: string;
  owners: { id: string; email: string }[];
  bronnen: string[];
  categorieen: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(key: string, val: string | undefined) {
    const p = new URLSearchParams(sp.toString());
    if (!val) p.delete(key);
    else p.set(key, val);
    router.push(`?${p.toString()}`);
  }

  return (
    <div className="bg-white rounded-lg border p-3 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Zoek titel, klant..."
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            // debounce-light: zet pas na 350ms
            clearTimeout((window as any).__dealsearch);
            (window as any).__dealsearch = setTimeout(() => {
              setParam("q", v || undefined);
            }, 350);
          }}
          className="pl-8 h-9"
        />
      </div>

      <select
        value={activePipelineId}
        onChange={(e) => setParam("pipeline", e.target.value)}
        className="h-9 rounded border bg-white px-3 text-sm"
      >
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>
            {p.naam}
          </option>
        ))}
      </select>

      <select
        value={sp.get("status") ?? "open"}
        onChange={(e) => setParam("status", e.target.value)}
        className="h-9 rounded border bg-white px-3 text-sm"
      >
        <option value="open">Open</option>
        <option value="won">Gewonnen</option>
        <option value="lost">Verloren</option>
      </select>

      <select
        value={sp.get("eigenaar") ?? ""}
        onChange={(e) => setParam("eigenaar", e.target.value || undefined)}
        className="h-9 rounded border bg-white px-3 text-sm"
      >
        <option value="">Alle verantwoordelijken</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.email}
          </option>
        ))}
      </select>

      {bronnen.length > 0 && (
        <select
          value={sp.get("bron") ?? ""}
          onChange={(e) => setParam("bron", e.target.value || undefined)}
          className="h-9 rounded border bg-white px-3 text-sm"
        >
          <option value="">Alle bronnen</option>
          {bronnen.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      )}

      {categorieen.length > 0 && (
        <select
          value={sp.get("categorie") ?? ""}
          onChange={(e) => setParam("categorie", e.target.value || undefined)}
          className="h-9 rounded border bg-white px-3 text-sm"
        >
          <option value="">Alle categorieën</option>
          {categorieen.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
