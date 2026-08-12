/**
 * Efectos de sonido sintetizados con Web Audio.
 *
 * Cero archivos: nada de mp3 ni wav que descargar. Todo se genera en el
 * momento con osciladores y ruido filtrado, así que suma 0 kb a la carga y
 * funciona offline.
 *
 * Detalle importante: los navegadores no dejan crear/reanudar un AudioContext
 * sin un gesto del usuario. Todas las funciones se llaman desde un click, y
 * si el contexto no está disponible fallan en silencio (nunca rompen la UI).
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(v: boolean): void {
  muted = v;
}

export function isMuted(): boolean {
  return muted;
}

/** Ráfaga de ruido filtrado: el "clac" de un dado contra la mesa. */
function clack(at: number, gain: number, lowpass: number): void {
  const c = getCtx();
  if (!c) return;

  const len = Math.floor(c.sampleRate * 0.05);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);

  for (let i = 0; i < len; i++) {
    // Decaimiento exponencial: ataque seco, cola corta.
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }

  const src = c.createBufferSource();
  src.buffer = buf;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = lowpass;
  filter.Q.value = 1.4;

  const g = c.createGain();
  g.gain.value = gain;

  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(at);
  src.stop(at + 0.06);
}

/** Tono simple con envolvente, para los remates. */
function tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = "sine"): void {
  const c = getCtx();
  if (!c) return;

  const o = c.createOscillator();
  const g = c.createGain();

  o.type = type;
  o.frequency.setValueAtTime(freq, at);

  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  o.connect(g);
  g.connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** Rodada del dado: golpes irregulares que se van espaciando y apagando. */
export function playDiceRoll(durationMs = 1100): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;

  const t0 = c.currentTime;
  const total = durationMs / 1000;

  let t = 0;
  let gap = 0.045;

  while (t < total) {
    const progress = t / total;
    clack(
      t0 + t,
      0.16 * (1 - progress * 0.75),
      600 + Math.random() * 2200,
    );
    // Los golpes se van separando, como un dado que pierde energía.
    gap *= 1.16;
    t += gap + Math.random() * 0.02;
  }
}

/** Acorde ascendente para un éxito. */
export function playSuccess(): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;

  const t = c.currentTime;
  tone(523.25, t, 0.28, 0.12, "triangle");
  tone(659.25, t + 0.07, 0.3, 0.1, "triangle");
  tone(783.99, t + 0.14, 0.38, 0.09, "sine");
}

/** Descenso grave para un fallo. */
export function playFailure(): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;

  const t = c.currentTime;
  tone(196, t, 0.34, 0.11, "sawtooth");
  tone(146.83, t + 0.1, 0.42, 0.09, "triangle");
}

/** Fanfarria corta para el 20 natural. */
export function playCrit(): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;

  const t = c.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(f, t + i * 0.075, 0.4, 0.12, "triangle");
  });
  tone(1318.5, t + 0.34, 0.55, 0.08, "sine");
}

/** Golpe seco y grave para el 1 natural. */
export function playFumble(): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;

  const t = c.currentTime;
  tone(110, t, 0.5, 0.14, "sawtooth");
  tone(73.42, t + 0.06, 0.6, 0.12, "square");
}

/** Click suave para la interfaz. */
export function playClick(): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  clack(c.currentTime, 0.05, 2400);
}
