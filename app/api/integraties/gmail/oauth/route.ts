import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireTenant } from "@/lib/tenancy/context";
import { googleAuthUrl } from "@/lib/integrations/gmail/oauth";

export async function GET(req: NextRequest) {
  const ctx = await requireTenant();
  const state = crypto.randomUUID();
  cookies().set("kadans_google_state", `${state}|${ctx.tenantId}|${ctx.userId}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  const redirectUri = `${req.nextUrl.origin}/api/integraties/gmail/callback`;
  return NextResponse.redirect(googleAuthUrl({ state, redirectUri }));
}
