"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const COOKIE_KEY = "kadans_cookie_consent";

export function CookieBanner() {
  const [zichtbaar, setZichtbaar] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_KEY)) setZichtbaar(true);
    } catch {
      // privaat browsen
    }
  }, []);

  function accepteer(keuze: "alles" | "nodig") {
    try {
      localStorage.setItem(
        COOKIE_KEY,
        JSON.stringify({
          keuze,
          gekozen_op: new Date().toISOString(),
        }),
      );
    } catch {}
    setZichtbaar(false);
  }

  if (!zichtbaar) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-white rounded-lg shadow-xl border p-5 text-sm">
      <div className="font-semibold text-enervia-700 mb-2">
        We gebruiken cookies
      </div>
      <p className="text-muted-foreground text-xs mb-3">
        Kadans gebruikt enkel essentiële cookies voor de werking van de
        applicatie. Geen tracking, geen advertentie-cookies.{" "}
        <Link href="/privacy" className="underline">
          Lees meer
        </Link>
        .
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => accepteer("nodig")}
          className="flex-1 px-3 py-2 border rounded text-xs hover:bg-muted"
        >
          Enkel nodig
        </button>
        <button
          onClick={() => accepteer("alles")}
          className="flex-1 px-3 py-2 bg-enervia-600 text-white rounded text-xs hover:bg-enervia-700"
        >
          Akkoord
        </button>
      </div>
    </div>
  );
}
