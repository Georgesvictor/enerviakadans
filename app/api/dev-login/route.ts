/**
 * Dev-login: zet de kadans_dev_auth cookie en redirect naar /app.
 * Werkt alleen als DEV_AUTH_BYPASS=1 in env.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.DEV_AUTH_BYPASS !== "1") {
    return NextResponse.json(
      { error: "Dev-bypass niet geactiveerd" },
      { status: 403 },
    );
  }

  const url = new URL("/app", req.url);
  const res = NextResponse.redirect(url, 302);
  res.cookies.set("kadans_dev_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60, // 7 dagen
    path: "/",
  });
  return res;
}

// Logout = cookie wissen
export async function DELETE(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("kadans_dev_auth");
  return res;
}

export async function GET(req: NextRequest) {
  // Voor handige curl-test: GET = login (alleen dev)
  return POST(req);
}
