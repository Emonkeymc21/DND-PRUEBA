"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-wide text-primary hover:text-white">
          Grimorio D&D
        </Link>

        <nav className="hidden gap-5 text-sm text-text/90 md:flex">
          <Link className="hover:text-primary" href="/videos">Videos</Link>
          <Link className="hover:text-primary" href="/simulador">Simulador</Link>
          <Link className="hover:text-primary" href="/creador">Creador</Link>
          <Link className="hover:text-primary" href="/campanias">Campañas</Link>
          <Link className="hover:text-primary" href="/admin">Admin</Link>
        </nav>

        <button
          className={cn("rounded-md border border-border/60 px-3 py-1 text-sm hover:border-primary/70 hover:text-primary")}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
