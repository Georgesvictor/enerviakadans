"use client";

import { useState } from "react";

export default function PortaalLogin() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [bericht, setBericht] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function vraagAan(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setBericht(null);
    setDevLink(null);
    try {
      const r = await fetch("/api/portaal/aanvragen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      setBericht(
        j.bericht ??
          "Als deze e-mail bij ons gekend is, ontvang je binnen enkele minuten een link.",
      );
      if (j.devLink) setDevLink(j.devLink);
    } catch {
      setBericht("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1F4D3F]">Inloggen</h1>
        <p className="mt-1 text-sm text-slate-600">
          Geef het e-mailadres op dat we voor jou kennen. We sturen je een
          veilige inlog-link.
        </p>

        <form onSubmit={vraagAan} className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            E-mailadres
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jouw@email.be"
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-[#1F4D3F] focus:ring-1 focus:ring-[#1F4D3F]"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-[#1F4D3F] px-4 py-2.5 font-medium text-white hover:bg-[#173A2F] disabled:opacity-60"
          >
            {busy ? "Bezig…" : "Stuur me een inlog-link"}
          </button>
        </form>

        {bericht && (
          <div className="mt-4 rounded-md bg-[#E8F0ED] p-3 text-sm text-[#1F4D3F]">
            {bericht}
          </div>
        )}
        {devLink && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs">
            <div className="font-semibold text-amber-900">
              Dev-link (alleen lokaal):
            </div>
            <a
              href={devLink}
              className="mt-1 break-all text-amber-700 underline"
            >
              {devLink}
            </a>
          </div>
        )}
      </div>
      <div className="mt-4 text-center text-sm text-slate-500">
        Geen klant? <a className="underline" href="https://www.enervia.be/contact">Neem contact op</a>
      </div>
    </div>
  );
}
