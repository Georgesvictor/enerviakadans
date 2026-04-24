/**
 * BullMQ worker process.
 * Run: `tsx scripts/worker.ts`  (of via Vercel Background Function)
 *
 * Verwerkt VEKA-verificatie jobs asynchroon zodat de hoofdrequest
 * niet wacht op Playwright.
 */

import { Worker } from "bullmq";
import IORedis from "ioredis";
import { QUEUES } from "@/lib/queue/client";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { scrapeVEKAPremie } from "@/lib/veka/scrape";
import type { OfferteExtractie, KlantParameters } from "@/lib/berekeningen/types";

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

new Worker(
  QUEUES.veka,
  async (job) => {
    const { dossierId } = job.data as { dossierId: string };
    const supabase = createAdminSupabaseClient();

    await supabase
      .from("premie_simulaties")
      .update({ veka_verificatie_status: "in_uitvoering" })
      .eq("dossier_id", dossierId);

    const { data } = await supabase
      .from("dossiers")
      .select(
        `extractie:offerte_extracties(gestructureerde_data),
         parameters:klant_parameters(*),
         premie:premie_simulaties(totaal_premies)`,
      )
      .eq("id", dossierId)
      .single();

    if (!data) return;
    const extractie = (data.extractie as any)?.[0]?.gestructureerde_data as OfferteExtractie;
    const params = (data.parameters as any)?.[0] as KlantParameters;
    const eigenTotaal = (data.premie as any)?.[0]?.totaal_premies ?? 0;

    try {
      const result = await scrapeVEKAPremie(params, {
        dak: extractie?.categorieen.dak?.excl_btw,
        gevel: extractie?.categorieen.gevel?.excl_btw,
        ramen: extractie?.categorieen.ramen_deuren?.excl_btw,
        vloer: extractie?.categorieen.vloer?.excl_btw,
        warmtepomp: extractie?.categorieen.warmtepomp?.excl_btw,
      });

      if (!result) {
        await supabase
          .from("premie_simulaties")
          .update({ veka_verificatie_status: "fout" })
          .eq("dossier_id", dossierId);
        return;
      }

      const verschil = Math.abs(result.totaal - eigenTotaal);
      const status = verschil > 50 ? "verschil" : "match";

      await supabase
        .from("premie_simulaties")
        .update({
          veka_verificatie_status: status,
          veka_resultaat: result as any,
          veka_verschil_notitie:
            status === "verschil"
              ? `Verschil: € ${verschil.toFixed(2)} tussen VEKA (${result.totaal}) en eigen (${eigenTotaal})`
              : null,
        })
        .eq("dossier_id", dossierId);
    } catch (err) {
      await supabase
        .from("premie_simulaties")
        .update({
          veka_verificatie_status: "fout",
          veka_verschil_notitie: err instanceof Error ? err.message : String(err),
        })
        .eq("dossier_id", dossierId);
    }
  },
  { connection },
);

console.log("VEKA worker gestart");
