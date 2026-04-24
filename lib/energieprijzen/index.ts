/**
 * Energieprijzen: haalt de meest recente prijs per type op uit Supabase.
 * Wordt dagelijks ververst door `app/api/cron/energieprijzen/route.ts`.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_ENERGIEPRIJZEN, type EnergiePrijzenSnapshot } from "@/lib/berekeningen/besparing";

type PrijsType = "elektriciteit" | "gas" | "stookolie" | "teruglevering";

export async function getActueleEnergieprijzen(): Promise<EnergiePrijzenSnapshot> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("energieprijzen")
      .select("type, prijs_per_eenheid, geldig_vanaf")
      .order("geldig_vanaf", { ascending: false })
      .limit(100);

    if (error || !data) return DEFAULT_ENERGIEPRIJZEN;

    const perType = new Map<PrijsType, number>();
    for (const rij of data) {
      if (!perType.has(rij.type as PrijsType)) {
        perType.set(rij.type as PrijsType, Number(rij.prijs_per_eenheid));
      }
    }

    return {
      elektriciteit_per_kwh:
        perType.get("elektriciteit") ?? DEFAULT_ENERGIEPRIJZEN.elektriciteit_per_kwh,
      gas_per_kwh: perType.get("gas") ?? DEFAULT_ENERGIEPRIJZEN.gas_per_kwh,
      stookolie_per_liter:
        perType.get("stookolie") ?? DEFAULT_ENERGIEPRIJZEN.stookolie_per_liter,
      terugleververgoeding_per_kwh:
        perType.get("teruglevering") ?? DEFAULT_ENERGIEPRIJZEN.terugleververgoeding_per_kwh,
    };
  } catch {
    return DEFAULT_ENERGIEPRIJZEN;
  }
}

export async function setEnergieprijs(
  type: PrijsType,
  prijs: number,
  bron: "VREG" | "CREG" | "manueel" = "manueel",
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  await supabase.from("energieprijzen").insert({
    type,
    prijs_per_eenheid: prijs,
    eenheid: type === "stookolie" ? "liter" : "kwh",
    bron,
    geldig_vanaf: new Date().toISOString().slice(0, 10),
  });
}
