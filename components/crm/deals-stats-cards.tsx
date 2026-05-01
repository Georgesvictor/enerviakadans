"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DealsStatsCards({
  zonderActiviteit,
  ouderDan3Maanden,
  zonderBeslissingsdatum,
}: {
  zonderActiviteit: number;
  ouderDan3Maanden: number;
  zonderBeslissingsdatum: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(key: string, val: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (p.get(key) === val) p.delete(key);
    else p.set(key, val);
    router.push(`?${p.toString()}`);
  }

  const cards = [
    {
      titel: "Zonder activiteit",
      waarde: zonderActiviteit,
      sub: "geen contact 30+ dagen",
      filterKey: "zonder_activiteit",
      filterVal: "1",
    },
    {
      titel: "Ouder dan 3 maanden",
      waarde: ouderDan3Maanden,
      sub: "stale deals",
      filterKey: "ouder_3m",
      filterVal: "1",
    },
    {
      titel: "Zonder beslissingsdatum",
      waarde: zonderBeslissingsdatum,
      sub: "datum invullen",
      filterKey: "zonder_datum",
      filterVal: "1",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <button
          key={c.filterKey}
          onClick={() => setFilter(c.filterKey, c.filterVal)}
          className={`bg-white rounded-lg border p-4 text-left transition ${
            searchParams.get(c.filterKey) === c.filterVal
              ? "border-enervia-600 ring-2 ring-enervia-600/20"
              : "hover:border-enervia-300"
          }`}
        >
          <div className="text-2xl font-bold text-enervia-700">
            {c.waarde.toLocaleString("nl-BE")}
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
            {c.titel}
          </div>
          <div className="text-xs text-muted-foreground">{c.sub}</div>
        </button>
      ))}
    </div>
  );
}
