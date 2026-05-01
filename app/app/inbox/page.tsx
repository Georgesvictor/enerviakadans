import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [accountsRes, threadsRes] = await Promise.all([
    supabase
      .from("email_accounts")
      .select("id, provider, email, is_actief, laatst_gesynct")
      .eq("tenant_id", ctx.tenantId)
      .eq("user_id", ctx.userId),
    supabase
      .from("email_threads")
      .select("id, onderwerp, deelnemers, laatst_bericht_op, ongelezen, aantal_berichten")
      .eq("tenant_id", ctx.tenantId)
      .eq("gearchiveerd", false)
      .order("laatst_bericht_op", { ascending: false, nullsFirst: false })
      .limit(100),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Inbox</h1>
          <p className="text-muted-foreground text-sm">
            E-mails van en naar klanten, gekoppeld aan deals en dossiers.
          </p>
        </div>
        <Link
          href="/app/instellingen/integraties"
          className="text-sm text-enervia-600 hover:underline"
        >
          E-mailaccount koppelen
        </Link>
      </div>

      {(!accountsRes.data || accountsRes.data.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <div className="font-semibold text-amber-800">
            Geen e-mailaccount gekoppeld
          </div>
          <div className="text-amber-700 mt-1">
            Koppel Gmail, Outlook of een IMAP-account via{" "}
            <Link href="/app/instellingen/integraties" className="underline">
              Instellingen → Integraties
            </Link>{" "}
            om mails automatisch te synchroniseren en te koppelen aan contacten.
          </div>
        </div>
      )}

      {!threadsRes.data || threadsRes.data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Inbox size={32} className="mx-auto text-muted-foreground mb-2" />
          <div className="text-muted-foreground">Inbox is leeg.</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {threadsRes.data.map((t: any) => (
            <Link
              key={t.id}
              href={`/app/inbox/${t.id}`}
              className={`p-3 flex items-center gap-4 hover:bg-muted/20 ${
                t.ongelezen ? "font-semibold" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="truncate">{t.onderwerp ?? "(geen onderwerp)"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {(t.deelnemers ?? []).join(", ")}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {t.aantal_berichten} berichten
              </div>
              {t.laatst_bericht_op && (
                <div className="text-xs text-muted-foreground">
                  {new Date(t.laatst_bericht_op).toLocaleDateString("nl-BE")}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
