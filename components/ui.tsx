import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4", className)}>{children}</div>;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs font-medium text-text/90 backdrop-blur">
      {children}
    </span>
  );
}

export function Button({
  as = "button",
  href,
  children,
  variant = "primary",
  className,
  ...rest
}: {
  as?: "button" | "link";
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "border-primary/70 bg-black/60 text-primary hover:bg-black/80 hover:text-white hover:border-primary"
      : "border-border/60 bg-transparent text-text hover:border-primary/70 hover:text-primary";
  const cls = cn(base, styles, className);

  if (as === "link" && href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

export function Card({
  children,
  className,
  ...props
}: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
