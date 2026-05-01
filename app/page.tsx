/**
 * Kadans marketing landing page.
 * Gebruikt plain <a> tags (ipv next/link) zodat navigatie altijd werkt,
 * ook als Clerk-JS niet laadt.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Landing() {
  // DEV-BYPASS: meteen naar app, geen login nodig
  if (process.env.DEV_AUTH_BYPASS === "1") {
    redirect("/app");
  }

  // Echte Clerk login → naar app
  const { userId } = await auth();
  if (userId) redirect("/app");

  return (
    <div className="min-h-screen bg-gradient-to-br from-enervia-50 via-white to-enervia-50">
      <nav className="max-w-6xl mx-auto flex items-center justify-between p-6">
        <a
          href="/"
          className="text-2xl font-bold text-enervia-700 tracking-wider"
        >
          KADANS
        </a>
        <div className="flex items-center gap-4">
          <a
            href="/sign-in"
            className="text-sm text-enervia-700 hover:underline"
          >
            Inloggen
          </a>
          <a
            href="/sign-up"
            className="text-sm bg-enervia-600 text-white px-4 py-2 rounded hover:bg-enervia-700"
          >
            Gratis starten
          </a>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto text-center px-6 py-20">
        <div className="inline-block text-xs bg-accent-50 text-accent-400 font-semibold px-3 py-1 rounded-full mb-6">
          Voor Belgische KMO's · Peppol-ready · GDPR
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-enervia-700 leading-tight">
          Eén tool voor jouw
          <br />
          <span className="text-accent-400">hele sales-flow</span>
        </h1>
        <p className="text-xl text-muted-foreground mt-6 max-w-2xl mx-auto">
          Kadans brengt contacten, deals, offertes, facturen en projecten samen
          in één overzichtelijke CRM. Gebouwd voor Belgische ondernemers.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <a
            href="/sign-up"
            className="bg-enervia-600 text-white px-6 py-3 rounded-lg hover:bg-enervia-700 font-medium"
          >
            Probeer gratis 30 dagen
          </a>
          <a
            href="/sign-in"
            className="text-enervia-700 hover:underline font-medium"
          >
            Of login →
          </a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-enervia-700 mb-12">
          Alles wat je nodig hebt
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: "CRM & Deals", d: "Contacten, bedrijven en een visuele pipeline met drag-and-drop." },
            { t: "Offertes & Facturen", d: "Professionele documenten met templates en klant-goedkeuring." },
            { t: "Peppol e-invoicing", d: "Verplicht B2B vanaf 2026. Wij regelen de verzending." },
            { t: "Projecten & uren", d: "Milestones, tijdregistratie en facturering uit uren." },
            { t: "Inbox-integratie", d: "Gmail, Outlook en IMAP. E-mails gekoppeld aan contact/deal." },
            { t: "Bank-reconciliation", d: "Via Ponto (PSD2). Betalingen auto-gekoppeld aan facturen." },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border p-6 hover:border-enervia-600 transition"
            >
              <h3 className="font-bold text-enervia-700">{f.t}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © 2026 Kadans · Gebouwd in België ·{" "}
        <a href="/privacy" className="hover:underline">
          Privacy
        </a>{" "}
        ·{" "}
        <a href="/voorwaarden" className="hover:underline">
          Voorwaarden
        </a>
      </footer>
    </div>
  );
}
