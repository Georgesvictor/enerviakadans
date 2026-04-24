import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { InstellingenForm } from "@/components/dashboard/instellingen-form";

export const dynamic = "force-dynamic";

export default async function InstellingenPage() {
  const supabase = createAdminSupabaseClient();
  const { data: settings } = await supabase.from("settings").select("*").single();
  const { data: prijzen } = await supabase
    .from("energieprijzen")
    .select("*")
    .order("geldig_vanaf", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Algemene instellingen</CardTitle>
          <CardDescription>
            Inkomensdrempels, COP warmtepomp, default rentevoet — gelden voor
            nieuwe dossiers vanaf opslaan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstellingenForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actuele energieprijzen</CardTitle>
          <CardDescription>
            Geüpdatet dagelijks via VREG/CREG scraper (06u00). Manuele override
            kan door admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {prijzen?.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 border-b border-enervia-100 text-sm"
              >
                <span>
                  <strong className="capitalize">{p.type}</strong> ({p.bron}) —{" "}
                  {new Date(p.geldig_vanaf).toLocaleDateString("nl-BE")}
                </span>
                <span className="font-mono text-enervia-600">
                  € {Number(p.prijs_per_eenheid).toFixed(4)}/{p.eenheid}
                </span>
              </div>
            ))}
            {(!prijzen || prijzen.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nog geen prijzen opgehaald.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
