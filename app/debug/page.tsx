/**
 * Diagnostiek-pagina — enkel voor dev gebruik om Clerk/env config te checken.
 */

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DebugPage() {
  const env = {
    APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CLERK_KEY_START: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(0, 20),
    SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    AFTER_SIGN_IN: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_KEY_START:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20),
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Terug
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-4 mb-6">
          Debug info
        </h1>

        <section className="mb-6">
          <h2 className="font-semibold mb-2">Environment</h2>
          <table className="w-full text-sm border">
            <tbody>
              {Object.entries(env).map(([k, v]) => (
                <tr key={k} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs bg-muted/30">
                    {k}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {v ?? (
                      <span className="text-red-600">
                        !!! NIET INGESTELD !!!
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold mb-2">Test sign-in zonder Clerk layout</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Open deze link om de Clerk-widget direct te testen:
          </p>
          <Link
            href="/debug/signin-test"
            className="text-enervia-600 hover:underline"
          >
            /debug/signin-test
          </Link>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold mb-2">Clerk dashboard links</h2>
          <ul className="text-sm space-y-1">
            <li>
              <a
                href="https://dashboard.clerk.com"
                target="_blank"
                rel="noreferrer"
                className="text-enervia-600 hover:underline"
              >
                Clerk dashboard →
              </a>
            </li>
            <li>
              Check:{" "}
              <strong>
                User & Authentication → Email, Phone, Username
              </strong>{" "}
              (email moet aan staan)
            </li>
            <li>
              Check: <strong>User & Authentication → Social Connections</strong>{" "}
              (Google enablen)
            </li>
            <li>
              Check: <strong>Paths</strong> → Home URL =
              http://localhost:3100
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
