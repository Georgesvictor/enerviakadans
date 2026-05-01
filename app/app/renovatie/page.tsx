import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { getTenant } from "@/lib/tenancy/tenants";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RenovatieHome() {
  const ctx = await requireTenant();
  const tenant = await getTenant(ctx.tenantId);
  const heeftSimulator = tenant?.features?.simulator === true;

  if (!heeftSimulator) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <Sparkles size={40} className="mx-auto text-accent-400 mb-3" />
        <h1 className="text-2xl font-bold text-enervia-700">
          Renovatie-simulator
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Deze module is een add-on van Kadans voor renovatiebedrijven. Neem
          contact op met Enervia om deze te activeren.
        </p>
      </div>
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("dossiers")
    .select(
      "id, offerte_referentie, status, created_at, offerte_datum, klanten(voornaam, achternaam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">
            Renovatie-dossiers
          </h1>
          <p className="text-muted-foreground text-sm">
            Enervia-module: offerte-extractie, premies, MijnVerbouwLening en
            klantdossiers.
          </p>
        </div>
        <Link
          href="/dashboard/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuw dossier
        </Link>
      </div>

      {!data || data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Sparkles size={32} className="mx-auto text-accent-400 mb-2" />
          <div className="text-muted-foreground">Nog geen dossiers.</div>
          <Link
            href="/dashboard/nieuw"
            className="inline-block mt-3 text-enervia-600 hover:underline"
          >
            + Eerste dossier opmaken
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Referentie</th>
                <th className="text-left px-4 py-3">Klant</th>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">
                    {d.offerte_referentie ?? d.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/dossiers/${d.id}`}
                      className="text-enervia-700 hover:underline"
                    >
                      {d.klanten
                        ? `${d.klanten.voornaam} ${d.klanten.achternaam}`
                        : "Onbekend"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("nl-BE")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs px-2 py-0.5 bg-muted rounded">
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
