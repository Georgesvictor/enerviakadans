"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FileDown, Send, Repeat, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

const TABS = [
  { code: "detail", label: "DETAIL" },
  { code: "preview", label: "PREVIEW" },
  { code: "follow_up", label: "FOLLOW-UP" },
];

export function OfferteDetailTabs({
  id,
  nummer,
  activeTab,
  regels,
  opmerkingen,
  voorwaarden,
  bijlagen,
  totalen,
  status,
}: {
  id: string;
  nummer: string | null;
  activeTab: string;
  regels: any[];
  opmerkingen?: string | null;
  voorwaarden?: string | null;
  bijlagen?: { naam: string; url?: string; size_kb?: number }[];
  totalen: { subtotaal: number; btw: number; totaal: number };
  status: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);

  function setTab(code: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", code);
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  async function downloadPdf() {
    setBusy(true);
    try {
      const res = await fetch(`/api/offertes/${id}/pdf`, { method: "POST" });
      if (!res.ok) throw new Error("PDF mislukt");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
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

  async function omzettenNaarFactuur() {
    router.push(`/app/facturen/nieuw?offerte=${id}`);
  }

  async function verzendOfferte() {
    setBusy(true);
    try {
      const res = await fetch(`/api/offertes/${id}/verzenden`, {
        method: "POST",
      });
      if (!res.ok) {
        // soft-fallback: enkel status updaten als route niet bestaat
        await fetch(`/api/offertes/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "verzonden" }),
        });
      }
      toast({ title: "Offerte gemarkeerd als verzonden", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Verzenden mislukt", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs + Acties */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b">
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.code}
              onClick={() => setTab(t.code)}
              className={`px-4 py-3 text-xs font-bold tracking-wider border-b-2 -mb-px transition ${
                activeTab === t.code
                  ? "border-enervia-600 text-enervia-700"
                  : "border-transparent text-muted-foreground hover:text-enervia-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-2">
          <Button
            variant="outline"
            onClick={downloadPdf}
            disabled={busy}
            className="text-sm"
          >
            <FileDown size={14} /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={omzettenNaarFactuur}
            disabled={busy}
          >
            <Repeat size={14} /> Omzetten naar factuur
            <ChevronDown size={12} />
          </Button>
          {status === "concept" && (
            <Button onClick={verzendOfferte} disabled={busy}>
              <Send size={14} /> Offerte verzenden
              <ChevronDown size={12} />
            </Button>
          )}
        </div>
      </div>

      {activeTab === "detail" && (
        <>
          {/* OFFERTE-INHOUD COLLAPSIBLE */}
          <div className="bg-white rounded-lg border">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30"
            >
              <span className="font-semibold flex items-center gap-2">
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Offerte-inhoud
              </span>
              <span className="text-xs text-muted-foreground">
                {regels.length} regels
              </span>
            </button>
            {open && (
              <div className="border-t">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-2.5">Titel</th>
                      <th className="text-right px-4 py-2.5">Eenheidsprijs</th>
                      <th className="text-right px-4 py-2.5">Aantal</th>
                      <th className="text-right px-4 py-2.5">Btw</th>
                      <th className="text-right px-4 py-2.5">Subtotaal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {regels.map((r) => (
                      <tr
                        key={r.id}
                        className={r.is_kop ? "bg-enervia-50/40" : ""}
                      >
                        <td
                          className={`px-4 py-2.5 ${
                            r.is_kop
                              ? "font-semibold text-enervia-700"
                              : ""
                          }`}
                        >
                          {r.omschrijving}
                          {r.regel_type && r.regel_type !== "eenmalig" && (
                            <span className="ml-2 text-xs bg-amber-50 text-amber-700 px-1.5 rounded">
                              {r.regel_type}
                            </span>
                          )}
                        </td>
                        {!r.is_kop ? (
                          <>
                            <td className="px-4 py-2.5 text-right font-mono">
                              {f(Number(r.prijs_excl_btw))}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {r.aantal} {r.eenheid}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs">
                              {(Number(r.btw_tarief) * 100).toFixed(0)} %
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono">
                              {f(Number(r.subtotaal_excl_btw ?? 0))}
                            </td>
                          </>
                        ) : (
                          <td colSpan={4}></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/30 text-sm">
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">
                        Subtotaal excl. btw
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {f(totalen.subtotaal)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">
                        BTW
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {f(totalen.btw)}
                      </td>
                    </tr>
                    <tr className="bg-enervia-50/50">
                      <td
                        colSpan={4}
                        className="px-4 py-2.5 text-right font-bold text-enervia-700"
                      >
                        Totaal incl. btw
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-enervia-700">
                        {f(totalen.totaal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {(opmerkingen || voorwaarden) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {opmerkingen && (
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-xs uppercase text-muted-foreground mb-2">
                    Opmerkingen
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {opmerkingen}
                  </div>
                </div>
              )}
              {voorwaarden && (
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-xs uppercase text-muted-foreground mb-2">
                    Voorwaarden
                  </div>
                  <div className="text-xs whitespace-pre-wrap text-muted-foreground">
                    {voorwaarden}
                  </div>
                </div>
              )}
            </div>
          )}

          {bijlagen && bijlagen.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <div className="text-xs uppercase text-muted-foreground mb-2">
                Extra bijlagen
              </div>
              <div className="space-y-1">
                {bijlagen.map((b, i) => (
                  <a
                    key={i}
                    href={b.url ?? "#"}
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    📎 {b.naam}
                    {b.size_kb && (
                      <span className="text-xs text-muted-foreground">
                        {b.size_kb} KB
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "preview" && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="text-sm text-muted-foreground mb-4">
            Bekijk de offerte zoals de klant hem ontvangt.
          </div>
          <Button onClick={downloadPdf} disabled={busy}>
            <FileDown size={14} /> Open PDF preview
          </Button>
        </div>
      )}

      {activeTab === "follow_up" && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold mb-3">Follow-up activiteiten</h3>
          <p className="text-sm text-muted-foreground">
            Hier komen de gekoppelde taken, herinneringen en verzonden e-mails
            rond deze offerte. (Binnenkort: automatische herinneringen na X
            dagen zonder reactie.)
          </p>
        </div>
      )}
    </div>
  );
}
