/**
 * Recent items widget — server component, geschikt voor sidebar of dashboard.
 */

import Link from "next/link";
import { Clock, TrendingUp, Contact2, FileText, Receipt, Briefcase } from "lucide-react";
import { getRecentItems } from "@/lib/recent/tracker";

const ICONS = {
  deal: TrendingUp,
  contact: Contact2,
  company: Contact2,
  quotation: FileText,
  invoice: Receipt,
  project: Briefcase,
};

export async function RecentItems({
  tenantId,
  userId,
  limit = 6,
  variant = "sidebar",
}: {
  tenantId: string;
  userId: string;
  limit?: number;
  variant?: "sidebar" | "card";
}) {
  const items = await getRecentItems(tenantId, userId, limit);
  if (items.length === 0) return null;

  if (variant === "sidebar") {
    return (
      <div>
        <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
          <Clock size={10} /> Recent
        </div>
        {items.map((it) => {
          const Icon = ICONS[it.type] ?? FileText;
          return (
            <Link
              key={`${it.type}-${it.id}`}
              href={it.href}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 rounded mx-1"
            >
              <Icon size={12} className="shrink-0 text-white/50" />
              <span className="line-clamp-1">{it.label}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-enervia-700">
        <Clock size={14} /> Recent bewerkt
      </div>
      <div className="space-y-1">
        {items.map((it) => {
          const Icon = ICONS[it.type] ?? FileText;
          return (
            <Link
              key={`${it.type}-${it.id}`}
              href={it.href}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-sm"
            >
              <Icon size={14} className="text-muted-foreground" />
              <span className="line-clamp-1 flex-1">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
