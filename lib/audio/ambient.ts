import { getBus, ramp } from "@/lib/audio/engine";

/**
 * Pad ambiente armónico.
 *
 * Reemplaza el sistema anterior, que sumaba osciladores en frecuencias sin
 * relación musical más ruido blanco filtrado. Eso sonaba a interferencia
 * porque literalmente lo era: frecuencias inarmónicas batiendo entre sí.
 *
 * Ahora cada preset es un ACORDE. Las voces están en relación de octava y
 * quinta justa (1 : 1.5 : 2 : 3), que es la serie armónica natural: el oído
 * las escucha como un solo sonido con cuerpo, no como notas peleándose.
 *
 * Además:
 * - Un LFO muy lento (0.05–0.12 Hz) mueve el filtro para que respire.
 * - Un leve detune entre voces (±4 cents) da anchura sin generar batido audible.
 * - Todo entra y sale con fades de 2 segundos.
 */

export type PadTheme = "fantasy" | "magic" | "anime" | "scifi" | "horror" | "none";

type Preset = {
  /** Fundamental en Hz. Grave, pero no tanto que se pierda en un parlante de celular. */
  root: number;
  /** Múltiplos de la fundamental. Sólo relaciones armónicas. */
  partials: number[];
  /** Ganancia relativa de cada parcial. Los agudos siempre más bajos. */
  gains: number[];
  /** Corte del filtro pasabajos, en Hz. */
  cutoff: number;
  /** Velocidad del LFO que mueve el filtro. */
  lfoRate: number;
  type: OscillatorType;
};

const PRESETS: Record<PadTheme, Preset> = {
  // La menor abierta: cálido y estable.
  fantasy: {
    root: 110, // A2
    partials: [1, 1.5, 2, 3],
    gains: [0.20, 0.13, 0.10, 0.05],
    cutoff: 900,
    lfoRate: 0.07,
    type: "sine",
  },
  // Sol con quinta: aire de biblioteca antigua.
  magic: {
    root: 98, // G2
    partials: [1, 1.5, 2, 2.5],
    gains: [0.18, 0.12, 0.09, 0.06],
    cutoff: 1100,
    lfoRate: 0.05,
    type: "sine",
  },
  // Do mayor, más brillante y con energía.
  anime: {
    root: 130.81, // C3
    partials: [1, 1.5, 2, 4],
    gains: [0.17, 0.11, 0.09, 0.04],
    cutoff: 1500,
    lfoRate: 0.12,
    type: "triangle",
  },
  // Mi grave con quinta: frío y sostenido.
  scifi: {
    root: 82.41, // E2
    partials: [1, 1.5, 2, 3],
    gains: [0.19, 0.10, 0.08, 0.05],
    cutoff: 800,
    lfoRate: 0.09,
    type: "triangle",
  },
  // Re bemol muy grave: incómodo a propósito, pero sin ser ruido.
  horror: {
    root: 69.3, // C#2
    partials: [1, 1.5, 2, 2.99], // el 2.99 desafina apenas: inquieta sin doler
    gains: [0.22, 0.09, 0.07, 0.04],
    cutoff: 520,
    lfoRate: 0.04,
    type: "sine",
  },
  none: {
    root: 110,
    partials: [1, 2],
    gains: [0.14, 0.07],
    cutoff: 900,
    lfoRate: 0.06,
    type: "sine",
  },
};

const FADE = 2.0; // segundos

type Voice = { osc: OscillatorNode; gain: GainNode };

let voices: Voice[] = [];
let filter: BiquadFilterNode | null = null;
let lfo: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;
let current: PadTheme | null = null;

/** Corta el pad con un fade de salida y limpia los nodos. */
export function stopPad(): void {
  const b = getBus();
  if (!b) return;

  const now = b.ctx.currentTime;

  for (const v of voices) {
    ramp(v.gain.gain, 0, FADE, b.ctx);
    try {
      // Parar DESPUÉS del fade, si no vuelve el clic.
      v.osc.stop(now + FADE + 0.1);
    } catch {
      /* ya estaba parado */
    }
  }

  const dyingVoices = voices;
  const dyingFilter = filter;
  const dyingLfo = lfo;
  const dyingLfoGain = lfoGain;

  voices = [];
  filter = null;
  lfo = null;
  lfoGain = null;
  current = null;

  window.setTimeout(
    () => {
      dyingVoices.forEach((v) => {
        try {
          v.osc.disconnect();
          v.gain.disconnect();
        } catch {
          /* noop */
        }
      });
      try {
        dyingLfo?.stop();
        dyingLfo?.disconnect();
        dyingLfoGain?.disconnect();
        dyingFilter?.disconnect();
      } catch {
        /* noop */
      }
    },
    (FADE + 0.3) * 1000,
  );
}

/**
 * Arranca (o cambia) el pad. Si ya suena el mismo tema, no hace nada:
 * reconstruirlo en cada render sería otra fuente de clics.
 */
export function startPad(theme: PadTheme): void {
  if (current === theme) return;

  const b = getBus();
  if (!b) return;

  if (current !== null) stopPad();

  const preset = PRESETS[theme] ?? PRESETS.none;
  const now = b.ctx.currentTime;

  // Filtro compartido: le da cuerpo y saca cualquier aspereza de arriba.
  filter = b.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = preset.cutoff;
  filter.Q.value = 0.7; // Q bajo: sin resonancia, sin silbido
  filter.connect(b.music);

  // LFO que respira sobre el corte del filtro.
  lfo = b.ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = preset.lfoRate;

  lfoGain = b.ctx.createGain();
  lfoGain.gain.value = preset.cutoff * 0.28;

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start(now);

  // Una voz por parcial.
  voices = preset.partials.map((mult, i) => {
    const osc = b.ctx.createOscillator();
    osc.type = preset.type;
    osc.frequency.value = preset.root * mult;
    // Detune mínimo y alternado: ancho estéreo percibido, sin batido audible.
    osc.detune.value = (i % 2 === 0 ? 1 : -1) * (2 + i);

    const gain = b.ctx.createGain();
    gain.gain.value = 0.0001; // nunca 0: exponentialRamp no lo admite

    osc.connect(gain);
    gain.connect(filter!);
    osc.start(now);

    // Fade de entrada escalonado: las voces no entran todas juntas.
    ramp(gain.gain, preset.gains[i] ?? 0.05, FADE + i * 0.35, b.ctx);

    return { osc, gain };
  });

  current = theme;
}

export function currentPad(): PadTheme | null {
  return current;
}
