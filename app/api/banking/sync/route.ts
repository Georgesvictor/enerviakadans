import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { pontoClientVoorTenant } from "@/lib/integrations/ponto/client";
import { matchTransactions } from "@/lib/integrations/ponto/matcher";

export const maxDuration = 120;

export async function POST(_req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "facturen", "update");
    const client = pontoClientVoorTenant(ctx.tenantId);
    if (!client) {
      return NextResponse.json(
        {
          error:
            "Ponto niet geconfigureerd. Stel PONTO_CLIENT_ID/SECRET/ORGANIZATION_ID in.",
        },
        { status: 400 },
      );
    }
    const supabase = createAdminSupabaseClient();

    // Haal huidige bank-accounts of list vanuit Ponto
    const pontoAccounts = await client.listAccounts();
    let nieuweAccounts = 0;
    for (const a of pontoAccounts) {
      const { error } = await supabase.from("banking_accounts").upsert(
        {
          tenant_id: ctx.tenantId,
          iban: a.iban,
          bank_naam: a.description,
          rekeninghouder: a.holderName,
          ponto_account_id: a.id,
          saldo: a.currentBalance,
          saldo_datum: new Date().toISOString(),
          laatst_gesynct: new Date().toISOString(),
        },
        { onConflict: "tenant_id,iban" } as any,
      );
      if (!error) nieuweAccounts++;
    }

    // Voor elke account: haal laatste transacties op
    const { data: accounts } = await supabase
      .from("banking_accounts")
      .select("id, ponto_account_id")
      .eq("tenant_id", ctx.tenantId);

    let nieuweTrans = 0;
    const nieuweIds: string[] = [];
    for (const acc of (accounts ?? []) as any[]) {
      if (!acc.ponto_account_id) continue;
      const trans = await client.listTransactions(acc.ponto_account_id, {
        limit: 50,
      });
      for (const t of trans) {
        const { data: ins, error } = await supabase
          .from("banking_transactions")
          .upsert(
            {
              tenant_id: ctx.tenantId,
              account_id: acc.id,
              externe_id: t.id,
              datum: t.executionDate ?? new Date().toISOString().slice(0, 10),
              waarde_datum: t.valueDate ?? null,
              bedrag: t.amount,
              munt: t.currency ?? "EUR",
              tegenpartij_naam: t.counterpartName ?? null,
              tegenpartij_iban: t.counterpartAccountReference ?? null,
              mededeling:
                t.remittanceInformationType !== "structured"
                  ? t.remittanceInformation ?? null
                  : null,
              gestructureerde_mededeling:
                t.remittanceInformationType === "structured"
                  ? t.remittanceInformation ?? null
                  : null,
            },
            { onConflict: "externe_id" } as any,
          )
          .select("id")
          .maybeSingle();
        if (!error && ins) {
          nieuweTrans++;
          nieuweIds.push(ins.id);
        }
      }
    }

    // Auto-match
    const matches = await matchTransactions(ctx.tenantId, nieuweIds);

    return NextResponse.json({
      accounts: nieuweAccounts,
      transacties_geimporteerd: nieuweTrans,
      matches_gemaakt: matches.filter((m) => m.invoice_id).length,
      ongematchte: matches.filter((m) => !m.invoice_id).length,
    });
  } catch (err) {
    if (err instanceof TenancyError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof PermissionError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
