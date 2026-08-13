import { getBus, isSfxMuted } from "@/lib/audio/engine";

/**
 * Efectos de sonido. Todos sintetizados, cero archivos.
 *
 * Regla que se rompía antes y ahora se respeta en todo el archivo: ninguna
 * ganancia arranca ni termina en un valor distinto de ~0. Toda nota tiene
 * ataque y caída. Sin eso, cada sonido viene con un clic de regalo.
 */

export { setSfxMuted, setSfxVolume, isSfxMuted } from "@/lib/audio/engine";

/** Nota con envolvente ADSR simplificada (ataque + caída). */
function note(
  freq: number,
  at: number,
  dur: number,
  peak: number,
  type: OscillatorType = "sine",
  glideTo?: number,
): void {
  const b = getBus();
  if (!b) return;

  const osc = b.ctx.createOscillator();
  const gain = b.ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), at + dur);
  }

  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.015); // ataque
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur); // caída

  osc.connect(gain);
  gain.connect(b.sfx);

  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/**
 * Golpe percusivo del dado.
 *
 * Ruido filtrado con pasabanda estrecho: suena a plástico duro contra madera,
 * no a siseo. La clave está en el decaimiento cúbico del buffer.
 */
function clack(at: number, peak: number, freq: number): void {
  const b = getBus();
  if (!b) return;

  const len = Math.floor(b.ctx.sampleRate * 0.045);
  const buf = b.ctx.createBuffer(1, len, b.ctx.sampleRate);
  const data = buf.getChannelData(0);

  for (let i = 0; i < len; i++) {
    const decay = Math.pow(1 - i / len, 3);
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  const src = b.ctx.createBufferSource();
  src.buffer = buf;

  const bp = b.ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 2.2; // estrecho: le saca el siseo de banda ancha

  const gain = b.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);

  src.connect(bp);
  bp.connect(gain);
  gain.connect(b.sfx);

  src.start(at);
  src.stop(at + 0.06);
}

/** Rodada: golpes que se espacian y se apagan, como un dado perdiendo energía. */
export function playDiceRoll(durationMs = 1600): void {
  if (isSfxMuted()) return;
  const b = getBus();
  if (!b) return;

  const t0 = b.ctx.currentTime;
  const total = durationMs / 1000;

  let t = 0;
  let gap = 0.04;

  while (t < total) {
    const progress = t / total;
    clack(t0 + t, 0.20 * (1 - progress * 0.8), 700 + Math.random() * 1800);
    gap *= 1.14;
    t += gap + Math.random() * 0.015;
  }
}

/** Golpe único: el dado tocando la mesa. */
export function playDiceImpact(): void {
  if (isSfxMuted()) return;
  const b = getBus();
  if (!b) return;
  clack(b.ctx.currentTime, 0.22, 900);
}

/** Tríada mayor ascendente. */
export function playSuccess(): void {
  if (isSfxMuted()) return;
  const b = getBus();
  if (!b) return;

  const t = b.ctx.currentTime;
  note(523.25, t, 0.3, 0.14, "triangle");
  note(659.25, t + 0.06, 0.32, 0.11, "triangle");
  note(783.99, t + 0.12, 0.42, 0.09, "sine");
}

/** Descenso menor. */
export function playFailure(): void {
  if (isSfxMuted()) return;
  const b = getBus();
  if (!b) return;

  const t = b.ctx.currentTime;
  note(220, t, 0.34, 0.12, "triangle", 174.61);
  note(146.83, t + 0.08, 0.44, 0.10, "sine");
}

/** Fanfarria del 20 natural. */
export function playCrit(): void {
  if (isSfxMuted()) return;
  const b = getBus();
  if (!b) return;

  const t = b.ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    note(f, t + i * 0.07, 0.45, 0.13, "triangle");
  });
  note(1318.51, t + 0.32, 0.7, 0.08, "sine");
  note(261.63, t + 0.32, 0.8, 0.09, "sine"); // fundamental que sostiene
}

/** Caída grave del 1 natural. */
export function playFumble(): void {
  if (isSfxMuted()) return;
  const b = getBus();
  if (!b) return;

  const t = b.ctx.currentTime;
  note(196, t, 0.55, 0.14, "triangle", 98);
  note(130.81, t + 0.05, 0.65, 0.11, "sine", 65.41);
}

/** Click de interfaz, bien corto. */
export function playClick(): void {
  if (isSfxMuted()) return;
  const b = getBus();
  if (!b) return;
  clack(b.ctx.currentTime, 0.07, 2200);
}

/** Campanita para cuando el modelo termina de inferir. */
export function playChime(): void {
  if (isSfxMuted()) return;
  const b = getBus();
  if (!b) return;

  const t = b.ctx.currentTime;
  note(880, t, 0.5, 0.07, "sine");
  note(1174.66, t + 0.08, 0.55, 0.05, "sine");
}
