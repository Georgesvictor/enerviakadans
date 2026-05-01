/**
 * Bulk-acties op deals.
 *
 * Body: {
 *   ids: string[],
 *   actie: 'set_eigenaar' | 'set_stage' | 'set_status' | 'add_tag' | 'verwijder' | 'archiveer',
 *   waarde?: string  // user_id, stage_id, status, tag_id
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const ctx = await requireTenant();
  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "geen ids" }, { status: 400 });
  }
  if (ids.length > 500) {
    return NextResponse.json(
      { error: "max 500 deals per keer" },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const verwerkt = ids.length;

  switch (body.actie) {
    case "set_eigenaar": {
      await supabase
        .from("deals")
        .update({ eigenaar_id: body.waarde || null })
        .eq("tenant_id", ctx.tenantId)
        .in("id", ids);
      break;
    }
    case "set_stage": {
      // Met workflow-trigger (één per deal)
      const { data: stage } = await supabase
        .from("pipeline_stages")
        .select("is_won, is_lost")
        .eq("id", body.waarde)
        .maybeSingle();
      const patch: any = { stage_id: body.waarde };
      if (stage?.is_won) {
        patch.status = "won";
        patch.afgesloten_op = new Date().toISOString();
      } else if (stage?.is_lost) {
        patch.status = "lost";
        patch.afgesloten_op = new Date().toISOString();
      } else {
        patch.status = "open";
        patch.afgesloten_op = null;
      }
      await supabase
        .from("deals")
        .update(patch)
        .eq("tenant_id", ctx.tenantId)
        .in("id", ids);
      break;
    }
    case "set_status": {
      const update: any = { status: body.waarde };
      if (body.waarde === "won" || body.waarde === "lost") {
        update.afgesloten_op = new Date().toISOString();
      }
      await supabase
        .from("deals")
        .update(update)
        .eq("tenant_id", ctx.tenantId)
        .in("id", ids);
      break;
    }
    case "add_tag": {
      const rows = ids.map((deal_id) => ({
        deal_id,
        tag_id: body.waarde,
        tenant_id: ctx.tenantId,
      }));
      await supabase
        .from("deal_tags")
        .upsert(rows, { onConflict: "deal_id,tag_id" });
      break;
    }
    case "verwijder": {
      await supabase
        .from("deals")
        .delete()
        .eq("tenant_id", ctx.tenantId)
        .in("id", ids);
      break;
    }
    default:
      return NextResponse.json({ error: "onbekende actie" }, { status: 400 });
  }

  return NextResponse.json({ verwerkt });
}
