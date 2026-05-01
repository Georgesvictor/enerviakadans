/**
 * Fallback sign-in: redirect naar Clerk hosted sign-in pagina.
 * Werkt altijd, onafhankelijk van of de embedded widget laadt.
 */

"use client";

import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    // Clerk hosted sign-in: https://suited-koala-9.clerk.accounts.dev/sign-in
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
    // Extract frontend-api URL uit de publishable key
    try {
      const raw = key.replace(/^pk_(test|live)_/, "");
      const decoded = atob(raw);
      // decoded = "suited-koala-9.clerk.accounts.dev$"
      const domein = decoded.replace(/\$$/, "");
      const url = `https://${domein}/sign-in?redirect_url=${encodeURIComponent(
        `${window.location.origin}/app`,
      )}`;
      window.location.href = url;
    } catch {
      window.location.href = "/sign-in";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-enervia-50 to-white p-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-enervia-700 tracking-wider mb-4">
          KADANS
        </div>
        <p className="text-muted-foreground">
          Doorverwijzen naar de login-pagina...
        </p>
      </div>
    </div>
  );
}
