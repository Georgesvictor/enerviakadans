"use client";

import { useEffect, useState } from "react";
import { Tag, Plus, X, Check } from "lucide-react";
import { toast } from "@/components/ui/toaster";

type T = {
  id: string;
  naam: string;
  kleur: string;
};

const COLORS = [
  "#64748b", "#dc2626", "#ea580c", "#f59e0b", "#facc15",
  "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
];

export function TagPicker({
  entityType,
  entityId,
  initial,
  small = false,
}: {
  entityType: "deal" | "contact" | "company" | "task";
  entityId: string;
  initial: T[];
  small?: boolean;
}) {
  const [assigned, setAssigned] = useState<T[]>(initial);
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags ?? []))
      .catch(() => {});
  }, [open]);

  async function toggle(tag: T) {
    const isAssigned = assigned.some((a) => a.id === tag.id);
    try {
      const res = await fetch("/api/tags/toewijzen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tag_id: tag.id,
          entity_type: entityType,
          entity_id: entityId,
          action: isAssigned ? "unassign" : "assign",
        }),
      });
      if (!res.ok) throw new Error();
      setAssigned((curr) =>
        isAssigned ? curr.filter((t) => t.id !== tag.id) : [...curr, tag],
      );
    } catch {
      toast({ title: "Kon tag niet wijzigen", variant: "destructive" });
    }
  }

  async function createTag() {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ naam: newName, kleur: newColor }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const tag: T = data.tag;
      setAllTags((curr) => [...curr, tag]);
      setNewName("");
      // Auto-assign new tag
      await toggle(tag);
      setCreating(false);
    } catch {
      toast({ title: "Kon tag niet aanmaken", variant: "destructive" });
    }
  }

  const filtered = allTags.filter((t) =>
    t.naam.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative inline-flex flex-wrap items-center gap-1">
      {assigned.map((t) => (
        <span
          key={t.id}
          className={`inline-flex items-center gap-1 rounded-full ${small ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} font-medium`}
          style={{
            backgroundColor: t.kleur + "20",
            color: t.kleur,
            border: `1px solid ${t.kleur}40`,
          }}
        >
          {t.naam}
          <button
            type="button"
            onClick={() => toggle(t)}
            className="hover:bg-black/10 rounded-full"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-full ${small ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} bg-muted hover:bg-muted/70 text-muted-foreground border`}
      >
        <Tag size={10} /> {assigned.length === 0 ? "Tag toevoegen" : "+"}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 bg-white border rounded-lg shadow-lg w-64 p-2"
          onMouseLeave={() => setOpen(false)}
        >
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek of typ nieuwe naam..."
            className="w-full text-sm border rounded px-2 py-1 mb-2"
          />
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {filtered.map((t) => {
              const isAssigned = assigned.some((a) => a.id === t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1 hover:bg-muted rounded text-sm"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: t.kleur }}
                  />
                  <span className="flex-1">{t.naam}</span>
                  {isAssigned && <Check size={12} className="text-emerald-600" />}
                </button>
              );
            })}
            {filtered.length === 0 && search && (
              <button
                onClick={() => {
                  setNewName(search);
                  setCreating(true);
                }}
                className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm flex items-center gap-2 text-emerald-700"
              >
                <Plus size={12} /> Maak &ldquo;{search}&rdquo;
              </button>
            )}
          </div>
          {creating && (
            <div className="mt-2 pt-2 border-t space-y-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tag naam"
                className="w-full text-sm border rounded px-2 py-1"
              />
              <div className="flex flex-wrap gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full ${newColor === c ? "ring-2 ring-offset-1 ring-enervia-600" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createTag}
                  className="flex-1 text-xs bg-enervia-600 text-white rounded px-2 py-1 hover:bg-enervia-700"
                >
                  Maak tag
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="text-xs border rounded px-2 py-1 hover:bg-muted"
                >
                  Annuleer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
