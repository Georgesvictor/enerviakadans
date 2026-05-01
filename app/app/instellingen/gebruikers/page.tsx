import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { listMembers, getTenant } from "@/lib/tenancy/tenants";
import { GebruikersLijst } from "@/components/crm/gebruikers-lijst";

export const dynamic = "force-dynamic";

export default async function GebruikersPage() {
  const ctx = await requireTenant();
  const [tenant, members] = await Promise.all([
    getTenant(ctx.tenantId),
    listMembers(ctx.tenantId),
  ]);

  const isAdmin = ctx.rolCode === "owner" || ctx.rolCode === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/app/instellingen"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Instellingen
          </Link>
          <h1 className="text-2xl font-bold text-enervia-700 mt-1">
            Gebruikers
          </h1>
          <p className="text-muted-foreground text-sm">
            Beheer teamleden en rollen voor <strong>{tenant?.naam}</strong>.
          </p>
        </div>
        {isAdmin && (
          <a
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
          >
            Nieuwe gebruiker uitnodigen →
          </a>
        )}
      </div>

      <GebruikersLijst
        members={members}
        canEdit={isAdmin}
        currentUserId={ctx.userId}
      />

      <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-enervia-700 mb-1">Over rollen</p>
        <ul className="space-y-1">
          <li>
            <strong>Owner</strong> — volledige rechten, kan workspace verwijderen
          </li>
          <li>
            <strong>Admin</strong> — volledige rechten binnen workspace
          </li>
          <li>
            <strong>Manager</strong> — kan teams en pipelines beheren, niet
            workspace-instellingen
          </li>
          <li>
            <strong>Gebruiker</strong> — standaardmedewerker, ziet eigen +
            teamrecords
          </li>
          <li>
            <strong>Gast</strong> — alleen-lezen, beperkte toegang
          </li>
        </ul>
      </div>
    </div>
  );
}
