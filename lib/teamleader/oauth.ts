/**
 * Teamleader Focus OAuth 2 helpers.
 * https://developer.teamleader.eu/#/authentication/oauth-2
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

const TL_AUTH_URL = "https://focus.teamleader.eu/oauth2/authorize";
const TL_TOKEN_URL = "https://focus.teamleader.eu/oauth2/access_token";

export interface TLTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
}

export function buildAuthorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.TEAMLEADER_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.TEAMLEADER_REDIRECT_URI!,
    state,
  });
  return `${TL_AUTH_URL}?${p.toString()}`;
}

export async function exchangeCode(code: string): Promise<TLTokens> {
  const res = await fetch(TL_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TEAMLEADER_CLIENT_ID!,
      client_secret: process.env.TEAMLEADER_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TEAMLEADER_REDIRECT_URI!,
    }),
  });
  if (!res.ok) {
    throw new Error(`Teamleader OAuth exchange faalde: ${res.status}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export async function refreshTokens(refreshToken: string): Promise<TLTokens> {
  const res = await fetch(TL_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TEAMLEADER_CLIENT_ID!,
      client_secret: process.env.TEAMLEADER_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Teamleader refresh faalde: ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("teamleader_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  const expiresAt = new Date(data.expires_at!).getTime();
  if (expiresAt - Date.now() > 60_000) {
    return data.access_token!;
  }

  // refresh
  try {
    const fresh = await refreshTokens(data.refresh_token!);
    await supabase
      .from("teamleader_tokens")
      .update({
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        expires_at: fresh.expires_at,
      })
      .eq("user_id", userId);
    return fresh.access_token;
  } catch {
    return null;
  }
}

export async function saveTokens(
  userId: string,
  tokens: TLTokens,
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  await supabase.from("teamleader_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
  });
}
