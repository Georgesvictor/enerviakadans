import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Building2, Globe, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BedrijvenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("companies")
    .select(
      "id, naam, btw_nummer, website, sector, postcode, gemeente, is_klant, is_leverancier",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("naam")
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Bedrijven</h1>
          <p className="text-muted-foreground text-sm">
            B2B klanten, leveranciers en partners.
          </p>
        </div>
        <Link
          href="/app/bedrijven/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuw bedrijf
        </Link>
      </div>

      {!data || data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Building2
            size={32}
            className="mx-auto text-muted-foreground mb-2"
          />
          <div className="text-muted-foreground">
            Nog geen bedrijven toegevoegd.
          </div>
          <Link
            href="/app/bedrijven/nieuw"
            className="inline-block mt-3 text-enervia-600 hover:underline"
          >
            + Eerste bedrijf toevoegen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((c: any) => (
            <Link
              key={c.id}
              href={`/app/bedrijven/${c.id}`}
              className="bg-white rounded-lg border p-4 hover:border-enervia-600 hover:shadow transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-enervia-700 truncate">
                    {c.naam}
                  </div>
                  {c.sector && (
                    <div className="text-xs text-muted-foreground">
                      {c.sector}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {c.is_klant && (
                    <Badge className="bg-enervia-50 text-enervia-700 border border-enervia-600/30">
                      Klant
                    </Badge>
                  )}
                  {c.is_leverancier && (
                    <Badge variant="outline">Leverancier</Badge>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {c.btw_nummer && (
                  <div className="text-xs">BTW {c.btw_nummer}</div>
                )}
                {c.website && (
                  <div className="flex items-center gap-1 text-xs">
                    <Globe size={12} /> {c.website}
                  </div>
                )}
                {(c.postcode || c.gemeente) && (
                  <div className="flex items-center gap-1 text-xs">
                    <MapPin size={12} />
                    {c.postcode} {c.gemeente}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
