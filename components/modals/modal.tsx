"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  className
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-stretch justify-center bg-black/90 backdrop-blur-sm md:items-center">
      <button
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-[3100] flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-black/40 text-2xl text-text hover:border-primary/70 hover:text-primary"
        onClick={onClose}
        type="button"
      >
        ×
      </button>

      <div className={cn(
        "w-full max-w-3xl overflow-y-auto border border-border/60 bg-card/95 p-5 shadow-[0_0_50px_rgba(0,0,0,0.85)] md:rounded-2xl md:p-8",
        "max-h-[100dvh] md:max-h-[90vh] safe-bottom",
        className
      )}>
        <h2 className="text-center text-2xl font-extrabold text-primary">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
