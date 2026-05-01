"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { X, User, Tag, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";

type Stage = { id: string; naam: string; is_won?: boolean; is_lost?: boolean };
type Owner = { id: string; email: string };
type T = { id: string; naam: string; kleur: string };

export function DealsBulkToolbar({
  selected,
  onClear,
  stages,
  owners,
  tags,
}: {
  selected: string[];
  onClear: () => void;
  stages: Stage[];
  owners: Owner[];
  tags: T[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (selected.length === 0) return null;

  async function execute(actie: string, waarde?: string) {
    if (
      actie === "verwijder" &&
      !confirm(`${selected.length} deal(s) definitief verwijderen?`)
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/deals/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selected, actie, waarde }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Bulk-actie mislukt");
      }
      const data = await res.json();
      toast({
        title: "Klaar",
        description: `${data.verwerkt} deal(s) bijgewerkt`,
        variant: "success",
      });
      onClear();
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

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-enervia-700 text-white rounded-full shadow-2xl px-4 py-2 flex items-center gap-2">
      <span className="text-sm font-medium">
        {selected.length} geselecteerd
      </span>
      <div className="w-px h-5 bg-white/30" />

      {/* Eigenaar */}
      <select
        className="bg-white/10 hover:bg-white/20 text-white text-xs rounded px-2 py-1 outline-none"
        defaultValue=""
        disabled={busy}
        onChange={(e) => {
          if (e.target.value) execute("set_eigenaar", e.target.value);
          e.target.value = "";
        }}
      >
        <option value="" className="text-black">+ Eigenaar...</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id} className="text-black">
            {o.email}
          </option>
        ))}
      </select>

      {/* Stage */}
      <select
        className="bg-white/10 hover:bg-white/20 text-white text-xs rounded px-2 py-1 outline-none"
        defaultValue=""
        disabled={busy}
        onChange={(e) => {
          if (e.target.value) execute("set_stage", e.target.value);
          e.target.value = "";
        }}
      >
        <option value="" className="text-black">→ Naar fase...</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id} className="text-black">
            {s.naam}
          </option>
        ))}
      </select>

      {/* Tag */}
      <select
        className="bg-white/10 hover:bg-white/20 text-white text-xs rounded px-2 py-1 outline-none"
        defaultValue=""
        disabled={busy}
        onChange={(e) => {
          if (e.target.value) execute("add_tag", e.target.value);
          e.target.value = "";
        }}
      >
        <option value="" className="text-black">+ Tag...</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id} className="text-black">
            {t.naam}
          </option>
        ))}
      </select>

      <button
        onClick={() => execute("set_status", "won")}
        className="text-xs bg-emerald-500 hover:bg-emerald-600 px-2 py-1 rounded font-medium flex items-center gap-1"
        disabled={busy}
      >
        <CheckCircle2 size={12} /> Won
      </button>

      <button
        onClick={() => execute("verwijder")}
        className="text-xs bg-red-500/80 hover:bg-red-600 px-2 py-1 rounded font-medium flex items-center gap-1"
        disabled={busy}
      >
        <Trash2 size={12} />
      </button>

      <div className="w-px h-5 bg-white/30" />
      <button
        onClick={onClear}
        className="hover:bg-white/20 rounded p-1"
        title="Selectie wissen"
      >
        <X size={14} />
      </button>
    </div>
  );
}
