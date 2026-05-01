"use client";

import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  FileText,
  Receipt,
  Package,
  CheckSquare,
  Paperclip,
  Mail,
  Cog,
} from "lucide-react";
import type {
  ActivityEvent,
  ActivityKind,
} from "@/lib/deals/activity-feed";

const ICONS: Record<ActivityKind, any> = {
  stage: ArrowRight,
  note: MessageSquare,
  system: Cog,
  quotation: FileText,
  invoice: Receipt,
  purchase_order: Package,
  task: CheckSquare,
  file: Paperclip,
  email: Mail,
};

const COLORS: Record<ActivityKind, string> = {
  stage: "bg-enervia-100 text-enervia-700",
  note: "bg-blue-100 text-blue-700",
  system: "bg-slate-100 text-slate-600",
  quotation: "bg-amber-100 text-amber-700",
  invoice: "bg-emerald-100 text-emerald-700",
  purchase_order: "bg-orange-100 text-orange-700",
  task: "bg-violet-100 text-violet-700",
  file: "bg-slate-100 text-slate-700",
  email: "bg-sky-100 text-sky-700",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const u = Math.floor(min / 60);
  if (u < 24) return `${u} uur geleden`;
  const dgn = Math.floor(u / 24);
  if (dgn < 7) return `${dgn} dag${dgn === 1 ? "" : "en"} geleden`;
  return d.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "short",
    year:
      d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function DealActivity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Nog geen activiteit op deze deal.
      </div>
    );
  }
  return (
    <ol className="relative space-y-0">
      <span className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
      {events.map((e, idx) => {
        const Icon = ICONS[e.kind];
        return (
          <li key={idx} className="relative pl-10 pb-4">
            <span
              className={`absolute left-0 top-0 w-8 h-8 rounded-full grid place-items-center ${COLORS[e.kind]}`}
            >
              <Icon size={14} />
            </span>
            <div className="text-sm">
              {e.href ? (
                <Link
                  href={e.href}
                  className="font-medium text-enervia-700 hover:underline"
                >
                  {e.titel}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{e.titel}</span>
              )}
              {e.detail && (
                <p className="text-muted-foreground mt-0.5 whitespace-pre-line">
                  {e.detail}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatTime(e.at)}
                {e.user_email && ` · ${e.user_email}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
