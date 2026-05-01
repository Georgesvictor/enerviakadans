"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "@/components/ui/toaster";

export function OfferteGoedkeuring({
  token,
  status,
  tenantNaam,
}: {
  token: string;
  status: string;
  tenantNaam: string;
}) {
  const [busy, setBusy] = useState(false);
  const [resultaat, setResultaat] = useState<"geaccepteerd" | "afgewezen" | null>(
    status === "geaccepteerd"
      ? "geaccepteerd"
      : status === "afgewezen"
        ? "afgewezen"
        : null,
  );
  const [reden, setReden] = useState("");

  async function beslissing(actie: "accepteer" | "wijs_af") {
    setBusy(true);
    try {
      const res = await fetch(`/api/offerte-klant/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actie,
          reden: actie === "wijs_af" ? reden : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      setResultaat(actie === "accepteer" ? "geaccepteerd" : "afgewezen");
      toast({
        title:
          actie === "accepteer"
            ? "Offerte geaccepteerd"
            : "Offerte afgewezen",
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

  if (resultaat === "geaccepteerd") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
        <Check size={28} className="mx-auto text-green-600 mb-2" />
        <div className="font-semibold text-green-800">
          Je hebt deze offerte geaccepteerd
        </div>
        <div className="text-sm text-green-700 mt-1">
          {tenantNaam} ontvangt een automatische notificatie en neemt contact op
          voor de uitvoering.
        </div>
      </div>
    );
  }
  if (resultaat === "afgewezen") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
        <X size={28} className="mx-auto text-red-600 mb-2" />
        <div className="font-semibold text-red-800">
          Deze offerte is afgewezen
        </div>
        <div className="text-sm text-red-700 mt-1">
          Bedankt voor de feedback. Neem gerust contact op voor aanpassingen.
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-5 space-y-3">
      <div className="font-semibold text-enervia-700">Je antwoord</div>
      <div className="flex gap-3">
        <Button
          onClick={() => beslissing("accepteer")}
          disabled={busy}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check size={16} /> Accepteer offerte
        </Button>
        <details className="relative">
          <summary className="cursor-pointer list-none inline-flex">
            <Button type="button" variant="outline" disabled={busy}>
              <X size={16} /> Wijs af
            </Button>
          </summary>
          <div className="mt-3 p-3 border rounded bg-white space-y-2">
            <textarea
              placeholder="Reden (optioneel)..."
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              value={reden}
              onChange={(e) => setReden(e.target.value)}
            />
            <Button
              onClick={() => beslissing("wijs_af")}
              disabled={busy}
              variant="outline"
              className="text-red-600"
            >
              Bevestig afwijzing
            </Button>
          </div>
        </details>
      </div>
    </div>
  );
}
