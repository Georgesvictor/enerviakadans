import "../globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Klantenportaal — Enervia",
  description:
    "Volg je renovatieproject, premies en facturen op één plek. Powered by Enervia.",
};

export default function PortaalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F7F5] text-slate-900 antialiased">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/portaal" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#1F4D3F] text-white">
              <span className="text-sm font-bold">E</span>
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold text-[#1F4D3F]">
                Enervia
              </div>
              <div className="text-xs text-slate-500">Klantenportaal</div>
            </div>
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a
              href="https://www.enervia.be"
              className="text-slate-500 hover:text-slate-900"
            >
              Hoofdsite
            </a>
            <a
              href="/portaal/help"
              className="text-slate-500 hover:text-slate-900"
            >
              Hulp
            </a>
            <a
              href="/portaal/login"
              className="rounded-md bg-[#1F4D3F] px-3 py-1.5 font-medium text-white hover:bg-[#173A2F]"
            >
              Inloggen
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-slate-500">
          <div>© {new Date().getFullYear()} Enervia BV — BE 1030.660.236</div>
          <div className="flex gap-4">
            <a href="/voorwaarden">Voorwaarden</a>
            <a href="/privacy">Privacy</a>
            <a href="mailto:info@enervia.be">info@enervia.be</a>
            <a href="tel:+3238088666">03 808 86 66</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
