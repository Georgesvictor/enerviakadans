"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { BedrijfsentiteitDetail } from "./bedrijfsentiteit-detail";

type Entity = any;

export function BedrijfsentiteitenLijst({
  actief,
  gedeactiveerd,
}: {
  actief: Entity[];
  gedeactiveerd: Entity[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"actief" | "gedeactiveerd">("actief");
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(actief.length > 0 ? [actief[0].id] : []),
  );
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setOpenIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function nieuweEntity() {
    const naam = window.prompt("Naam van de nieuwe bedrijfsentiteit?");
    if (!naam) return;
    setBusy(true);
    try {
      const res = await fetch("/api/bedrijfsentiteiten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ naam }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      toast({ title: "Entiteit aangemaakt", variant: "success" });
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
    <div>
      <div className="flex items-center justify-between border-b">
        <div className="flex">
          <button
            onClick={() => setTab("actief")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "actief"
                ? "border-enervia-600 text-enervia-700"
                : "border-transparent text-muted-foreground hover:text-enervia-700"
            }`}
          >
            ACTIEF ({actief.length})
          </button>
          <button
            onClick={() => setTab("gedeactiveerd")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "gedeactiveerd"
                ? "border-enervia-600 text-enervia-700"
                : "border-transparent text-muted-foreground hover:text-enervia-700"
            }`}
          >
            GEDEACTIVEERD ({gedeactiveerd.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={nieuweEntity} disabled={busy} variant="outline">
            <Plus size={14} /> Nieuwe entiteit
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(tab === "actief" ? actief : gedeactiveerd).map((e) => {
          const open = openIds.has(e.id);
          return (
            <div key={e.id} className="bg-white rounded-lg border">
              <button
                onClick={() => toggle(e.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30"
              >
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div className="w-10 h-10 rounded bg-enervia-50 flex items-center justify-center text-xs font-bold text-enervia-700">
                  {e.korte_afkorting ?? (e.naam?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-enervia-700 flex items-center gap-2">
                    {e.naam}
                    {e.is_default && (
                      <Badge className="bg-blue-50 text-blue-700 text-xs">
                        Standaard
                      </Badge>
                    )}
                  </div>
                  {e.email && (
                    <div className="text-xs text-muted-foreground">
                      {e.email} · {e.btw_nummer ?? ""}
                    </div>
                  )}
                </div>
                <MoreVertical
                  size={16}
                  className="text-muted-foreground"
                />
              </button>
              {open && tab === "actief" && (
                <div className="border-t">
                  <BedrijfsentiteitDetail entity={e} />
                </div>
              )}
            </div>
          );
        })}
        {(tab === "actief" ? actief : gedeactiveerd).length === 0 && (
          <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground">
            Geen entiteiten in deze tab.
          </div>
        )}
      </div>
    </div>
  );
}
