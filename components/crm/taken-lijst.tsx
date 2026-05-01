"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { Check, Circle, Clock, AlertTriangle } from "lucide-react";

type Task = {
  id: string;
  titel: string;
  status: string;
  prioriteit: string;
  deadline: string | null;
  toegewezen_aan: string | null;
  projects?: { naam: string } | null;
  contacts?: { voornaam: string; achternaam: string } | null;
};

const PRIORITEIT_KLEUR: Record<string, string> = {
  laag: "bg-slate-100 text-slate-600",
  normaal: "bg-blue-50 text-blue-700",
  hoog: "bg-amber-100 text-amber-700",
  dringend: "bg-red-100 text-red-700",
};

export function TakenLijst({
  initial,
  huidigeUser,
}: {
  initial: Task[];
  huidigeUser: string;
}) {
  const [rows, setRows] = useState<Task[]>(initial);
  const [filter, setFilter] = useState<"alle" | "mijn" | "open" | "afgerond">(
    "open",
  );

  const gefilterd = rows.filter((t) => {
    if (filter === "afgerond") return t.status === "afgerond";
    if (filter === "open")
      return t.status !== "afgerond" && t.status !== "geannuleerd";
    if (filter === "mijn") return t.toegewezen_aan === huidigeUser;
    return true;
  });

  async function toggle(taskId: string, huidig: string) {
    const nieuw = huidig === "afgerond" ? "open" : "afgerond";
    setRows((rs) =>
      rs.map((r) => (r.id === taskId ? { ...r, status: nieuw } : r)),
    );
    try {
      const res = await fetch("/api/taken", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: taskId, status: nieuw }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Update mislukt");
    } catch (err) {
      // Rollback
      setRows((rs) =>
        rs.map((r) => (r.id === taskId ? { ...r, status: huidig } : r)),
      );
      toast({
        title: "Kon taak niet updaten",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {["open", "mijn", "alle", "afgerond"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1 text-xs rounded border ${
              filter === f
                ? "bg-enervia-600 text-white border-enervia-600"
                : "bg-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {gefilterd.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-muted-foreground">Geen taken gevonden.</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {gefilterd.map((t) => {
            const vervallen =
              t.deadline && new Date(t.deadline) < new Date() &&
              t.status !== "afgerond";
            return (
              <div
                key={t.id}
                className="p-3 flex items-center gap-3 hover:bg-muted/20"
              >
                <button
                  onClick={() => toggle(t.id, t.status)}
                  className={`shrink-0 ${
                    t.status === "afgerond"
                      ? "text-enervia-600"
                      : "text-muted-foreground hover:text-enervia-600"
                  }`}
                >
                  {t.status === "afgerond" ? (
                    <Check size={20} />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/app/taken/${t.id}`}
                    className={`font-medium hover:underline ${
                      t.status === "afgerond" ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {t.titel}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {t.projects?.naam &&
                      `Project: ${t.projects.naam} · `}
                    {t.contacts &&
                      `${t.contacts.voornaam} ${t.contacts.achternaam}`}
                  </div>
                </div>
                <Badge
                  className={PRIORITEIT_KLEUR[t.prioriteit] ?? "bg-slate-50"}
                >
                  {t.prioriteit}
                </Badge>
                {t.deadline && (
                  <div
                    className={`text-xs flex items-center gap-1 ${
                      vervallen ? "text-red-600" : "text-muted-foreground"
                    }`}
                  >
                    {vervallen ? <AlertTriangle size={12} /> : <Clock size={12} />}
                    {new Date(t.deadline).toLocaleDateString("nl-BE")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
