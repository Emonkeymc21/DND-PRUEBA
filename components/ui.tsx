import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Kit de UI del sitio. Todos los colores salen de los tokens de
 * tailwind.config.ts (que a su vez leen variables CSS), así que cambiar la
 * paleta entera es tocar globals.css y nada más.
 */

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4", className)}>{children}</div>;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium tracking-wide text-text/90 backdrop-blur">
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "ghost" | "mystic";

const VARIANTS: Record<ButtonVariant, string> = {
  // Dorado sólido: es el CTA real, tiene que ganar sobre todo lo demás.
  primary:
    "border-transparent bg-gradient-to-b from-primary to-primary-deep text-[rgb(12,10,16)] shadow-soft hover:brightness-110 active:brightness-95",
  // Secundario: contorno, sin peso visual.
  ghost:
    "border-border/70 bg-transparent text-text/85 hover:border-primary/70 hover:text-primary",
  // Terciario místico, para acciones alternativas (probar simulador, etc).
  mystic:
    "border-mystic/60 bg-mystic/10 text-mystic hover:bg-mystic/20 hover:text-text",
};

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
  variant?: ButtonVariant;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-all",
    // 44px de alto mínimo: es el target táctil recomendado y el sitio se usa
    // sobre todo desde el celular.
    "min-h-[44px] px-5 py-2.5 text-sm",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100",
  );

  const cls = cn(base, VARIANTS[variant], className);

  if (as === "link" && href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  ...props
}: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/70 p-5 shadow-soft backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const FIELD = cn(
  "w-full rounded-xl border border-border/70 bg-surface/80 px-4 py-3",
  // 16px de base evita que iOS haga zoom automático al enfocar el campo.
  "text-base text-text placeholder:text-muted/70",
  "outline-none transition focus:border-primary/70",
);

export function Input({
  label,
  hint,
  className,
  ...props
}: { label?: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
      ) : null}
      <input className={cn(FIELD, className)} {...props} />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Textarea({
  label,
  hint,
  className,
  ...props
}: { label?: string; hint?: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
      ) : null}
      <textarea className={cn(FIELD, "resize-y", className)} {...props} />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  options,
  className,
  ...props
}: {
  label?: string;
  options: { value: string; label: string }[];
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
      ) : null}
      <select className={cn(FIELD, "appearance-none", className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-text">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
