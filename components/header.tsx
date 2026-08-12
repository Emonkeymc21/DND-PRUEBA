"use client";

import Link from "next/link";
import * as React from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// /admin no va en el menú público: es un panel privado y aparecía linkeado
// para cualquiera que entrara al sitio. Se accede escribiendo la URL.
const links = [
  { href: "/campanias", label: "Campañas" },
  { href: "/simulador", label: "Simulador" },
  { href: "/videos", label: "Videos" },
  { href: "/bestiario", label: "Bestiario" },
];

export function Header() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="rounded-md border border-border/60 px-3 py-2 text-sm md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
            type="button"
          >
            ☰
          </button>

          <Link href="/" className="font-semibold tracking-wide text-primary hover:text-white">
            La Mesa Perdida
          </Link>
        </div>

        <nav className="hidden gap-5 text-sm text-text/90 md:flex">
          {links.map((l) => (
            <Link key={l.href} className="hover:text-primary" href={l.href as any}>
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          className={cn("rounded-md border border-border/60 px-3 py-2 text-sm hover:border-primary/70 hover:text-primary")}
          onClick={toggle}
          aria-label="Cambiar tema"
          type="button"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden">
          <div className="border-t border-border/60 bg-bg/95">
            <div className="mx-auto max-w-6xl px-4 py-3">
              <div className="grid gap-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href as any}
                    className="rounded-md border border-border/60 bg-card/40 px-4 py-3 text-sm font-semibold text-text/90 hover:border-primary/70 hover:text-primary"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
