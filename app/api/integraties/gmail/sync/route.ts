import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { syncGmailAccount } from "@/lib/integrations/gmail/sync";

export const maxDuration = 120;

export async function POST(_req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const supabase = createAdminSupabaseClient();
    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("user_id", ctx.userId)
      .eq("provider", "gmail")
      .eq("is_actief", true);

    const resultaten = [];
    for (const a of (accounts ?? []) as any[]) {
      resultaten.push({
        account_id: a.id,
        ...(await syncGmailAccount(a.id, 30)),
      });
    }
    return NextResponse.json({ accounts: resultaten });
  } catch (err) {
    if (err instanceof TenancyError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
