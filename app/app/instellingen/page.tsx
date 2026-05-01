/**
 * Instellingen overview — gestructureerd in 3 categorieën zoals Teamleader Focus:
 *  - ACCOUNT (gebruikers, teams, beveiliging, integraties)
 *  - PERSONALISEREN (bedrijfsentiteiten, document layout, e-mail, custom fields)
 *  - VOORKEUREN (CRM, deals & offertes, agenda, tijdregistratie)
 */

import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { getTenant, listMembers } from "@/lib/tenancy/tenants";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  Users,
  Briefcase,
  Shield,
  Plug,
  Building2,
  CircleDollarSign,
  FileText,
  Mail,
  Palette,
  Cloud,
  Activity,
  Contact2,
  TrendingUp,
  Calendar,
  Clock,
  Receipt,
  PackageSearch,
  Sparkles,
  Database,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstellingenHome() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const [tenant, members, entitiesRes] = await Promise.all([
    getTenant(ctx.tenantId),
    listMembers(ctx.tenantId),
    supabase
      .from("business_entities")
      .select("id, naam, is_default")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_actief", true),
  ]);
  const entities = entitiesRes.data ?? [];
  const isAdmin = ctx.rolCode === "owner" || ctx.rolCode === "admin";

  const groepen: {
    titel: string;
    items: {
      href: string;
      icon: React.ReactNode;
      titel: string;
      sub?: string;
      adminOnly?: boolean;
      badge?: string;
    }[];
  }[] = [
    {
      titel: "Account",
      items: [
        {
          href: "/app/instellingen/gebruikers",
          icon: <Users size={18} />,
          titel: "Gebruikers",
          sub: `${members.length} ${members.length === 1 ? "lid" : "leden"}`,
          adminOnly: true,
        },
        {
          href: "/app/instellingen/teams",
          icon: <Briefcase size={18} />,
          titel: "Teams",
          sub: "Team-indeling",
          adminOnly: true,
        },
        {
          href: "/app/instellingen/beveiliging",
          icon: <Shield size={18} />,
          titel: "Beveiliging",
          sub: "MFA, sessies, audit",
          adminOnly: true,
        },
        {
          href: "/app/instellingen/integraties",
          icon: <Plug size={18} />,
          titel: "Integraties",
          sub: "Gmail · M365 · Ponto · Billit",
          adminOnly: true,
        },
      ],
    },
    {
      titel: "Personaliseren",
      items: [
        {
          href: "/app/instellingen/bedrijfsentiteiten",
          icon: <Building2 size={18} />,
          titel: "Bedrijfsentiteiten",
          sub: `${entities.length} ${entities.length === 1 ? "entiteit" : "entiteiten"}`,
          adminOnly: true,
          badge: entities.find((e: any) => e.is_default)?.naam,
        },
        {
          href: "/app/instellingen/munteenheid",
          icon: <CircleDollarSign size={18} />,
          titel: "Munteenheid",
          sub: "EUR · USD · GBP",
        },
        {
          href: "/app/instellingen/document-layout",
          icon: <FileText size={18} />,
          titel: "Document layout",
          sub: "PDF-templates",
          adminOnly: true,
        },
        {
          href: "/app/instellingen/email",
          icon: <Mail size={18} />,
          titel: "E-mail",
          sub: "Verzend-instellingen + handtekening",
        },
        {
          href: "/app/instellingen/custom-fields",
          icon: <Database size={18} />,
          titel: "Custom fields",
          sub: "Eigen velden per entiteit",
          adminOnly: true,
        },
        {
          href: "/app/instellingen/cloudplatformen",
          icon: <Cloud size={18} />,
          titel: "Cloudplatformen",
          sub: "Drive · Dropbox · OneDrive",
          adminOnly: true,
        },
        {
          href: "/app/instellingen/activiteitstracking",
          icon: <Activity size={18} />,
          titel: "Activiteitstracking",
          sub: "Wat wordt gelogd",
          adminOnly: true,
        },
      ],
    },
    {
      titel: "Voorkeuren",
      items: [
        {
          href: "/app/instellingen/crm",
          icon: <Contact2 size={18} />,
          titel: "CRM",
          sub: "Tags, contact-velden",
        },
        {
          href: "/app/instellingen/pipelines",
          icon: <TrendingUp size={18} />,
          titel: "Deals & Offertes",
          sub: "Pipelines, fases, slaagkans",
        },
        {
          href: "/app/instellingen/templates",
          icon: <Palette size={18} />,
          titel: "Templates",
          sub: "Begeleidende teksten + layouts",
        },
        {
          href: "/app/instellingen/workflows",
          icon: <Sparkles size={18} />,
          titel: "Workflow-automatisering",
          sub: "Auto-taken, projecten, statuswijzigingen",
          adminOnly: true,
        },
        {
          href: "/app/instellingen/producten",
          icon: <PackageSearch size={18} />,
          titel: "Producten & diensten",
          sub: "Catalogus",
        },
        {
          href: "/app/instellingen/agenda",
          icon: <Calendar size={18} />,
          titel: "Agenda",
          sub: "Werktijden, automatisering",
        },
        {
          href: "/app/instellingen/tijdregistratie",
          icon: <Clock size={18} />,
          titel: "Tijdregistratie",
          sub: "Tarieven, regels",
        },
        {
          href: "/app/instellingen/gdpr",
          icon: <Shield size={18} />,
          titel: "GDPR & privacy",
          sub: "DSR, retentie",
          adminOnly: true,
        },
      ],
    },
  ];

  // Renovatie-module enkel als simulator-feature aan
  if (tenant?.features?.simulator) {
    groepen[2].items.push({
      href: "/app/instellingen/renovatie",
      icon: <Sparkles size={18} />,
      titel: "Renovatie-simulator",
      sub: "Energieprijzen, premies",
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="bg-white rounded-lg border p-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
        <h1 className="text-lg font-bold text-enervia-700 px-3 py-3">
          Instellingen
        </h1>
        <Link
          href="/app/instellingen"
          className="block px-3 py-2 text-sm bg-enervia-50 text-enervia-700 rounded font-medium border-l-2 border-enervia-600 -ml-px"
        >
          Overzicht
        </Link>
        {groepen.map((g) => (
          <div key={g.titel} className="mt-4">
            <div className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
              {g.titel}
            </div>
            {g.items
              .filter((i) => !i.adminOnly || isAdmin)
              .map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted/40 rounded"
                >
                  <span className="text-muted-foreground">{i.icon}</span>
                  <span className="flex-1">{i.titel}</span>
                </Link>
              ))}
          </div>
        ))}
      </aside>

      {/* Hoofdcontent — overview met cards */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Instellingen</h1>
          <p className="text-muted-foreground text-sm">
            Werkruimte: <strong>{tenant?.naam}</strong>
          </p>
        </div>

        {groepen.map((g) => {
          const items = g.items.filter((i) => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <section key={g.titel}>
              <h2 className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-3">
                {g.titel}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className="bg-white rounded-lg border p-4 hover:border-enervia-600 hover:shadow-sm transition flex items-start gap-3 group"
                  >
                    <div className="text-enervia-600 mt-0.5">{i.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-enervia-700 flex items-center justify-between">
                        {i.titel}
                        <ChevronRight
                          size={14}
                          className="text-muted-foreground group-hover:text-enervia-700"
                        />
                      </div>
                      {i.sub && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {i.sub}
                        </div>
                      )}
                      {i.badge && (
                        <div className="text-xs text-enervia-600 mt-1">
                          → {i.badge}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
