"use client";

import * as React from "react";

/**
 * Brasas flotando de fondo. Puramente decorativo, así que:
 * - No se dibuja nada en móvil (donde cuesta caro y casi no se ve).
 * - Respeta prefers-reduced-motion.
 * - La animación vive en globals.css (@keyframes floatUp), no en styled-jsx,
 *   para no inyectar un <style> por cada render.
 */

type Particle = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

export function Particles({ count = 18 }: { count?: number }) {
  const [particles, setParticles] = React.useState<Particle[]>([]);

  React.useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const isSmall = window.matchMedia?.("(max-width: 768px)")?.matches;
    if (reduced || isSmall) return;

    setParticles(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 9,
        duration: 10 + Math.random() * 14,
        delay: Math.random() * 8,
        opacity: 0.2 + Math.random() * 0.3,
      })),
    );
  }, [count]);

  if (particles.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full blur-[2px] mix-blend-screen"
          style={{
            left: `${p.left}vw`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            bottom: "-10vh",
            background: "rgb(var(--primary))",
            opacity: p.opacity,
            animation: `floatUp ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
