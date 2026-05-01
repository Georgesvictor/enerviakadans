"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { Trash2, Save, Star } from "lucide-react";
import { MERGE_TAGS, renderMergeTags } from "@/lib/templates/merge-tags";

type Template = {
  id?: string;
  naam: string;
  type: string;
  is_default: boolean;
  inhoud_html: string;
};

const TYPES = [
  { code: "offerte", label: "Offerte" },
  { code: "factuur", label: "Factuur" },
  { code: "herinnering", label: "Herinnering" },
  { code: "email", label: "E-mail" },
];

export function TemplateEditor({
  initial,
  onClose,
}: {
  initial?: Partial<Template>;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [t, setT] = useState<Template>({
    naam: initial?.naam ?? "",
    type: initial?.type ?? "offerte",
    is_default: initial?.is_default ?? false,
    inhoud_html: initial?.inhoud_html ?? "",
    id: initial?.id,
  });

  function insertTag(tag: string) {
    setT((s) => ({ ...s, inhoud_html: (s.inhoud_html ?? "") + " " + tag }));
  }

  async function save() {
    if (!t.naam.trim()) {
      toast({ title: "Naam verplicht", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/templates", {
        method: t.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(t),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Opslaan mislukt");
      }
      toast({ title: "Template opgeslagen", variant: "success" });
      router.refresh();
      onClose?.();
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

  async function verwijder() {
    if (!t.id) return;
    if (!confirm("Template verwijderen?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/templates?id=${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      toast({ title: "Verwijderd", variant: "success" });
      router.refresh();
      onClose?.();
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

  const previewCtx = {
    deal_title: "Totaalrenovatie Tarwestraat 60",
    offer_nr: "OFF-2026-0001",
    invoice_nr: "FAC-2026-0001",
    customer_name: "Nathalie Waumans",
    customer_address: "Piersstraat 19, 2550 Kontich",
    customer_vat: "BE0123456789",
    sale_contact_person: "Giljom Arts",
    my_name: "Giljom Arts",
    my_email: "info@enervia.be",
    department_name: "Verkoop",
    company_name: "Enervia BV",
    company_vat: "BE1030660236",
    company_iban: "BE39 7380 5179 7719",
    company_bic: "KREDBEBB",
    deal_value: 73839.07,
    price_excl: 69659.5,
    price_incl: 73839.07,
    valid_until: "2026-05-31",
    due_date: "2026-05-31",
    structured_ref: "+++123/4567/89012+++",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* EDITOR */}
      <div className="bg-white rounded-lg border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Naam</Label>
            <Input
              value={t.naam}
              onChange={(e) => setT({ ...t, naam: e.target.value })}
              placeholder="bv. Standaard offerte-tekst"
            />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={t.type}
              onChange={(e) => setT({ ...t, type: e.target.value })}
            >
              {TYPES.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={t.is_default}
            onChange={(e) => setT({ ...t, is_default: e.target.checked })}
          />
          Gebruik als standaard voor type{" "}
          <strong>{TYPES.find((x) => x.code === t.type)?.label}</strong>
        </label>

        <div>
          <Label>Inhoud (HTML)</Label>
          <textarea
            className="w-full min-h-[260px] rounded-md border bg-background px-3 py-2 text-sm font-mono"
            value={t.inhoud_html}
            onChange={(e) => setT({ ...t, inhoud_html: e.target.value })}
            placeholder={`<p>Geachte #CUSTOMER_NAME,</p>\n<p>In bijlage vindt u offerte #OFFER_NR voor het project #DEAL_TITLE...</p>`}
          />
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          {t.id ? (
            <Button
              type="button"
              variant="outline"
              onClick={verwijder}
              disabled={busy}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 size={14} /> Verwijder
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={busy}>
            <Save size={14} /> {busy ? "Bezig..." : "Opslaan"}
          </Button>
        </div>
      </div>

      {/* MERGE TAGS + PREVIEW */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-2">
            Merge-tags
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Klik om in te voegen.
          </p>
          <div className="flex flex-wrap gap-1">
            {MERGE_TAGS.map((tag) => (
              <button
                key={tag.tag}
                type="button"
                onClick={() => insertTag(tag.tag)}
                title={tag.beschrijving}
                className="text-xs font-mono bg-enervia-50 hover:bg-enervia-100 text-enervia-700 px-1.5 py-0.5 rounded border border-enervia-100"
              >
                {tag.tag}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center justify-between">
            <span>Live preview</span>
            <Badge className="text-xs bg-amber-50 text-amber-700">
              voorbeeld-data
            </Badge>
          </div>
          <div
            className="prose prose-sm max-w-none border rounded p-3 bg-muted/30 min-h-[200px]"
            dangerouslySetInnerHTML={{
              __html: renderMergeTags(t.inhoud_html, previewCtx),
            }}
          />
        </div>
      </div>
    </div>
  );
}
