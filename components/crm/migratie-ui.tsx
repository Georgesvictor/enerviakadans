"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

const MODULES = [
  { code: "contacten_bedrijven", naam: "Contacten & bedrijven" },
  { code: "deals", naam: "Deals" },
  { code: "quotations", naam: "Offertes" },
  { code: "invoices", naam: "Facturen" },
];

export function MigratieUI() {
  const [busy, setBusy] = useState(false);
  const [resultaat, setResultaat] = useState<Record<string, any> | null>(null);
  const [selectie, setSelectie] = useState<string[]>(["contacten_bedrijven"]);

  function toggle(code: string) {
    setSelectie((s) =>
      s.includes(code) ? s.filter((x) => x !== code) : [...s, code],
    );
  }

  async function start(dryRun: boolean) {
    if (selectie.length === 0) {
      toast({ title: "Selecteer minstens één module", variant: "destructive" });
      return;
    }
    setBusy(true);
    setResultaat(null);
    try {
      const res = await fetch("/api/migratie/teamleader", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dry_run: dryRun, modules: selectie }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Migratie mislukt");
      setResultaat(data);
      toast({
        title: dryRun ? "Dry-run klaar" : "Migratie voltooid",
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
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-5 space-y-3">
        <h2 className="font-semibold text-enervia-700">
          Kies welke modules je wil migreren
        </h2>
        <div className="space-y-2">
          {MODULES.map((m) => (
            <label key={m.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectie.includes(m.code)}
                onChange={() => toggle(m.code)}
              />
              {m.naam}
              {m.code !== "contacten_bedrijven" && (
                <span className="text-xs text-muted-foreground">
                  (vereist eerst contacten+bedrijven)
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => start(true)} disabled={busy} variant="outline">
            {busy ? "Bezig..." : "Dry-run"}
          </Button>
          <Button onClick={() => start(false)} disabled={busy}>
            {busy ? "Migreren..." : "Migreer nu"}
          </Button>
        </div>
      </div>

      {resultaat && (
        <div className="bg-white rounded-lg border p-5 space-y-3">
          <h3 className="font-semibold text-enervia-700">Resultaat</h3>
          {Object.entries(resultaat).map(([mod, r]: [string, any]) => (
            <div
              key={mod}
              className="border-t pt-3 first:border-t-0 first:pt-0"
            >
              <div className="font-medium capitalize mb-1">
                {mod.replace(/_/g, " ")}
              </div>
              {r.contacts_totaal !== undefined ? (
                <dl className="text-sm space-y-0.5">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Bedrijven</dt>
                    <dd className="font-mono">
                      {r.companies_gemigreerd} / {r.companies_totaal}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Contacten</dt>
                    <dd className="font-mono">
                      {r.contacts_gemigreerd} / {r.contacts_totaal}
                    </dd>
                  </div>
                </dl>
              ) : (
                <dl className="text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Records</dt>
                    <dd className="font-mono">
                      {r.gemigreerd} / {r.totaal}
                    </dd>
                  </div>
                </dl>
              )}
              {r.errors?.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="text-red-600 font-semibold">
                    {r.errors.length} fouten
                  </div>
                  <ul className="text-red-700 list-disc list-inside">
                    {r.errors.slice(0, 5).map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                    {r.errors.length > 5 && (
                      <li>... en {r.errors.length - 5} meer</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
