"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";

export function DealHeader({
  dealId,
  titel,
  status,
  huidigeStageNaam,
  huidigeStageKleur,
}: {
  dealId: string;
  titel: string;
  status: string;
  huidigeStageNaam: string;
  huidigeStageKleur: string;
}) {
  const [busy, setBusy] = useState(false);
  const [curStatus, setCurStatus] = useState(status);

  async function setStatus(newStatus: "open" | "won" | "lost") {
    if (newStatus === curStatus) return;
    setBusy(true);
    try {
      // Voor 'won' / 'lost' moeten we ook stage updaten naar passende stage
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      setCurStatus(newStatus);
      toast({
        title:
          newStatus === "won"
            ? "Deal gewonnen 🎉"
            : newStatus === "lost"
              ? "Deal verloren"
              : "Deal heropend",
        variant: "success",
      });
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
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div>
        <Link
          href="/app/deals"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Overzicht deals
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">{titel}</h1>
        <Badge
          className="mt-2"
          style={{ backgroundColor: huidigeStageKleur, color: "white" }}
        >
          {huidigeStageNaam}
        </Badge>
      </div>
      <div className="flex gap-1 bg-muted/30 rounded-lg border p-1">
        <button
          onClick={() => setStatus("open")}
          disabled={busy}
          className={`px-3 py-1.5 text-sm rounded ${
            curStatus === "open"
              ? "bg-white shadow text-enervia-700 font-medium"
              : "text-muted-foreground hover:bg-white/50"
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setStatus("lost")}
          disabled={busy}
          className={`px-3 py-1.5 text-sm rounded ${
            curStatus === "lost"
              ? "bg-red-600 text-white shadow font-medium"
              : "text-muted-foreground hover:bg-white/50"
          }`}
        >
          Verloren
        </button>
        <button
          onClick={() => setStatus("won")}
          disabled={busy}
          className={`px-3 py-1.5 text-sm rounded ${
            curStatus === "won"
              ? "bg-enervia-600 text-white shadow font-medium"
              : "text-muted-foreground hover:bg-white/50"
          }`}
        >
          Gewonnen
        </button>
      </div>
    </div>
  );
}
