/**
 * Motor de audio compartido.
 *
 * ORIGEN DEL RUIDO QUE HABÍA ANTES (y cómo se arregló):
 *
 * 1. Osciladores que arrancaban y paraban con `gain.value = x` de golpe. Un
 *    salto instantáneo de amplitud es, matemáticamente, un impulso: contiene
 *    todas las frecuencias. Eso es el "clic" que se escuchaba en cada nota.
 *    → Ahora TODO sube y baja con rampas de al menos 20 ms.
 *
 * 2. Ruido blanco de banda completa (`Math.random()` crudo) con un lowpass
 *    suave. Eso es siseo, no ambiente.
 *    → El pad ahora es armónico: senoidales en relación de quintas y octavas.
 *
 * 3. Varias fuentes sumadas sin control de ganancia total. Cuando coincidían
 *    los picos, la señal pasaba de 1.0 y la tarjeta clippeaba: distorsión.
 *    → Un DynamicsCompressor en el master y ganancias conservadoras.
 *
 * 4. Un AudioContext nuevo por componente.
 *    → Uno solo, compartido, con un bus de música y otro de efectos.
 */

type Bus = {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  limiter: DynamicsCompressorNode;
};

let bus: Bus | null = null;

/**
 * Devuelve el bus de audio, creándolo si hace falta.
 * Sólo funciona tras un gesto del usuario (política de autoplay).
 */
export function getBus(): Bus | null {
  if (typeof window === "undefined") return null;

  try {
    if (bus) {
      if (bus.ctx.state === "suspended") void bus.ctx.resume();
      return bus;
    }

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();

    // Limitador: la última defensa contra el clipping.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 12;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    const master = ctx.createGain();
    master.gain.value = 0.9;

    const music = ctx.createGain();
    music.gain.value = 0; // arranca en silencio y sube con rampa

    const sfx = ctx.createGain();
    sfx.gain.value = 0.85;

    music.connect(master);
    sfx.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    bus = { ctx, master, music, sfx, limiter };
    return bus;
  } catch {
    return null;
  }
}

/** Rampa suave. Nunca cambiar una ganancia de golpe: eso hace "clic". */
export function ramp(param: AudioParam, to: number, seconds = 0.08, ctx?: AudioContext): void {
  const now = (ctx ?? bus?.ctx)?.currentTime ?? 0;
  try {
    param.cancelScheduledValues(now);
    param.setValueAtTime(Math.max(param.value, 0.0001), now);
    // Exponencial suena natural al oído; no admite el 0 exacto.
    if (to <= 0.0001) param.linearRampToValueAtTime(0, now + seconds);
    else param.exponentialRampToValueAtTime(to, now + seconds);
  } catch {
    // Si el nodo ya se desconectó, no pasa nada.
  }
}

export function setMusicVolume(v: number): void {
  const b = getBus();
  if (!b) return;
  ramp(b.music.gain, Math.max(0, Math.min(1, v)) * 0.5, 0.4);
}

export function setSfxVolume(v: number): void {
  const b = getBus();
  if (!b) return;
  ramp(b.sfx.gain, Math.max(0, Math.min(1, v)), 0.1);
}

let sfxMuted = false;

export function setSfxMuted(m: boolean): void {
  sfxMuted = m;
}

export function isSfxMuted(): boolean {
  return sfxMuted;
}
