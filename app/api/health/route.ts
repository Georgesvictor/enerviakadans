import { NextResponse } from "next/server";

/**
 * Publieke health-check + env-presence (geen waarden gelekt).
 * GET /api/health → toont welke kritieke env vars wel/niet gezet zijn.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean> = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS === "1",
    VERCEL_ENV: !!process.env.VERCEL_ENV,
  };

  const missing = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return NextResponse.json({
    ok: missing.length === 0,
    timestamp: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? "unknown",
    region: process.env.VERCEL_REGION ?? null,
    checks,
    missing,
    url: process.env.VERCEL_URL ?? null,
  });
}
