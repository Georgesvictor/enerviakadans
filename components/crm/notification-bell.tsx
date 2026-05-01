"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, AlertTriangle, Clock, Sparkles, FileText } from "lucide-react";

type N = {
  id: string;
  type: string;
  titel: string;
  detail?: string;
  href: string;
  prioriteit: "info" | "warn" | "alert";
  at: string;
};

const ICONS: Record<string, any> = {
  factuur_vervallen: AlertTriangle,
  taak_deadline: Clock,
  deal_stale: Clock,
  offerte_wacht: FileText,
  deal_won: Sparkles,
  lead_nieuw: Bell,
};

const COLORS: Record<string, string> = {
  alert: "text-red-600 bg-red-50",
  warn: "text-amber-600 bg-amber-50",
  info: "text-blue-600 bg-blue-50",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[]>([]);
  const [busy, setBusy] = useState(false);

  async function fetchItems() {
    setBusy(true);
    try {
      const r = await fetch("/api/notifications");
      const data = await r.json();
      setItems(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    fetchItems();
    const t = setInterval(fetchItems, 60000); // refresh elke minuut
    return () => clearInterval(t);
  }, []);

  const alertCount = items.filter((i) => i.prioriteit === "alert").length;
  const totaal = items.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-9 rounded-full hover:bg-muted grid place-items-center"
        aria-label="Notificaties"
      >
        <Bell size={16} />
        {totaal > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold grid place-items-center text-white ${
              alertCount > 0 ? "bg-red-500" : "bg-amber-500"
            }`}
          >
            {totaal}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 z-50 bg-white border rounded-lg shadow-2xl w-96 max-h-[70vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold">Notificaties</h3>
              <span className="text-xs text-muted-foreground">
                {totaal} item{totaal === 1 ? "" : "s"}
              </span>
            </div>
            <div className="overflow-y-auto flex-1">
              {busy && items.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  Laden...
                </div>
              )}
              {!busy && items.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  Niets te zien — alles onder controle 🎉
                </div>
              )}
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 p-3 border-b hover:bg-muted/50"
                  >
                    <div
                      className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${COLORS[n.prioriteit]}`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">
                        {n.titel}
                      </div>
                      {n.detail && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {n.detail}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
