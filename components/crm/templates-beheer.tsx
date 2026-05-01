"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, X, Star } from "lucide-react";
import { TemplateEditor } from "./template-editor";

type Template = {
  id: string;
  naam: string;
  type: string;
  is_default: boolean;
  inhoud_html: string;
  updated_at?: string;
};

const TYPE_LABEL: Record<string, string> = {
  offerte: "Offerte",
  factuur: "Factuur",
  herinnering: "Herinnering",
  email: "E-mail",
  pdf_layout: "PDF lay-out",
};

export function TemplatesBeheer({ initial }: { initial: Template[] }) {
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  const grouped = initial.reduce(
    (acc: Record<string, Template[]>, t) => {
      acc[t.type] = acc[t.type] ?? [];
      acc[t.type].push(t);
      return acc;
    },
    {},
  );

  return (
    <>
      {(editing || creating) && (
        <div className="bg-enervia-50 border border-enervia-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-enervia-700">
              {creating ? "Nieuwe template" : `Template bewerken — ${editing?.naam}`}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
            >
              <X size={14} /> Sluiten
            </Button>
          </div>
          <TemplateEditor
            initial={editing ?? undefined}
            onClose={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </div>
      )}

      {!(editing || creating) && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus size={14} /> Nieuwe template
          </Button>
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <section key={type} className="space-y-2">
          <h2 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
            {TYPE_LABEL[type] ?? type}
          </h2>
          <div className="space-y-2">
            {items.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setEditing(t);
                  setCreating(false);
                }}
                className="w-full text-left bg-white rounded-lg border p-4 flex items-start gap-3 hover:border-enervia-400 transition"
              >
                <FileText size={18} className="text-enervia-600 mt-1" />
                <div className="flex-1">
                  <div className="font-medium text-enervia-700 flex items-center gap-2">
                    {t.naam}
                    {t.is_default && (
                      <Badge className="text-xs bg-blue-50 text-blue-700">
                        <Star size={10} className="inline mr-1" />
                        Standaard
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {(t.inhoud_html ?? "").replace(/<[^>]+>/g, " ").slice(0, 200)}
                    {t.inhoud_html && t.inhoud_html.length > 200 ? "…" : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {initial.length === 0 && !creating && (
        <div className="bg-white rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Nog geen templates. Maak er een aan met de knop hierboven.
        </div>
      )}
    </>
  );
}
