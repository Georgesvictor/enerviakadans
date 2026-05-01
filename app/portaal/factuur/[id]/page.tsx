import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getKlantSession } from "@/lib/klantportaal/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortaalFactuur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getKlantSession();
  if (!session) redirect("/portaal/login");
  const { id } = await params;

  const supabase = createAdminSupabaseClient();
  const { data: f } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .maybeSingle();
  if (
    !f ||
    (f.contact_id !== session.contact_id &&
      f.company_id !== session.company_id)
  )
    notFound();

  const { data: lijnen } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .order("volgorde");

  const { data: entiteit } = await supabase
    .from("business_entities")
    .select("naam, iban, bic, btw_nummer")
    .eq("id", f.business_entity_id ?? "")
    .maybeSingle();

  const verlopen =
    f.vervaldatum && !f.betaald_op && new Date(f.vervaldatum) < new Date();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/portaal/dashboard"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Dashboard
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F4D3F]">{f.titel}</h1>
          <div className="text-sm text-slate-500">
            Factuur {f.nummer} ·{" "}
            {f.datum
              ? new Date(f.datum).toLocaleDateString("nl-BE")
              : "Geen datum"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">Totaal incl. btw</div>
          <div className="text-3xl font-bold text-[#1F4D3F]">
            €{" "}
            {Number(f.totaal_incl_btw ?? 0).toLocaleString("nl-BE", {
              minimumFractionDigits: 2,
            })}
          </div>
          {f.betaald_op ? (
            <span className="mt-1 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Betaald op {new Date(f.betaald_op).toLocaleDateString("nl-BE")}
            </span>
          ) : verlopen ? (
            <span className="mt-1 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              Vervallen sinds{" "}
              {new Date(f.vervaldatum as string).toLocaleDateString("nl-BE")}
            </span>
          ) : (
            <span className="mt-1 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Vervaldatum:{" "}
              {f.vervaldatum
                ? new Date(f.vervaldatum).toLocaleDateString("nl-BE")
                : "—"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Omschrijving</th>
              <th className="px-4 py-2 text-right">Aantal</th>
              <th className="px-4 py-2 text-right">Subtotaal</th>
            </tr>
          </thead>
          <tbody>
            {(lijnen ?? []).map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{l.omschrijving}</td>
                <td className="px-4 py-2 text-right">
                  {Number(l.aantal ?? 1)} {l.eenheid ?? ""}
                </td>
                <td className="px-4 py-2 text-right font-medium">
                  €{" "}
                  {Number(l.subtotaal_excl_btw ?? 0).toLocaleString("nl-BE", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Betaalinstructies */}
      {!f.betaald_op && entiteit && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Hoe betalen?
          </h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Veld label="Begunstigde">{entiteit.naam}</Veld>
            <Veld label="IBAN">
              <span className="font-mono">{entiteit.iban}</span>
            </Veld>
            <Veld label="BIC">{entiteit.bic ?? "—"}</Veld>
            <Veld label="Mededeling">
              <span className="font-mono">
                {f.gestructureerde_mededeling ?? f.nummer}
              </span>
            </Veld>
            <Veld label="Bedrag">
              €{" "}
              {Number(f.totaal_incl_btw ?? 0).toLocaleString("nl-BE", {
                minimumFractionDigits: 2,
              })}
            </Veld>
            <Veld label="Vervaldatum">
              {f.vervaldatum
                ? new Date(f.vervaldatum).toLocaleDateString("nl-BE")
                : "—"}
            </Veld>
          </div>
        </div>
      )}
    </div>
  );
}

function Veld({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="font-medium text-slate-900">{children}</div>
    </div>
  );
}
