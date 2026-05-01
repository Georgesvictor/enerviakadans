/**
 * Kadans app-shell — tenant-scoped layout.
 * Sidebar + topbar + content-area. Vereist actieve tenant (middleware redirect
 * naar /onboarding als geen orgId).
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { getTenant } from "@/lib/tenancy/tenants";
import { bulkCan } from "@/lib/rbac/policies";
import {
  Users,
  Building2,
  TrendingUp,
  FileText,
  Receipt,
  Package,
  Briefcase,
  Clock,
  Calendar,
  CheckSquare,
  FolderOpen,
  Inbox,
  BarChart3,
  Settings,
  Home,
  Sparkles,
} from "lucide-react";
import { CommandPalette } from "@/components/crm/command-palette";
import { NotificationBell } from "@/components/crm/notification-bell";
import { QuickAddFAB } from "@/components/crm/quick-add-fab";
import { KeyboardShortcuts } from "@/components/crm/keyboard-shortcuts";
import { RecentItems } from "@/components/crm/recent-items";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx;
  try {
    ctx = await requireTenant();
  } catch (err) {
    if (err instanceof TenancyError && err.code === "NO_ACTIVE_ORG") {
      redirect("/onboarding");
    }
    throw err;
  }

  const tenant = await getTenant(ctx.tenantId);
  const heeftSimulator = tenant?.features?.simulator === true;

  // Bulk-check welke modules deze user mag zien (voor sidebar-filtering)
  const perms = await bulkCan(ctx.tenantId, ctx.userId, [
    { module: "contacten", action: "view" },
    { module: "companies", action: "view" },
    { module: "deals", action: "view" },
    { module: "offertes", action: "view" },
    { module: "facturen", action: "view" },
    { module: "producten", action: "view" },
    { module: "projecten", action: "view" },
    { module: "uren", action: "view" },
    { module: "agenda", action: "view" },
    { module: "taken", action: "view" },
    { module: "bestanden", action: "view" },
    { module: "inbox", action: "view" },
    { module: "rapporten", action: "view" },
    { module: "renovatie", action: "view" },
    { module: "instellingen", action: "view" },
  ]);

  const mag = (m: string) => perms[m]?.view !== false;

  const navGroups: Array<{
    label: string;
    items: Array<{ href: string; label: string; icon: React.ReactNode; show: boolean }>;
  }> = [
    {
      label: "",
      items: [
        { href: "/app", label: "Dashboard", icon: <Home size={16} />, show: true },
      ],
    },
    {
      label: "CRM",
      items: [
        { href: "/app/contacten", label: "Contacten", icon: <Users size={16} />, show: mag("contacten") },
        { href: "/app/bedrijven", label: "Bedrijven", icon: <Building2 size={16} />, show: mag("companies") },
        { href: "/app/deals", label: "Deals", icon: <TrendingUp size={16} />, show: mag("deals") },
        { href: "/app/forecast", label: "Forecast", icon: <BarChart3 size={16} />, show: mag("deals") },
      ],
    },
    {
      label: "Sales",
      items: [
        { href: "/app/offertes", label: "Offertes", icon: <FileText size={16} />, show: mag("offertes") },
        { href: "/app/facturen", label: "Facturen", icon: <Receipt size={16} />, show: mag("facturen") },
        { href: "/app/producten", label: "Producten", icon: <Package size={16} />, show: mag("producten") },
      ],
    },
    {
      label: "Werk",
      items: [
        { href: "/app/projecten", label: "Projecten", icon: <Briefcase size={16} />, show: mag("projecten") },
        { href: "/app/uren", label: "Uren", icon: <Clock size={16} />, show: mag("uren") },
        { href: "/app/agenda", label: "Agenda", icon: <Calendar size={16} />, show: mag("agenda") },
        { href: "/app/taken", label: "Taken", icon: <CheckSquare size={16} />, show: mag("taken") },
        { href: "/app/bestanden", label: "Bestanden", icon: <FolderOpen size={16} />, show: mag("bestanden") },
      ],
    },
    {
      label: "Communicatie",
      items: [
        { href: "/app/inbox", label: "Inbox", icon: <Inbox size={16} />, show: mag("inbox") },
      ],
    },
    {
      label: "Analyse",
      items: [
        { href: "/app/rapporten", label: "Rapporten", icon: <BarChart3 size={16} />, show: mag("rapporten") },
      ],
    },
  ];

  if (heeftSimulator && mag("renovatie")) {
    navGroups.push({
      label: "Modules",
      items: [
        {
          href: "/app/renovatie",
          label: "Renovatie-simulator",
          icon: <Sparkles size={16} />,
          show: true,
        },
      ],
    });
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-enervia-700 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <Link href="/app" className="text-xl font-bold tracking-wider">
            KADANS
          </Link>
          <div className="text-xs text-white/70 mt-0.5 truncate">
            {tenant?.naam ?? "Workspace"}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {navGroups.map((g, gi) => {
            const visible = g.items.filter((i) => i.show);
            if (visible.length === 0) return null;
            return (
              <div key={gi} className="mb-4">
                {g.label && (
                  <div className="px-4 text-[10px] uppercase tracking-wider text-white/50 mb-1">
                    {g.label}
                  </div>
                )}
                {visible.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
                  >
                    <span className="text-white/70">{i.icon}</span>
                    {i.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <RecentItems tenantId={ctx.tenantId} userId={ctx.userId} limit={5} />

        <div className="p-3 border-t border-white/10">
          <Link
            href="/app/instellingen"
            className="flex items-center gap-2 px-2 py-2 text-sm text-white/90 hover:bg-white/10 rounded"
          >
            <Settings size={16} />
            Instellingen
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
          <div className="text-sm text-muted-foreground flex items-center gap-3">
            <span>Welkom, {ctx.rolCode === "owner" ? "eigenaar" : ctx.rolCode}</span>
            <span className="text-xs px-2 py-1 bg-muted rounded border flex items-center gap-1">
              <kbd className="font-mono">⌘K</kbd> snel zoeken
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/app"
              afterCreateOrganizationUrl="/app"
            />
            <UserButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <CommandPalette />
      <QuickAddFAB />
      <KeyboardShortcuts />
    </div>
  );
}
