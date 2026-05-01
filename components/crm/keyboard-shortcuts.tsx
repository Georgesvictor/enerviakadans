"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["⌘", "K"], desc: "Globaal zoeken" },
  { keys: ["N"], desc: "Snel-aanmaken menu" },
  { keys: ["?"], desc: "Toon deze help" },
  { keys: ["G", "D"], desc: "Ga naar Deals" },
  { keys: ["G", "C"], desc: "Ga naar Contacten" },
  { keys: ["G", "B"], desc: "Ga naar Bedrijven" },
  { keys: ["G", "O"], desc: "Ga naar Offertes" },
  { keys: ["G", "F"], desc: "Ga naar Facturen" },
  { keys: ["G", "P"], desc: "Ga naar Projecten" },
  { keys: ["G", "T"], desc: "Ga naar Taken" },
  { keys: ["G", "A"], desc: "Ga naar Agenda" },
  { keys: ["G", "I"], desc: "Ga naar Inbox" },
  { keys: ["G", "H"], desc: "Ga naar Dashboard (Home)" },
  { keys: ["G", "S"], desc: "Ga naar Instellingen" },
  { keys: ["ESC"], desc: "Sluit modal/menu" },
];

const ROUTES: Record<string, string> = {
  d: "/app/deals",
  c: "/app/contacten",
  b: "/app/bedrijven",
  o: "/app/offertes",
  f: "/app/facturen",
  p: "/app/projecten",
  t: "/app/taken",
  a: "/app/agenda",
  i: "/app/inbox",
  h: "/app",
  s: "/app/instellingen",
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [gPressed, setGPressed] = useState(false);

  useEffect(() => {
    let resetTimer: NodeJS.Timeout | null = null;

    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName ?? "";
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);
      if (isTyping) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setHelpOpen(false);
        setGPressed(false);
        return;
      }

      if (gPressed) {
        const route = ROUTES[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        setGPressed(false);
        if (resetTimer) clearTimeout(resetTimer);
        return;
      }

      if (e.key === "g" || e.key === "G") {
        setGPressed(true);
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => setGPressed(false), 1500);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [router, gPressed]);

  return (
    <>
      {gPressed && (
        <div className="fixed bottom-4 left-4 z-40 bg-enervia-700 text-white rounded-lg px-3 py-2 text-xs shadow-2xl flex items-center gap-2 animate-pulse">
          <kbd className="bg-white/20 rounded px-1.5 py-0.5">G</kbd>
          <span>volgende toets... (D/C/B/O/F/P/T/A/I/H/S)</span>
        </div>
      )}

      {helpOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="bg-white rounded-xl border shadow-2xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-enervia-600" />
                <h2 className="font-semibold">Sneltoetsen</h2>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="hover:bg-muted rounded p-1"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {SHORTCUTS.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-2 py-1.5 hover:bg-muted/30 rounded"
                >
                  <span className="text-sm">{s.desc}</span>
                  <div className="flex gap-1">
                    {s.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className="font-mono text-xs border rounded px-1.5 py-0.5 bg-muted/40"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
              💡 Druk op <kbd className="border rounded px-1">?</kbd> om dit
              overzicht opnieuw te openen.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
