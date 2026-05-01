/**
 * Publieke klant-portal voor offerte-goedkeuring.
 * Klant krijgt link via mail: /offerte/[klant_token]
 *
 * Token validatie: quotations.klant_token = :token en niet verlopen.
 */

import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenancy/tenants";
import { OfferteGoedkeuring } from "@/components/crm/offerte-goedkeuring";

export const dynamic = "force-dynamic";

export default async function OffertePublic({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("quotations")
    .select(
      "*, companies(naam), contacts(voornaam,achternaam), quotation_lines(*)",
    )
    .eq("klant_token", token)
    .maybeSingle();
  if (!data) notFound();
  if (
    data.klant_token_expires_at &&
    new Date(data.klant_token_expires_at) < new Date()
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="bg-white rounded-lg border p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-enervia-700 mb-2">
            Deze link is vervallen
          </h1>
          <p className="text-muted-foreground text-sm">
            Neem contact op met de leverancier voor een nieuwe link.
          </p>
        </div>
      </div>
    );
  }

  const tenant = await getTenant(data.tenant_id);
  const regels = ((data.quotation_lines as any[]) ?? []).sort(
    (a, b) => a.volgorde - b.volgorde,
  );
  const klantNaam =
    data.companies?.naam ??
    (data.contacts
      ? `${data.contacts.voornaam} ${data.contacts.achternaam}`
      : "");

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-enervia-50 to-white py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-enervia-700 tracking-wider">
            {tenant?.naam ?? "Kadans"}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Offerte {data.nummer ?? ""}
              </div>
              <h1 className="text-2xl font-bold text-enervia-700 mt-1">
                {data.onderwerp}
              </h1>
              <div className="text-sm text-muted-foreground mt-1">
                Voor: {klantNaam}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>
                Datum:{" "}
                {new Date(data.datum).toLocaleDateString("nl-BE")}
              </div>
              {data.geldig_tot && (
                <div>
                  Geldig tot:{" "}
                  {new Date(data.geldig_tot).toLocaleDateString("nl-BE")}
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-enervia-50 text-enervia-700 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Omschrijving</th>
                  <th className="text-right px-4 py-2">Aantal</th>
                  <th className="text-right px-4 py-2">Prijs</th>
                  <th className="text-right px-4 py-2">Subtotaal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {regels.map((r) => (
                  <tr key={r.id} className={r.is_kop ? "bg-enervia-50/50" : ""}>
                    <td
                      className={`px-4 py-2 ${r.is_kop ? "font-semibold" : ""}`}
                    >
                      {r.omschrijving}
                    </td>
                    {!r.is_kop ? (
                      <>
                        <td className="px-4 py-2 text-right">
                          {r.aantal} {r.eenheid}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {f(r.prijs_excl_btw)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {f(r.subtotaal_excl_btw)}
                        </td>
                      </>
                    ) : (
                      <td colSpan={3}></td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-enervia-600 text-white">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                    Totaal incl. btw
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {f(data.totaal_incl_btw)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {data.opmerkingen && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded p-3">
              <strong className="text-foreground">Opmerkingen:</strong>{" "}
              {data.opmerkingen}
            </div>
          )}

          <OfferteGoedkeuring
            token={token}
            status={data.status}
            tenantNaam={tenant?.naam ?? "Kadans"}
          />
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Deze offerte is beveiligd met een unieke link. Niet deel zonder
          toestemming.
        </div>
      </div>
    </div>
  );
}
