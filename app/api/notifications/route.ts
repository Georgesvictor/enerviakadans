import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { buildNotifications } from "@/lib/notifications/builder";

export async function GET() {
  const ctx = await requireTenant();
  const items = await buildNotifications(ctx.tenantId, ctx.userId);
  return NextResponse.json({ items, total: items.length });
}
