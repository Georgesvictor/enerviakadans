"use client";

import { useState } from "react";
import { Download, Send, FileText } from "lucide-react";
import { toast } from "@/components/ui/toaster";

export function DocumentActies({
  id,
  type,
  nummer,
  canPeppol,
}: {
  id: string;
  type: "offerte" | "factuur";
  nummer?: string | null;
  canPeppol?: boolean;
}) {
  const [busy, setBusy] = useState<"pdf" | "peppol" | null>(null);

  const endpoint = type === "offerte" ? "offertes" : "facturen";

  async function genereerPdf() {
    setBusy("pdf");
    try {
      const res = await fetch(`/api/${endpoint}/${id}/pdf`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "PDF mislukt");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast({ title: "PDF gegenereerd", variant: "success" });
    } catch (err) {
      toast({
        title: "PDF mislukt",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function verstuurPeppol() {
    setBusy("peppol");
    try {
      const res = await fetch(`/api/facturen/${id}/peppol`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Peppol mislukt");
      toast({
        title: "Peppol-status",
        description:
          data.info ?? `Status: ${data.status}` + (data.billit_id ? ` (${data.billit_id})` : ""),
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Fout bij Peppol-verzending",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={genereerPdf}
        disabled={busy !== null}
        className="px-3 py-1.5 border rounded text-sm hover:bg-muted inline-flex items-center gap-1 disabled:opacity-50"
      >
        <Download size={14} />
        {busy === "pdf" ? "Bezig..." : "PDF"}
      </button>
      {type === "factuur" && canPeppol && (
        <button
          onClick={verstuurPeppol}
          disabled={busy !== null}
          className="px-3 py-1.5 bg-enervia-600 text-white rounded text-sm hover:bg-enervia-700 inline-flex items-center gap-1 disabled:opacity-50"
        >
          <Send size={14} />
          {busy === "peppol" ? "Verzenden..." : "Via Peppol"}
        </button>
      )}
    </div>
  );
}
