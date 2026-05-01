"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Briefcase,
  Receipt,
  FileText,
  Contact2,
  Building2,
  Package,
  CheckSquare,
  Calendar,
  Settings,
  Zap,
  TrendingUp,
  Inbox,
} from "lucide-react";

type Item = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: any;
  keywords?: string[];
  group: "Navigatie" | "Aanmaken" | "Resultaten";
};

const STATIC_ITEMS: Item[] = [
  // Navigatie
  { id: "nav-deals", label: "Deals", href: "/app/deals", icon: TrendingUp, group: "Navigatie" },
  { id: "nav-contacts", label: "Contacten", href: "/app/contacten", icon: Contact2, group: "Navigatie" },
  { id: "nav-companies", label: "Bedrijven", href: "/app/bedrijven", icon: Building2, group: "Navigatie" },
  { id: "nav-quotes", label: "Offertes", href: "/app/offertes", icon: FileText, group: "Navigatie" },
  { id: "nav-invoices", label: "Facturen", href: "/app/facturen", icon: Receipt, group: "Navigatie" },
  { id: "nav-projects", label: "Projecten", href: "/app/projecten", icon: Briefcase, group: "Navigatie" },
  { id: "nav-tasks", label: "Taken", href: "/app/taken", icon: CheckSquare, group: "Navigatie" },
  { id: "nav-products", label: "Producten", href: "/app/producten", icon: Package, group: "Navigatie" },
  { id: "nav-agenda", label: "Agenda", href: "/app/agenda", icon: Calendar, group: "Navigatie" },
  { id: "nav-inbox", label: "Inbox", href: "/app/inbox", icon: Inbox, group: "Navigatie" },
  { id: "nav-forecast", label: "Forecast", href: "/app/forecast", icon: TrendingUp, group: "Navigatie" },
  { id: "nav-settings", label: "Instellingen", href: "/app/instellingen", icon: Settings, group: "Navigatie" },
  // Aanmaken
  { id: "new-deal", label: "Nieuwe deal", hint: "Maak een deal aan", href: "/app/deals/nieuw", icon: Plus, group: "Aanmaken", keywords: ["create", "deal", "new"] },
  { id: "new-contact", label: "Nieuw contact", href: "/app/contacten/nieuw", icon: Plus, group: "Aanmaken" },
  { id: "new-company", label: "Nieuw bedrijf", href: "/app/bedrijven/nieuw", icon: Plus, group: "Aanmaken" },
  { id: "new-quote", label: "Nieuwe offerte", href: "/app/offertes/nieuw", icon: Plus, group: "Aanmaken" },
  { id: "new-invoice", label: "Nieuwe factuur", href: "/app/facturen/nieuw", icon: Plus, group: "Aanmaken" },
  { id: "new-bestelbon", label: "Nieuwe bestelbon", href: "/app/bestelbonnen/nieuw", icon: Plus, group: "Aanmaken" },
  { id: "new-task", label: "Nieuwe taak", href: "/app/taken/nieuw", icon: Plus, group: "Aanmaken" },
  { id: "new-product", label: "Nieuw product", href: "/app/producten/nieuw", icon: Plus, group: "Aanmaken" },
  { id: "new-template", label: "Nieuwe template", href: "/app/instellingen/templates", icon: Plus, group: "Aanmaken" },
  { id: "new-workflow", label: "Nieuwe workflow", href: "/app/instellingen/workflows", icon: Zap, group: "Aanmaken" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [highlight, setHighlight] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debouncerRef = useRef<NodeJS.Timeout | null>(null);

  // Open / close shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setHighlight(0);
    }
  }, [open]);

  // Server-side search bij typen
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/zoeken?q=${encodeURIComponent(q)}&limit=10`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      const items: Item[] = (data.results ?? []).map((r: any) => ({
        id: `srv-${r.type}-${r.id}`,
        label: r.label,
        hint: `${r.type}${r.subtitle ? ` · ${r.subtitle}` : ""}`,
        href: r.href,
        icon: ICON_FOR_TYPE[r.type as keyof typeof ICON_FOR_TYPE] ?? FileText,
        group: "Resultaten",
      }));
      setResults(items);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    if (debouncerRef.current) clearTimeout(debouncerRef.current);
    debouncerRef.current = setTimeout(() => search(query), 220);
  }, [query, search]);

  const items = (() => {
    const q = query.toLowerCase().trim();
    let staticFiltered = STATIC_ITEMS;
    if (q.length > 0) {
      staticFiltered = STATIC_ITEMS.filter((i) => {
        const hay = (i.label + " " + (i.keywords ?? []).join(" ")).toLowerCase();
        return hay.includes(q);
      });
    }
    return [...results, ...staticFiltered];
  })();

  function go(i: Item) {
    setOpen(false);
    router.push(i.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(items.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[highlight];
      if (item) go(item);
    }
  }

  if (!open) return null;

  // Group items
  const groups: Record<string, Item[]> = {};
  for (const it of items) {
    groups[it.group] = groups[it.group] ?? [];
    groups[it.group].push(it);
  }

  let runningIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm grid place-items-start pt-[15vh] p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-xl border shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-3 border-b">
          <Search size={16} className="text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type om te zoeken: deals, contacten, offertes, facturen…"
            className="flex-1 outline-none text-sm bg-transparent"
          />
          <kbd className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Geen resultaten voor &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(groups).map(([groupName, list]) => (
              <div key={groupName}>
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {groupName}
                </div>
                {list.map((it) => {
                  const idx = runningIdx++;
                  const Icon = it.icon;
                  const active = idx === highlight;
                  return (
                    <button
                      key={it.id}
                      onClick={() => go(it)}
                      onMouseEnter={() => setHighlight(idx)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 ${
                        active
                          ? "bg-enervia-50 text-enervia-700"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Icon size={16} />
                      <div className="flex-1">
                        <div className="text-sm">{it.label}</div>
                        {it.hint && (
                          <div className="text-xs text-muted-foreground">
                            {it.hint}
                          </div>
                        )}
                      </div>
                      {active && (
                        <kbd className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <kbd className="border rounded px-1">↑↓</kbd> navigeren
          </span>
          <span>
            <kbd className="border rounded px-1">↵</kbd> openen
          </span>
          <span>
            <kbd className="border rounded px-1">⌘K</kbd> sluiten
          </span>
        </div>
      </div>
    </div>
  );
}

const ICON_FOR_TYPE = {
  deal: TrendingUp,
  contact: Contact2,
  company: Building2,
  quotation: FileText,
  invoice: Receipt,
  project: Briefcase,
  task: CheckSquare,
};
