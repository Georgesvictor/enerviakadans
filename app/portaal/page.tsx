import Link from "next/link";
import { redirect } from "next/navigation";
import { getKlantSession } from "@/lib/klantportaal/auth";

export const dynamic = "force-dynamic";

export default async function PortaalLanding() {
  const session = await getKlantSession();
  if (session) redirect("/portaal/dashboard");

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F0ED] px-3 py-1 text-xs font-semibold text-[#1F4D3F]">
            🏠 Voor Enervia-klanten
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-[#1F4D3F]">
            Volg je renovatie<br />
            <span className="text-[#E87722]">van begin tot oplevering.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-slate-600">
            Eén plek voor je offertes, facturen, werfvoortgang, premies en
            documenten. Geen gedoe meer met losse mails of papier.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/portaal/login"
              className="rounded-md bg-[#1F4D3F] px-5 py-3 font-medium text-white hover:bg-[#173A2F]"
            >
              Log in met je e-mail →
            </Link>
            <a
              href="https://www.enervia.be/contact"
              className="rounded-md border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Nog geen klant?
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Geen wachtwoord nodig — we sturen je een veilige inlog-link.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Tile icon="📑" titel="Offertes & contracten">
              Bekijk en teken offertes online — geen post nodig.
            </Tile>
            <Tile icon="🏗️" titel="Werfvoortgang">
              Foto&apos;s en updates van je werf, fase per fase.
            </Tile>
            <Tile icon="💶" titel="Facturen & betalingen">
              Open facturen, betaalstatus en historiek in één oogopslag.
            </Tile>
            <Tile icon="🎁" titel="Premies & subsidies">
              Mijn­Verbouw­Premie, EPC-labelpremie, asbestpremie — alle
              statussen op één plek.
            </Tile>
            <Tile icon="💬" titel="Direct contact">
              Stel een vraag aan je projectbeheerder — antwoord binnen 24u.
            </Tile>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({
  icon,
  titel,
  children,
}: {
  icon: string;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#E8F0ED] text-lg">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-slate-900">{titel}</div>
        <div className="text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}
