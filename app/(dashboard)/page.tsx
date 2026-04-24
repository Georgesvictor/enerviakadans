import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEur, formatDate } from "@/lib/utils/format";
import { FilePlus, Files, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OverzichtPage() {
  const { userId } = await auth();
  const supabase = createAdminSupabaseClient();

  const { data: dossiers } = await supabase
    .from("dossiers")
    .select(
      `id, offerte_referentie, status, created_at, auto_verwijder_op,
       klant:klanten(voornaam, achternaam),
       premie:premie_simulaties(totaal_premies)`,
    )
    .eq("verkoper_id", userId ?? "")
    .order("created_at", { ascending: false })
    .limit(10);

  const totaal = dossiers?.length ?? 0;
  const voltooid = dossiers?.filter((d) => d.status === "compleet" || d.status === "gedeeld").length ?? 0;
  const totaalPremies = dossiers?.reduce(
    (acc, d) => acc + (d.premie?.[0]?.totaal_premies ?? 0),
    0,
  ) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-enervia-600">Welkom terug</h2>
          <p className="text-muted-foreground">
            Jouw recente simulaties en dossiers in één oogopslag.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/nieuw">
            <FilePlus className="h-4 w-4" />
            Nieuw dossier
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Totale dossiers"
          value={String(totaal)}
          icon={<Files className="h-5 w-5" />}
        />
        <StatCard
          title="Afgerond"
          value={`${voltooid} / ${totaal}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Totaal aan premies"
          value={formatEur(totaalPremies, true)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recente dossiers</CardTitle>
          <CardDescription>
            Je 10 meest recente simulaties. GDPR-auto-verwijder 90 dagen na aanmaken.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!dossiers || dossiers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nog geen dossiers. Maak je eerste simulatie aan.
            </p>
          ) : (
            <div className="space-y-2">
              {dossiers.map((d) => (
                <Link
                  key={d.id}
                  href={`/dashboard/dossiers/${d.id}`}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-enervia-50 border border-transparent hover:border-enervia-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        d.status === "compleet" || d.status === "gedeeld"
                          ? "success"
                          : d.status === "extracted"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {d.status}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {d.offerte_referentie ?? "Geen referentie"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(d.klant as any)?.voornaam ?? "?"}{" "}
                        {(d.klant as any)?.achternaam ?? ""} · {formatDate(d.created_at!)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-enervia-600">
                      {formatEur(d.premie?.[0]?.totaal_premies ?? 0, true)}
                    </div>
                    <div className="text-xs text-muted-foreground">premies</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p
              className={`text-2xl font-bold mt-1 ${accent ? "text-accent-400" : "text-enervia-600"}`}
            >
              {value}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-enervia-50 flex items-center justify-center text-enervia-500">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
