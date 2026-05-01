import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getKlantSession } from "@/lib/klantportaal/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortaalOfferte({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getKlantSession();
  if (!session) redirect("/portaal/login");
  const { id } = await params;

  const supabase = createAdminSupabaseClient();
  const { data: o } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .maybeSingle();
  if (!o) notFound();

  // Toegang controleren — moet bij contact_id of company_id van klant horen
  const ownsByContact =
    session.contact_id && o.contact_id === session.contact_id;
  const ownsByCompany =
    session.company_id && o.company_id === session.company_id;
  if (!ownsByContact && !ownsByCompany) notFound();

  const { data: lijnen } = await supabase
    .from("quotation_lines")
    .select("*")
    .eq("quotation_id", id)
    .order("volgorde");

  const status = String(o.status ?? "draft");
  const klantgetekend = !!o.klant_akkoord_op;

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
          <h1 className="text-2xl font-bold text-[#1F4D3F]">{o.titel}</h1>
          <div className="text-sm text-slate-500">
            Offerte {o.nummer} ·{" "}
            {o.datum
              ? new Date(o.datum).toLocaleDateString("nl-BE")
              : "Geen datum"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">Bedrag incl. btw</div>
          <div className="text-3xl font-bold text-[#1F4D3F]">
            €{" "}
            {Number(o.totaal_incl_btw ?? 0).toLocaleString("nl-BE", {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Omschrijving</th>
              <th className="px-4 py-2 text-right">Aantal</th>
              <th className="px-4 py-2 text-right">Prijs</th>
              <th className="px-4 py-2 text-right">Subtotaal</th>
            </tr>
          </thead>
          <tbody>
            {(lijnen ?? []).map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-900">
                    {l.omschrijving}
                  </div>
                  {l.beschrijving && (
                    <div className="mt-1 text-xs text-slate-500">
                      {l.beschrijving}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {Number(l.aantal ?? 1)} {l.eenheid ?? ""}
                </td>
                <td className="px-4 py-2 text-right">
                  €{" "}
                  {Number(l.eenheidsprijs_excl_btw ?? 0).toLocaleString(
                    "nl-BE",
                    { minimumFractionDigits: 2 },
                  )}
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
          <tfoot className="bg-slate-50">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                Excl. btw
              </td>
              <td className="px-4 py-2 text-right font-medium">
                €{" "}
                {Number(o.totaal_excl_btw ?? 0).toLocaleString("nl-BE", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                Btw
              </td>
              <td className="px-4 py-2 text-right">
                €{" "}
                {Number(o.totaal_btw ?? 0).toLocaleString("nl-BE", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr className="border-t border-slate-200">
              <td colSpan={3} className="px-4 py-2 text-right font-bold">
                Totaal incl. btw
              </td>
              <td className="px-4 py-2 text-right text-lg font-bold text-[#1F4D3F]">
                €{" "}
                {Number(o.totaal_incl_btw ?? 0).toLocaleString("nl-BE", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Acceptatie / weigering */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {klantgetekend ? (
          <div className="text-center">
            <div className="text-2xl">✅</div>
            <div className="mt-2 font-semibold text-green-700">
              Akkoord ontvangen
            </div>
            <div className="text-sm text-slate-500">
              Op{" "}
              {new Date(o.klant_akkoord_op as string).toLocaleString("nl-BE")}
            </div>
          </div>
        ) : status === "geweigerd" ? (
          <div className="text-center text-slate-500">
            Deze offerte werd geweigerd.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              Klaar om te tekenen? Klik om akkoord te gaan met deze offerte.
            </div>
            <form
              action={`/api/portaal/offerte/${id}/accepteren`}
              method="POST"
              className="flex flex-wrap gap-3"
            >
              <button className="rounded-md bg-[#1F4D3F] px-5 py-2.5 font-medium text-white hover:bg-[#173A2F]">
                ✓ Akkoord — teken offerte
              </button>
            </form>
            <form
              action={`/api/portaal/offerte/${id}/weigeren`}
              method="POST"
            >
              <button className="text-sm text-slate-500 hover:text-red-600">
                Liever weigeren?
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
