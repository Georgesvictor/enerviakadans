import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Mail, Calendar, CreditCard, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function IntegratiesPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [emailRes, calRes, bankRes] = await Promise.all([
    supabase
      .from("email_accounts")
      .select("id, provider, email, is_actief, laatst_gesynct")
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("calendar_accounts")
      .select("id, provider, email, is_primair, laatst_gesynct")
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("banking_accounts")
      .select("id, iban, bank_naam, sync_actief, laatst_gesynct")
      .eq("tenant_id", ctx.tenantId),
  ]);

  const integraties = [
    {
      titel: "Gmail / Google Workspace",
      beschrijving: "Sync e-mails en koppel ze automatisch aan contacten.",
      icon: <Mail size={20} />,
      connect: "/api/integraties/gmail/oauth",
      aktief: (emailRes.data ?? []).some((a: any) => a.provider === "gmail"),
      lijst: (emailRes.data ?? []).filter((a: any) => a.provider === "gmail"),
    },
    {
      titel: "Microsoft 365 (Outlook)",
      beschrijving: "Sync e-mails via Microsoft Graph API.",
      icon: <Mail size={20} />,
      connect: "/api/integraties/microsoft/oauth",
      aktief: (emailRes.data ?? []).some((a: any) => a.provider === "microsoft"),
      lijst: (emailRes.data ?? []).filter((a: any) => a.provider === "microsoft"),
    },
    {
      titel: "IMAP / SMTP",
      beschrijving: "Voor andere mailservers (eigen hosting, andere providers).",
      icon: <Mail size={20} />,
      connect: "/app/instellingen/integraties/imap",
      aktief: (emailRes.data ?? []).some((a: any) => a.provider === "imap"),
      lijst: (emailRes.data ?? []).filter((a: any) => a.provider === "imap"),
    },
    {
      titel: "Google Calendar",
      beschrijving: "2-way sync van afspraken met Google Calendar.",
      icon: <Calendar size={20} />,
      connect: "/api/integraties/google-calendar/oauth",
      aktief: (calRes.data ?? []).some((a: any) => a.provider === "google"),
      lijst: (calRes.data ?? []).filter((a: any) => a.provider === "google"),
    },
    {
      titel: "Outlook Calendar",
      beschrijving: "2-way sync met Microsoft 365 kalender.",
      icon: <Calendar size={20} />,
      connect: "/api/integraties/microsoft-calendar/oauth",
      aktief: (calRes.data ?? []).some(
        (a: any) => a.provider === "microsoft",
      ),
      lijst: (calRes.data ?? []).filter(
        (a: any) => a.provider === "microsoft",
      ),
    },
    {
      titel: "Ponto (bankrekening sync)",
      beschrijving:
        "PSD2 open banking. Bank-transacties automatisch importeren en matchen met facturen.",
      icon: <CreditCard size={20} />,
      connect: "/api/integraties/ponto/oauth",
      aktief: (bankRes.data ?? []).length > 0,
      lijst: bankRes.data ?? [],
    },
    {
      titel: "Billit (Peppol e-invoicing)",
      beschrijving:
        "Verstuur facturen via het Peppol-netwerk. Verplicht B2B vanaf 2026.",
      icon: <FileText size={20} />,
      connect: "/app/instellingen/integraties/billit",
      aktief: !!process.env.BILLIT_API_KEY,
      lijst: [],
    },
    {
      titel: "Teamleader Focus (migratie)",
      beschrijving:
        "Importeer eenmalig al je contacten, deals, offertes en facturen uit Teamleader.",
      icon: <Sparkles size={20} />,
      connect: "/api/teamleader/oauth",
      aktief: true,
      lijst: [],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app/instellingen"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Instellingen
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">
          Integraties
        </h1>
        <p className="text-muted-foreground text-sm">
          Koppel externe diensten om Kadans optimaal te laten werken.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integraties.map((i) => (
          <div key={i.titel} className="bg-white rounded-lg border p-5">
            <div className="flex items-start gap-3">
              <div className="text-enervia-600 mt-1">{i.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-enervia-700">{i.titel}</h2>
                  {i.aktief ? (
                    <Badge className="bg-green-100 text-green-700">
                      Aktief
                    </Badge>
                  ) : (
                    <Badge variant="outline">Niet gekoppeld</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {i.beschrijving}
                </p>
                {i.lijst.length > 0 && (
                  <ul className="mt-2 text-xs space-y-0.5 text-muted-foreground">
                    {i.lijst.map((a: any) => (
                      <li key={a.id}>• {a.email ?? a.iban ?? a.naam ?? ""}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <a
                    href={i.connect}
                    className="text-sm text-enervia-600 hover:underline"
                  >
                    {i.aktief ? "Beheren" : "Koppelen"} →
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
