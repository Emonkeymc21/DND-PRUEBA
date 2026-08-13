"use client";

import * as React from "react";

/**
 * Narración de escenas.
 *
 * Dos capas:
 *  1. Web Speech API con modulación (pitch grave, ritmo pausado) si el
 *     navegador tiene una voz en español decente.
 *  2. Efecto de máquina de escribir, siempre. No es sólo un respaldo: acompaña
 *     a la voz, y es lo único que queda si el navegador no sirve o si la
 *     persona tiene el sonido apagado (que es la mayoría, en el celular).
 *
 * Sobre la detección de voz: `getVoices()` suele devolver [] en la primera
 * llamada porque la lista carga asincrónicamente. Por eso se escucha
 * `voiceschanged` y se reintenta.
 */

// ---------------------------------------------------------------------------
// Selección de voz
// ---------------------------------------------------------------------------

/**
 * Elegimos por calidad conocida, no sólo por idioma.
 * Las voces locales del sistema suenan mucho mejor que las genéricas de red,
 * y las de es-AR / es-MX evitan el ceceo peninsular que descoloca al leer
 * texto rioplatense.
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  const name = v.name.toLowerCase();

  let score = 0;

  if (lang.startsWith("es")) score += 100;
  else return -1; // no es español: descartada

  if (lang.includes("ar")) score += 40;
  else if (lang.includes("mx") || lang.includes("us") || lang.includes("419")) score += 30;
  else if (lang.includes("es")) score += 10;

  if (v.localService) score += 25;

  // Nombres asociados a las voces neurales de cada plataforma.
  if (/(google|natural|neural|premium|enhanced|siri)/.test(name)) score += 20;
  // Las "compact" de iOS suenan robóticas.
  if (/compact|eloquence/.test(name)) score -= 25;

  return score;
}

export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const ranked = voices
    .map((v) => ({ v, s: scoreVoice(v) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);

  return ranked[0]?.v;
}

export function useSpanishVoice() {
  const [voice, setVoice] = React.useState<SpeechSynthesisVoice | undefined>();
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    setSupported(true);

    const update = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) setVoice(pickVoice(voices));
    };

    update();
    synth.addEventListener("voiceschanged", update);

    // Algunos Chrome no disparan el evento: reintentamos un par de veces.
    const retries = [300, 900, 2000].map((ms) => window.setTimeout(update, ms));

    return () => {
      synth.removeEventListener("voiceschanged", update);
      retries.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return { voice, supported };
}

// ---------------------------------------------------------------------------
// Habla con modulación
// ---------------------------------------------------------------------------

export type SpeakOptions = {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
};

/**
 * Divide en frases y las encola por separado.
 *
 * Dos motivos:
 *  - Chrome tiene un bug viejo: los textos largos se cortan a los ~15 segundos.
 *    Frases cortas lo esquivan.
 *  - Podemos variar pitch y velocidad por frase, que es lo que hace que suene
 *    a alguien narrando y no a un lector de PDF.
 */
export function speakDramatic(text: string, opts: SpeakOptions = {}): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts.onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const clean = text.trim();
  if (!clean) {
    opts.onEnd?.();
    return;
  }

  const sentences = clean
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const baseRate = opts.rate ?? 0.88;
  const basePitch = opts.pitch ?? 0.78;

  sentences.forEach((sentence, i) => {
    const u = new SpeechSynthesisUtterance(sentence);
    u.lang = opts.voice?.lang ?? "es-AR";
    if (opts.voice) u.voice = opts.voice;

    // Las preguntas suben; las exclamaciones se aceleran; la última frase baja
    // y se pone más lenta, como un cierre.
    const isQuestion = sentence.endsWith("?");
    const isExclam = sentence.endsWith("!");
    const isLast = i === sentences.length - 1;

    u.pitch = Math.max(0.4, Math.min(1.4, basePitch + (isQuestion ? 0.16 : 0) + (isLast ? -0.05 : 0)));
    u.rate = Math.max(0.5, Math.min(1.5, baseRate + (isExclam ? 0.1 : 0) + (isLast ? -0.06 : 0)));
    u.volume = 1;

    if (isLast && opts.onEnd) u.onend = opts.onEnd;

    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

// ---------------------------------------------------------------------------
// Máquina de escribir
// ---------------------------------------------------------------------------

type TypewriterProps = {
  text: string;
  /** Caracteres por segundo. 45 es cómodo para leer sin desesperar. */
  speed?: number;
  className?: string;
  onDone?: () => void;
};

/**
 * Escribe el texto progresivamente.
 *
 * Implementación con rAF y no con setInterval por carácter: un intervalo cada
 * 22 ms genera cientos de renders y en móvil se nota. Acá se calcula cuántos
 * caracteres corresponden según el tiempo transcurrido y se actualiza sólo si
 * el número cambió.
 *
 * Se puede saltear tocando el texto: nadie quiere esperar una animación dos veces.
 */
export function Typewriter({ text, speed = 45, className, onDone }: TypewriterProps) {
  const [shown, setShown] = React.useState(0);
  const [skipped, setSkipped] = React.useState(false);
  const doneRef = React.useRef(false);

  React.useEffect(() => {
    setShown(0);
    setSkipped(false);
    doneRef.current = false;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduced || text.length === 0) {
      setShown(text.length);
      onDone?.();
      doneRef.current = true;
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const chars = Math.floor(((now - start) / 1000) * speed);

      if (chars >= text.length) {
        setShown(text.length);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
        return;
      }

      setShown(chars);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `onDone` queda fuera a propósito: si el padre lo redefine en cada render,
    // reiniciaría la animación sin parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  const complete = skipped || shown >= text.length;
  const visible = complete ? text : text.slice(0, shown);

  function skip() {
    if (complete) return;
    setSkipped(true);
    if (!doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  }

  return (
    <p
      className={className}
      onClick={skip}
      title={complete ? undefined : "Tocá para mostrar todo"}
      style={{ cursor: complete ? "default" : "pointer" }}
    >
      {visible}
      {!complete ? (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-primary align-middle" />
      ) : null}
    </p>
  );
}

export default Typewriter;
