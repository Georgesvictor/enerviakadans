import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  exchangeGoogleCode,
  emailFromIdToken,
} from "@/lib/integrations/gmail/oauth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = cookies().get("kadans_google_state")?.value;
  if (!code || !state || !stateCookie) {
    return NextResponse.redirect(
      new URL("/app/instellingen/integraties?error=missing_params", req.url),
    );
  }
  const [cState, tenantId, userId] = stateCookie.split("|");
  if (cState !== state) {
    return NextResponse.redirect(
      new URL("/app/instellingen/integraties?error=state_mismatch", req.url),
    );
  }

  const redirectUri = `${req.nextUrl.origin}/api/integraties/gmail/callback`;
  try {
    const tok = await exchangeGoogleCode(code, redirectUri);
    const email = tok.id_token ? emailFromIdToken(tok.id_token) : null;
    const supabase = createAdminSupabaseClient();

    const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();

    // Sla op als email_account (Gmail voor inbox)
    if (tok.scope?.includes("gmail")) {
      await supabase.from("email_accounts").upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          provider: "gmail",
          email: email ?? "unknown@gmail.com",
          access_token: tok.access_token,
          refresh_token: tok.refresh_token ?? null,
          token_expires_at: expiresAt,
          is_actief: true,
        },
        { onConflict: "tenant_id,email" } as any,
      );
    }

    // Sla ook op als calendar_account indien calendar-scope aanwezig
    if (tok.scope?.includes("calendar")) {
      await supabase.from("calendar_accounts").upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          provider: "google",
          email: email ?? null,
          access_token: tok.access_token,
          refresh_token: tok.refresh_token ?? null,
          token_expires_at: expiresAt,
          is_primair: true,
        },
        { onConflict: "tenant_id,email,user_id" } as any,
      );
    }

    cookies().delete("kadans_google_state");
    return NextResponse.redirect(
      new URL("/app/instellingen/integraties?success=gmail", req.url),
    );
  } catch (err) {
    console.error("Gmail callback error:", err);
    return NextResponse.redirect(
      new URL(
        `/app/instellingen/integraties?error=${encodeURIComponent(
          err instanceof Error ? err.message : String(err),
        )}`,
        req.url,
      ),
    );
  }
}
