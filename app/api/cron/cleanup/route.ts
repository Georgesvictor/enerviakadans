import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * GDPR auto-verwijder cronjob.
 * Configuratie in `vercel.json`: dagelijks 03u00.
 *
 * Veiligheid: vereist CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data: expired, error: selErr } = await supabase
    .from("dossiers")
    .select("id")
    .lt("auto_verwijder_op", now);
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const ids = expired?.map((d) => d.id) ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  // cascade delete via FK ON DELETE CASCADE
  const { error: delErr } = await supabase.from("dossiers").delete().in("id", ids);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actie: "gdpr_auto_cleanup",
    metadata: { deleted: ids.length, ids } as any,
  });

  return NextResponse.json({ ok: true, deleted: ids.length });
}
