"use client";

import Link from "next/link";
import {
  FileText,
  Receipt,
  Briefcase,
  Package,
  ClipboardCheck,
  Truck,
} from "lucide-react";

export function DealActies({ dealId }: { dealId: string }) {
  const acties = [
    {
      href: `/app/offertes/nieuw?deal_id=${dealId}`,
      titel: "Offerte",
      icon: FileText,
      kleur: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-600",
    },
    {
      href: `/app/facturen/nieuw?deal_id=${dealId}`,
      titel: "Factuur",
      icon: Receipt,
      kleur: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-600",
    },
    {
      href: `/app/projecten/nieuw?deal_id=${dealId}`,
      titel: "Project",
      icon: Briefcase,
      kleur: "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-600",
    },
    {
      href: `/app/bestelbonnen/nieuw?deal_id=${dealId}`,
      titel: "Bestelbon",
      icon: Package,
      kleur: "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-600",
    },
    {
      href: `/app/orderbevestigingen/nieuw?deal_id=${dealId}`,
      titel: "Orderbevestiging",
      icon: ClipboardCheck,
      kleur: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:border-cyan-600",
    },
    {
      href: `/app/leveringsbonnen/nieuw?deal_id=${dealId}`,
      titel: "Leveringsbon",
      icon: Truck,
      kleur: "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-600",
    },
  ];

  return (
    <div className="bg-white rounded-lg border p-5">
      <h2 className="font-semibold text-enervia-700 mb-3">
        Maak vanuit deze deal
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {acties.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.titel}
              href={a.href}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition ${a.kleur}`}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">+ {a.titel}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
