"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toaster";

type Stage = {
  id: string;
  naam: string;
  volgorde: number;
  kleur: string;
  categorie: string;
  is_lost: boolean;
};

export function DealTimeline({
  stages,
  huidigeStageVolgorde,
  huidigeStageId,
  stageDates,
  dealId,
}: {
  stages: Stage[];
  huidigeStageVolgorde: number;
  huidigeStageId: string;
  stageDates: Record<string, string>;
  dealId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Verloren-stage apart, niet in horizontale flow
  const flowStages = stages.filter((s) => !s.is_lost);

  async function naarStage(stageId: string) {
    if (stageId === huidigeStageId || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage_id: stageId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      router.refresh();
      toast({ title: "Fase aangepast", variant: "success" });
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border p-5 overflow-x-auto">
      <div
        className="relative flex items-start"
        style={{ minWidth: `${flowStages.length * 130}px` }}
      >
        {flowStages.map((s, i) => {
          const isHuidig = s.id === huidigeStageId;
          const isPassed = s.volgorde < huidigeStageVolgorde;
          const isFuture = s.volgorde > huidigeStageVolgorde;
          const datum = stageDates[s.id];

          // Zet naam boven of onder afwisselend (zigzag) zoals TL
          const isBoven = i % 2 === 0;

          return (
            <div
              key={s.id}
              className="flex-1 flex flex-col items-center relative"
            >
              {/* Verbindingslijn naar volgende stage */}
              {i < flowStages.length - 1 && (
                <div
                  className="absolute top-7 left-1/2 right-0 h-0.5 -z-0"
                  style={{
                    width: "100%",
                    backgroundColor: isPassed || isHuidig ? s.kleur : "#E5E7EB",
                  }}
                />
              )}

              {/* Naam + datum boven de bol */}
              {isBoven && (
                <div className="text-center mb-1 min-h-[40px]">
                  <div
                    className={`text-xs font-medium ${
                      isHuidig
                        ? "text-enervia-700 font-bold"
                        : isPassed
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {s.naam}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {datum
                      ? new Date(datum).toLocaleDateString("nl-BE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })
                      : "—"}
                  </div>
                  {isHuidig && (
                    <div
                      className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: s.kleur, color: "white" }}
                    >
                      {datum
                        ? new Date(datum).toLocaleDateString("nl-BE")
                        : "huidig"}
                    </div>
                  )}
                </div>
              )}

              {/* Bolletje */}
              <button
                onClick={() => naarStage(s.id)}
                disabled={busy}
                className="relative z-10 transition transform hover:scale-110"
                title={`Klik om naar "${s.naam}" te gaan`}
              >
                <div
                  className={`w-7 h-7 rounded-full border-2 ${
                    isHuidig
                      ? "ring-2 ring-offset-2"
                      : ""
                  }`}
                  style={{
                    backgroundColor: isPassed || isHuidig ? s.kleur : "white",
                    borderColor: isPassed || isHuidig ? s.kleur : "#D1D5DB",
                    boxShadow: isHuidig
                      ? `0 0 0 3px ${s.kleur}33`
                      : undefined,
                  }}
                />
              </button>

              {/* Naam + datum onder de bol */}
              {!isBoven && (
                <div className="text-center mt-1 min-h-[40px]">
                  <div
                    className={`text-xs font-medium ${
                      isHuidig
                        ? "text-enervia-700 font-bold"
                        : isPassed
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {s.naam}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {datum
                      ? new Date(datum).toLocaleDateString("nl-BE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })
                      : "—"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
