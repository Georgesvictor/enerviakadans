import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const start = new Date();
  start.setDate(start.getDate() - 1);
  const eind = new Date();
  eind.setDate(eind.getDate() + 30);

  const { data } = await supabase
    .from("calendar_events")
    .select(
      "id, titel, begin_tijd, eind_tijd, locatie, hele_dag, status, contacts(voornaam,achternaam), companies(naam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .gte("begin_tijd", start.toISOString())
    .lte("begin_tijd", eind.toISOString())
    .order("begin_tijd");

  const { data: accounts } = await supabase
    .from("calendar_accounts")
    .select("id, provider, email, is_primair, laatst_gesynct")
    .eq("user_id", ctx.userId)
    .eq("tenant_id", ctx.tenantId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Agenda</h1>
          <p className="text-muted-foreground text-sm">
            Afspraken en meetings. Sync met Google Calendar of Outlook via Instellingen.
          </p>
        </div>
        <Link
          href="/app/agenda/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuwe afspraak
        </Link>
      </div>

      {(!accounts || accounts.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <div className="font-semibold text-amber-800">Geen externe agenda gekoppeld</div>
          <div className="text-amber-700 mt-1">
            Koppel Google Calendar of Outlook via{" "}
            <Link
              href="/app/instellingen/integraties"
              className="underline"
            >
              Instellingen → Integraties
            </Link>{" "}
            om je externe agenda automatisch te synchroniseren.
          </div>
        </div>
      )}

      {!data || data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Calendar size={32} className="mx-auto text-muted-foreground mb-2" />
          <div className="text-muted-foreground">
            Geen afspraken in de komende 30 dagen.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {data.map((e: any) => (
            <div key={e.id} className="p-3 flex items-center gap-4">
              <div className="text-center w-14 shrink-0">
                <div className="text-xs uppercase text-muted-foreground">
                  {new Date(e.begin_tijd).toLocaleDateString("nl-BE", {
                    month: "short",
                  })}
                </div>
                <div className="text-xl font-bold text-enervia-700">
                  {new Date(e.begin_tijd).getDate()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.begin_tijd).toLocaleTimeString("nl-BE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/app/agenda/${e.id}`}
                  className="font-medium hover:underline"
                >
                  {e.titel}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {e.locatie && `${e.locatie} · `}
                  {e.contacts
                    ? `${e.contacts.voornaam} ${e.contacts.achternaam}`
                    : e.companies?.naam}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
