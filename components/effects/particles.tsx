"use client";

import * as React from "react";

type Particle = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

export function Particles({ count = 24 }: { count?: number }) {
  const [particles, setParticles] = React.useState<Particle[]>([]);

  React.useEffect(() => {
    const coarse = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (coarse) return;

    const next: Particle[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 4 + Math.random() * 10,
      duration: 8 + Math.random() * 14,
      delay: Math.random() * 6,
      opacity: 0.25 + Math.random() * 0.35
    }));
    setParticles(next);
  }, [count]);

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
            background: "rgba(212,175,55,1)",
            opacity: p.opacity,
            animation: `floatUp ${p.duration}s linear ${p.delay}s infinite`
          }}
        />
      ))}

      <style jsx>{`
        @keyframes floatUp {
          0% { transform: translateY(110vh) scale(0.5); opacity: 0; }
          15% { opacity: 1; }
          80% { opacity: 0.5; }
          100% { transform: translateY(-10vh) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
