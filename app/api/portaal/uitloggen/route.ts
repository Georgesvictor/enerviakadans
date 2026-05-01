import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PORTAAL_COOKIE } from "@/lib/klantportaal/auth";

export async function POST(req: NextRequest) {
  const c = await cookies();
  c.delete(PORTAAL_COOKIE);
  const origin = req.nextUrl.origin;
  return NextResponse.redirect(`${origin}/portaal`, { status: 303 });
}
