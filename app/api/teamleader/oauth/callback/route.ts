import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exchangeCode, saveTokens } from "@/lib/teamleader/oauth";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get("tl_oauth_state")?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/dashboard/teamleader?err=state_mismatch", req.url),
    );
  }

  try {
    const tokens = await exchangeCode(code);
    await saveTokens(userId, tokens);
  } catch (err) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/teamleader?err=${encodeURIComponent(String(err))}`,
        req.url,
      ),
    );
  }

  return NextResponse.redirect(new URL("/dashboard/teamleader?ok=1", req.url));
}
