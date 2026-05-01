import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  PORTAAL_COOKIE,
  generateToken,
  SESSION_DAYS,
} from "@/lib/klantportaal/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const origin = req.nextUrl.origin;
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("klantportaal_sessions")
    .select(
      "id, magic_token, magic_expires_at, magic_used_at, email, contact_id, company_id, tenant_id",
    )
    .eq("magic_token", token)
    .maybeSingle();

  if (!data) {
    return NextResponse.redirect(
      `${origin}/portaal/login?fout=ongeldig`,
      303,
    );
  }
  if (data.magic_used_at) {
    return NextResponse.redirect(
      `${origin}/portaal/login?fout=al_gebruikt`,
      303,
    );
  }
  if (
    data.magic_expires_at &&
    new Date(data.magic_expires_at) < new Date()
  ) {
    return NextResponse.redirect(
      `${origin}/portaal/login?fout=verlopen`,
      303,
    );
  }

  // Sessie aanmaken
  const sessionToken = generateToken();
  const expires = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await supabase
    .from("klantportaal_sessions")
    .update({
      magic_used_at: new Date().toISOString(),
      session_token: sessionToken,
      session_expires_at: expires,
    })
    .eq("id", data.id);

  const res = NextResponse.redirect(`${origin}/portaal/dashboard`, 303);
  res.cookies.set(PORTAAL_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}
