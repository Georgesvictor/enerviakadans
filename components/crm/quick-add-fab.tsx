"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  TrendingUp,
  Contact2,
  Building2,
  FileText,
  Receipt,
  CheckSquare,
  Package,
  Sparkles,
  X,
} from "lucide-react";

const ITEMS = [
  {
    href: "/app/deals/nieuw",
    label: "Nieuwe deal",
    icon: TrendingUp,
    color: "bg-emerald-500",
    shortcut: "d",
  },
  {
    href: "/app/contacten/nieuw",
    label: "Nieuw contact",
    icon: Contact2,
    color: "bg-blue-500",
    shortcut: "c",
  },
  {
    href: "/app/bedrijven/nieuw",
    label: "Nieuw bedrijf",
    icon: Building2,
    color: "bg-indigo-500",
    shortcut: "b",
  },
  {
    href: "/app/offertes/nieuw",
    label: "Nieuwe offerte",
    icon: FileText,
    color: "bg-amber-500",
    shortcut: "o",
  },
  {
    href: "/app/facturen/nieuw",
    label: "Nieuwe factuur",
    icon: Receipt,
    color: "bg-rose-500",
    shortcut: "f",
  },
  {
    href: "/app/taken/nieuw",
    label: "Nieuwe taak",
    icon: CheckSquare,
    color: "bg-violet-500",
    shortcut: "t",
  },
  {
    href: "/app/producten/nieuw",
    label: "Nieuw product",
    icon: Package,
    color: "bg-slate-500",
    shortcut: "p",
  },
];

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 'n' opens quick-add (zoals TL/Linear)
      if (
        e.key === "n" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !["INPUT", "TEXTAREA"].includes(
          (document.activeElement as HTMLElement)?.tagName ?? "",
        )
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      } else if (open) {
        // Single-key shortcut binnen menu
        const item = ITEMS.find((i) => i.shortcut === e.key);
        if (item) {
          window.location.href = item.href;
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-30">
      {open && (
        <div className="absolute bottom-16 right-0 w-72 bg-white rounded-xl border shadow-2xl p-2 animate-in slide-in-from-bottom-2 fade-in duration-150">
          <div className="px-3 py-2 border-b mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              Snel aanmaken
            </span>
            <kbd className="text-[10px] border rounded px-1.5 py-0.5 text-muted-foreground">
              N
            </kbd>
          </div>
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm group"
              >
                <span
                  className={`w-7 h-7 rounded-md grid place-items-center text-white ${it.color}`}
                >
                  <Icon size={14} />
                </span>
                <span className="flex-1">{it.label}</span>
                <kbd className="text-[10px] border rounded px-1.5 py-0.5 text-muted-foreground opacity-0 group-hover:opacity-100">
                  {it.shortcut.toUpperCase()}
                </kbd>
              </Link>
            );
          })}
          <div className="px-3 pt-2 mt-1 border-t flex items-center gap-2 text-[10px] text-muted-foreground">
            <Sparkles size={10} />
            Druk op één letter om snel te navigeren
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-14 h-14 rounded-full shadow-2xl grid place-items-center text-white transition-all ${
          open
            ? "bg-red-500 rotate-45 scale-110"
            : "bg-gradient-to-br from-enervia-600 to-enervia-700 hover:scale-110"
        }`}
        aria-label="Snel aanmaken"
        title="Snel aanmaken (N)"
      >
        {open ? <X size={20} /> : <Plus size={22} />}
      </button>
    </div>
  );
}
