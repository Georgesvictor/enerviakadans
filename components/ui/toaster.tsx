"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils/cn";

type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

type ToastCtx = {
  toasts: ToastItem[];
  show: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
};

const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast moet binnen <Toaster /> gebruikt worden");
  return ctx;
}

let listener: ((t: Omit<ToastItem, "id">) => void) | null = null;
export const toast = (t: Omit<ToastItem, "id">) => {
  listener?.(t);
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const show = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== id));
    }, 5000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((cur) => cur.filter((x) => x.id !== id));
  }, []);

  React.useEffect(() => {
    listener = show;
    return () => {
      listener = null;
    };
  }, [show]);

  return (
    <Ctx.Provider value={{ toasts, show, dismiss }}>
      <ToastPrimitive.Provider>
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              "pointer-events-auto fixed bottom-4 right-4 z-[100] flex w-96 items-start gap-3 rounded-md border p-4 shadow-lg",
              t.variant === "destructive" && "border-red-500 bg-red-50",
              t.variant === "success" && "border-enervia-500 bg-enervia-50",
              t.variant === "default" && "border-enervia-200 bg-white",
            )}
            onOpenChange={(open) => !open && dismiss(t.id)}
          >
            <div className="flex-1">
              {t.title && (
                <ToastPrimitive.Title className="font-semibold text-enervia-600">
                  {t.title}
                </ToastPrimitive.Title>
              )}
              {t.description && (
                <ToastPrimitive.Description className="text-sm text-muted-foreground mt-1">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] m-0 flex w-96 max-w-[100vw] list-none flex-col gap-2 p-6 outline-none" />
      </ToastPrimitive.Provider>
    </Ctx.Provider>
  );
}
