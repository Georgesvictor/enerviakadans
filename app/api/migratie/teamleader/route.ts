import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { migreerContactenEnBedrijven } from "@/lib/migratie/teamleader/contacten";
import { migreerDeals } from "@/lib/migratie/teamleader/deals";
import {
  migreerQuotations,
  migreerInvoices,
} from "@/lib/migratie/teamleader/invoices";

export const maxDuration = 300; // Vercel: tot 5 minuten voor migratie

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "admin");
    const body = await req.json().catch(() => ({}));
    const modules: string[] = body.modules ?? ["contacten_bedrijven"];
    const dryRun = Boolean(body.dry_run);
    const pageSize = Number(body.page_size ?? 100);

    const resultaat: Record<string, unknown> = {};

    if (modules.includes("contacten_bedrijven")) {
      resultaat.contacten_bedrijven = await migreerContactenEnBedrijven(
        ctx.tenantId,
        ctx.userId,
        { dryRun, pageSize },
      );
    }
    if (modules.includes("deals")) {
      resultaat.deals = await migreerDeals(ctx.tenantId, ctx.userId, {
        dryRun,
        pageSize,
      });
    }
    if (modules.includes("quotations")) {
      resultaat.quotations = await migreerQuotations(
        ctx.tenantId,
        ctx.userId,
        { dryRun, pageSize },
      );
    }
    if (modules.includes("invoices")) {
      resultaat.invoices = await migreerInvoices(ctx.tenantId, ctx.userId, {
        dryRun,
        pageSize,
      });
    }

    return NextResponse.json(resultaat);
  } catch (err) {
    if (err instanceof TenancyError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof PermissionError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
