"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Step {
  key: string;
  label: string;
}

export const WIZARD_STEPS: Step[] = [
  { key: "offerte", label: "Offerte" },
  { key: "extractie", label: "Extractie review" },
  { key: "klant", label: "Klantparameters" },
  { key: "premies", label: "Premies" },
  { key: "lening", label: "Lening" },
  { key: "besparing", label: "Besparing" },
];

export function WizardStepper({ current }: { current: number }) {
  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-2">
      {WIZARD_STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <div key={step.key} className="flex items-center gap-2 flex-shrink-0">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                state === "done" && "bg-enervia-500 text-white",
                state === "active" && "bg-accent-400 text-white",
                state === "todo" && "bg-enervia-50 text-enervia-400",
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-xs",
                  state === "done" && "bg-white/20",
                  state === "active" && "bg-white/30",
                  state === "todo" && "bg-enervia-100",
                )}
              >
                {state === "done" ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className="w-4 h-px bg-enervia-100" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
