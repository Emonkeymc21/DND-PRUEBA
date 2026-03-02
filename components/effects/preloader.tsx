"use client";

import * as React from "react";

export function Preloader() {
  const [hide, setHide] = React.useState(false);

  React.useEffect(() => {
    const t = window.setTimeout(() => setHide(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  if (hide) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black transition-opacity duration-700"
    >
      <img
        src="https://i.postimg.cc/6qst46cW/d20-2699387-1280-removebg-preview.png"
        alt=""
        className="h-[110px] w-auto animate-[spinDie_2s_linear_infinite] drop-shadow-[0_0_20px_rgba(255,106,0,0.85)]"
      />
      <style jsx>{`
        @keyframes spinDie {
          0% { transform: rotate(0) scale(0.9); }
          50% { transform: rotate(180deg) scale(1.1); filter: drop-shadow(0 0 40px rgba(255,247,0,0.95)); }
          100% { transform: rotate(360deg) scale(0.9); }
        }
      `}</style>
    </div>
  );
}
