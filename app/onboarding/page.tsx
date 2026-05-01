/**
 * Onboarding — de user is ingelogd maar heeft nog geen actieve tenant.
 *
 * Twee flows:
 *  1. Clerk Organizations AAN (aanbevolen) → OrganizationList toont
 *  2. Clerk Organizations UIT → handmatige workspace-aanmaakknop
 *
 * @enervia.be users worden meteen auto-gekoppeld door lib/tenancy/context.ts.
 */

import { auth } from "@clerk/nextjs/server";
import { OrganizationList } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenancy/context";
import { WorkspaceAanmaken } from "@/components/crm/workspace-aanmaken";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Als user al tenant-toegang heeft, redirect meteen naar app
  const ctx = await getTenantContext();
  if (ctx) redirect("/app");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-enervia-50 to-white p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="inline-block text-2xl font-bold text-enervia-600 tracking-wider mb-2">
            KADANS
          </div>
          <h1 className="text-3xl font-bold text-enervia-700 mb-2">
            Welkom
          </h1>
          <p className="text-muted-foreground">
            Maak een workspace aan om te starten.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border space-y-4">
          {/* Clerk Organizations flow (toont niks als feature disabled is) */}
          <OrganizationList
            hidePersonal
            afterCreateOrganizationUrl="/app"
            afterSelectOrganizationUrl="/app"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationListCreateOrganizationActionButton:
                  "bg-enervia-600 hover:bg-enervia-700",
              },
            }}
          />

          {/* Fallback: manueel workspace aanmaken (werkt ook zonder Clerk Orgs) */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Of maak zelf een workspace aan (zonder Clerk Organizations):
            </p>
            <WorkspaceAanmaken />
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          Een workspace is jouw bedrijfs-omgeving met eigen contacten, deals
          en facturen.
        </p>
      </div>
    </div>
  );
}
