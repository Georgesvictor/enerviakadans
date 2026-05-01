import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

/**
 * Genereert of vernieuwt klant-token voor een dossier.
 * Geldig 30 dagen.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminSupabaseClient();

  const token = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("dossiers")
    .update({
      klant_token: token,
      klant_token_expires_at: expires,
      status: "gedeeld",
    })
    .eq("id", params.id)
    .eq("verkoper_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    dossier_id: params.id,
    user_id: userId,
    actie: "klantlink_generated",
    metadata: { expires },
  });

  // Bepaal base-URL automatisch:
  //  1. Request origin (werkt voor zowel preview als productie zonder env var)
  //  2. VERCEL_URL (auto-set door Vercel op deployment)
  //  3. Optionele override via NEXT_PUBLIC_APP_URL
  //  4. Fallback simulatie.enervia.be
  const reqOrigin =
    req.headers.get("origin") ??
    (req.headers.get("host")
      ? `https://${req.headers.get("host")}`
      : null);
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;
  const base =
    reqOrigin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    vercelUrl ??
    "https://simulatie.enervia.be";

  return NextResponse.json({
    url: `${base}/klant/${token}`,
    expires_at: expires,
  });
}
