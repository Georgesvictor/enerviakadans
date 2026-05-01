/**
 * Dev-login pagina: één klik om de bypass-cookie te zetten en als
 * info@enervia.be ingelogd te raken — geen Clerk nodig.
 *
 * Werkt alleen als DEV_AUTH_BYPASS=1 in env staat.
 */

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DevLoginPage() {
  if (process.env.DEV_AUTH_BYPASS !== "1") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-lg border p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-enervia-700 mb-2">
            Dev-login uitgeschakeld
          </h1>
          <p className="text-muted-foreground text-sm">
            Zet <code className="bg-muted px-1">DEV_AUTH_BYPASS=1</code> in
            .env.local en herstart de server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-enervia-50 to-white p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full border text-center">
        <div className="text-2xl font-bold text-enervia-700 tracking-wider mb-4">
          KADANS · DEV
        </div>
        <h1 className="text-lg font-bold text-enervia-700 mb-2">
          Snelle dev-login
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sla Clerk over en log direct in als{" "}
          <strong>info@enervia.be</strong> (admin van Enervia tenant).
        </p>
        <form action="/api/dev-login" method="POST">
          <button
            type="submit"
            className="w-full h-12 bg-enervia-600 text-white rounded-lg hover:bg-enervia-700 font-medium"
          >
            Log in als info@enervia.be
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-4">
          ⚠️ Werkt alleen lokaal (DEV_AUTH_BYPASS=1).
          <br />
          Productie moet altijd Clerk gebruiken.
        </p>
        <div className="mt-6 pt-4 border-t">
          <Link
            href="/sign-in"
            className="text-xs text-muted-foreground hover:underline"
          >
            Of gebruik de echte Clerk login →
          </Link>
        </div>
      </div>
    </div>
  );
}
