/**
 * Confetti en canvas, implementado acá mismo.
 *
 * `canvas-confetti` es una gran librería, pero son ~7 kb + una dependencia más
 * que auditar y versionar para un efecto de 60 líneas. Esto hace lo mismo con
 * la paleta del sitio y sin sumar nada al package.json.
 *
 * Detalles que importan:
 * - Un solo canvas reutilizado, con pointer-events: none.
 * - Se destruye solo cuando no quedan partículas: cero coste en reposo.
 * - Respeta prefers-reduced-motion.
 * - En móvil dispara menos partículas.
 */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  life: number;
};

const COLORS = [
  "#C9A227", // dorado
  "#F0DDA4", // dorado claro
  "#8B6AD1", // púrpura místico
  "#EDE4D3", // pergamino
  "#A63E28", // rojo óxido
];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let raf = 0;

function ensureCanvas(): boolean {
  if (typeof window === "undefined") return false;

  if (canvas && ctx) return true;

  canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  canvas.setAttribute("aria-hidden", "true");

  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  const c = canvas.getContext("2d");
  if (!c) {
    canvas = null;
    return false;
  }

  c.scale(dpr, dpr);
  ctx = c;
  document.body.appendChild(canvas);
  return true;
}

function teardown(): void {
  cancelAnimationFrame(raf);
  raf = 0;
  particles = [];

  if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
  canvas = null;
  ctx = null;
}

function loop(): void {
  if (!ctx || !canvas) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  particles = particles.filter((p) => {
    p.life -= 0.008;
    if (p.life <= 0 || p.y > h + 40) return false;

    p.vy += 0.22; // gravedad
    p.vx *= 0.99; // rozamiento del aire
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vr;

    ctx!.save();
    ctx!.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx!.translate(p.x, p.y);
    ctx!.rotate(p.rotation);
    ctx!.fillStyle = p.color;
    // Rectángulo achatado: al girar parece un papelito dando vueltas.
    ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx!.restore();

    return true;
  });

  if (particles.length === 0) {
    teardown();
    return;
  }

  raf = requestAnimationFrame(loop);
}

export type ConfettiOptions = {
  intensity?: "low" | "high";
  /** Origen 0..1 relativo a la ventana. Por defecto, el centro-alto. */
  originX?: number;
  originY?: number;
};

export function fireConfetti(options: ConfettiOptions = {}): void {
  if (typeof window === "undefined") return;

  // Si pidieron menos movimiento, no disparamos nada.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

  if (!ensureCanvas()) return;

  const isMobile = window.innerWidth < 768;
  const base = options.intensity === "high" ? 90 : 40;
  const count = isMobile ? Math.round(base * 0.55) : base;

  const ox = (options.originX ?? 0.5) * window.innerWidth;
  const oy = (options.originY ?? 0.42) * window.innerHeight;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;

    particles.push({
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5, // sesgo hacia arriba
      size: 6 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      life: 1,
    });
  }

  if (raf === 0) raf = requestAnimationFrame(loop);
}
