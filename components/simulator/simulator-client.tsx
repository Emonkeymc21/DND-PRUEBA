"use client";

import * as React from "react";
import scenesRaw from "@/data/simulator/scenes.es.json";
import { Button, Card } from "@/components/ui";

type Effects = Record<string, number>;

type RawSceneOption = {
  label: string;
  kind?: "check" | "combat" | "link";
  // navigation
  next?: string;
  href?: string;
  // check
  dc?: number;
  ability?: string;
  skill?: string;
  // combat
  playerAttackMod?: number;
  advantage?: boolean;
  // custom
  effects?: Effects;
};

type RawScene = {
  title: string;
  text: string;
  narrate?: boolean;
  summary?: string;
  end?: boolean;
  options?: RawSceneOption[];
  resolve?: {
    success: { next: string; text: string };
    fail: { next: string; text: string };
  };
};

type ScenesDict = Record<string, RawScene>;

type ThemeKey = "fantasy" | "scifi" | "anime" | "magic" | "horror" | "none";

function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollD20() {
  return rollDie(20);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function inferThemeFromSceneId(id: string): ThemeKey {
  if (id.startsWith("fan_")) return "fantasy";
  if (id.startsWith("sci_")) return "scifi";
  if (id.startsWith("ani_")) return "anime";
  if (id.startsWith("mag_")) return "magic";
  if (id.startsWith("hor_")) return "horror";
  return "none";
}

function defaultStats(theme: ThemeKey): Record<string, number> {
  // Variables “tipo rol”: cambian por género. Todas quedan visibles y afectan algunos checks / finales.
  switch (theme) {
    case "fantasy":
      return { honor: 0, oscuridad: 0, reputacion: 0, destino: 0 };
    case "scifi":
      return { energia: 3, amenazaIA: 0, estabilidad: 2, reputacion: 0 };
    case "anime":
      return { ki: 0, voluntad: 0, rivalidad: 0, oscuridad: 0 };
    case "magic":
      return { afinidad: 0, confianza: 0, oscuridad: 0 };
    case "horror":
      return { cordura: 3, miedo: 0, corrupcion: 0 };
    default:
      return {};
  }
}

function pickSpanishVoice(voices: SpeechSynthesisVoice[]) {
  // Preferimos voces es-*, masculinas cuando sea posible (no siempre hay metadata de género).
  const es = voices.filter((v) => /(^|-)es/i.test(v.lang) || /spanish/i.test(v.name));
  const prefer = (arr: SpeechSynthesisVoice[]) =>
    arr.find((v) => /microsoft|google/i.test(v.name)) ?? arr[0];
  return prefer(es) ?? voices[0];
}

/**
 * Música de fondo sin assets externos:
 * Genera ambiente con WebAudio (osc + ruido filtrado).
 */
function useAmbientMusic(theme: ThemeKey, enabled: boolean, volume: number) {
  const ctxRef = React.useRef<AudioContext | null>(null);
  const gainRef = React.useRef<GainNode | null>(null);
  const nodesRef = React.useRef<AudioNode[]>([]);

  const stop = React.useCallback(() => {
    nodesRef.current.forEach((n) => {
      try {
        // @ts-expect-error: some nodes have stop()
        n.stop?.(0);
      } catch {}
      try {
        n.disconnect();
      } catch {}
    });
    nodesRef.current = [];
  }, []);

  const ensureContext = React.useCallback(async () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
    if (!gainRef.current) {
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = 0.18; // base
      gainRef.current.connect(ctxRef.current.destination);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!enabled) {
        stop();
        return;
      }
      await ensureContext();
      if (cancelled) return;

      const ctx = ctxRef.current!;
      const master = gainRef.current!;
      master.gain.value = clamp(volume, 0, 1) * 0.22; // música siempre por debajo de la voz

      stop();

      // helpers
      const addOsc = (freq: number, type: OscillatorType, gain: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = gain;
        o.connect(g);
        g.connect(master);
        o.start();
        nodesRef.current.push(o, g);
      };

      const addNoise = (gain: number, lowpassHz: number) => {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * 0.25;

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = lowpassHz;

        const g = ctx.createGain();
        g.gain.value = gain;

        source.connect(filter);
        filter.connect(g);
        g.connect(master);

        source.start();
        nodesRef.current.push(source, filter, g);
      };

      // presets
      switch (theme) {
        case "fantasy":
          addOsc(110, "sine", 0.08);
          addOsc(220, "triangle", 0.05);
          addNoise(0.03, 900);
          break;
        case "scifi":
          addOsc(55, "sawtooth", 0.06);
          addOsc(165, "square", 0.03);
          addNoise(0.025, 1400);
          break;
        case "anime":
          addOsc(130.81, "triangle", 0.07);
          addOsc(261.63, "sine", 0.04);
          addNoise(0.02, 1200);
          break;
        case "magic":
          addOsc(98, "sine", 0.07);
          addOsc(196, "sine", 0.05);
          addNoise(0.02, 800);
          break;
        case "horror":
          addOsc(40, "sine", 0.08);
          addOsc(80, "triangle", 0.04);
          addNoise(0.04, 500);
          break;
        default:
          addOsc(110, "sine", 0.06);
          addNoise(0.02, 900);
          break;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, ensureContext, stop, theme, volume]);

  return { ensureContext, stop };
}

export default function SimulatorClient() {
  const scenes = scenesRaw as unknown as ScenesDict;

  const [sceneId, setSceneId] = React.useState<string>("choose_theme");
  const [log, setLog] = React.useState<string[]>([]);
  const [autoNarrate, setAutoNarrate] = React.useState(true);

  // voz
  const [rate, setRate] = React.useState(0.9);
  const [pitch, setPitch] = React.useState(0.75); // más grave
  const [voice, setVoice] = React.useState<SpeechSynthesisVoice | undefined>(undefined);

  // música
  const [musicOn, setMusicOn] = React.useState(true);
  const [musicVol, setMusicVol] = React.useState(0.75);

  // combate
  const [hp, setHp] = React.useState(12);
  const [enemyHp, setEnemyHp] = React.useState(16);

  // variables del run
  const [theme, setTheme] = React.useState<ThemeKey>("none");
  const [stats, setStats] = React.useState<Record<string, number>>({});

  const scene = scenes[sceneId] ?? null;

  const { ensureContext: ensureAudioContext } = useAmbientMusic(theme, musicOn, musicVol);

  // cargar voz
  React.useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const update = () => {
      const voices = synth.getVoices();
      if (voices && voices.length) setVoice(pickSpanishVoice(voices));
    };

    update();
    synth.onvoiceschanged = update;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  const speak = React.useCallback(
    async (txt: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (!txt.trim()) return;

      // asegurar audio context para música (solo tras gesto del usuario)
      try {
        await ensureAudioContext();
      } catch {}

      const synth = window.speechSynthesis;
      synth.cancel();

      const u = new SpeechSynthesisUtterance(txt);
      u.lang = "es-AR";
      if (voice) u.voice = voice;
      u.rate = clamp(rate, 0.6, 1.2);
      u.pitch = clamp(pitch, 0.5, 1.1);
      u.volume = 1;

      synth.speak(u);
    },
    [ensureAudioContext, pitch, rate, voice]
  );

  React.useEffect(() => {
    if (!autoNarrate) return;
    if (!scene) return;
    if (scene.narrate === false) return;
    speak(`${scene.title}. ${scene.text}`);
  }, [autoNarrate, scene, speak]);

  function resetRun() {
    setSceneId("choose_theme");
    setLog([]);
    setHp(12);
    setEnemyHp(16);
    setTheme("none");
    setStats({});
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function applyEffects(effects?: Effects) {
    if (!effects) return;
    // hp aparte
    if (typeof effects.hp === "number") setHp((v) => clamp(v + effects.hp!, 0, 99));

    setStats((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(effects)) {
        if (k === "hp") continue;
        next[k] = (next[k] ?? 0) + v;
      }
      return next;
    });
  }

  function go(next: string) {
    const nextTheme = inferThemeFromSceneId(next);
    if (nextTheme !== "none") {
      // si arrancás una temática, inicializamos stats si no estaban
      setTheme(nextTheme);
      setStats((s) => (Object.keys(s).length ? s : defaultStats(nextTheme)));
      // reinicio de combate por seguridad
      setEnemyHp(16);
      setHp((h) => (h <= 0 ? 12 : h));
    }

    setSceneId(next);
    const s = scenes[next];
    if (s?.title) setLog((l) => [...l, `➡️ ${s.title}`]);
  }

  function abilityMod(ability?: string) {
    // Sencillo: devolvemos un mod "temático" según variables.
    // Si querés después lo hacemos 100% D&D con STR/DEX/CON/INT/WIS/CHA.
    if (!ability) return 2;
    const a = ability.toUpperCase();
    if (a === "CHA") return 2 + (stats.reputacion ?? 0);
    if (a === "WIS") return 2 + (stats.cordura ?? 0);
    if (a === "INT") return 2 + (stats.afinidad ?? 0);
    if (a === "DEX") return 2;
    if (a === "STR") return 2 + (stats.ki ?? 0);
    return 2;
  }

  function resolveCheckTo(checkSceneId: string | null, dc: number, label: string) {
    const roll = rollD20();
    const mod = abilityMod(undefined); // si viene ability en opt lo incluimos en label y mod más abajo
    const total = roll + mod;
    const ok = total >= dc;

    setLog((l) => [...l, `🎲 ${label}: ${roll} + ${mod} = ${total} vs DC ${dc} → ${ok ? "ÉXITO" : "FALLO"}`]);

    const target = checkSceneId && scenes[checkSceneId] ? scenes[checkSceneId] : scene;

    if (checkSceneId && scenes[checkSceneId]) setSceneId(checkSceneId);

    const r = target?.resolve;
    if (!r) {
      setLog((l) => [...l, "⚠️ Esta escena no tiene bloque resolve. Sigo a la siguiente para no bloquear."]);
      go("choose_theme");
      return;
    }

    go(ok ? r.success.next : r.fail.next);
    setLog((l) => [...l, ok ? `✅ ${r.success.text}` : `⚠️ ${r.fail.text}`]);
  }

  function doCombat(opt: RawSceneOption) {
    // Re-iniciar enemigo en cada combate "nuevo"
    setEnemyHp((eh) => (eh <= 0 ? 16 : eh));

    const attackMod = Number(opt.playerAttackMod ?? 4);
    const advantage = !!opt.advantage;

    const playerA = rollD20();
    const playerB = rollD20();
    const playerRoll = advantage ? Math.max(playerA, playerB) : playerA;
    const playerHit = playerRoll + attackMod >= 12;

    let newEnemy = enemyHp;
    let newHp = hp;

    if (playerHit) {
      const dmg = rollDie(8) + 3;
      newEnemy -= dmg;
      setLog((l) => [...l, `⚔️ Tu ataque: ${advantage ? `(${playerA}, ${playerB}) ⇒ ` : ""}${playerRoll}+${attackMod} → PEGÁS. Daño ${dmg}.`]);
    } else {
      setLog((l) => [...l, `⚔️ Tu ataque: ${advantage ? `(${playerA}, ${playerB}) ⇒ ` : ""}${playerRoll}+${attackMod} → FALLÁS.`]);
    }

    if (newEnemy <= 0) {
      setEnemyHp(0);
      setLog((l) => [...l, "🏆 Ganaste el combate."]);
      if (opt.next) go(String(opt.next));
      else go("choose_theme");
      return;
    }

    const eRoll = rollD20();
    const eHit = eRoll + 3 >= 12;
    if (eHit) {
      const dmg = rollDie(6) + 1;
      newHp -= dmg;
      setLog((l) => [...l, `🩸 Enemigo: ${eRoll}+3 → te pega. Daño ${dmg}.`]);
    } else {
      setLog((l) => [...l, `🛡️ Enemigo: ${eRoll}+3 → falla.`]);
    }

    if (newHp <= 0) {
      setHp(0);
      setLog((l) => [...l, "💀 Caíste. Tu historia termina acá."]);
      // enviar a un “final malo” genérico por temática si existe, sino elegir.
      const bad = theme === "fantasy" ? "fan_bad_end" : theme === "scifi" ? "sci_bad_end" : theme === "anime" ? "ani_bad_end" : theme === "magic" ? "mag_bad_end" : theme === "horror" ? "hor_bad_end" : "choose_theme";
      go(bad);
      return;
    }

    setEnemyHp(newEnemy);
    setHp(newHp);
  }

  function onOption(opt: RawSceneOption) {
    try {
      // AudioContext: necesitamos gesto del usuario para que la música se reproduzca en algunos navegadores
      ensureAudioContext().catch(() => {});

      // aplicar efectos antes de resolver
      applyEffects(opt.effects);

      const next = opt?.next;

      if (opt?.kind === "check") {
        const label = `${opt.skill ?? "Chequeo"}${opt.ability ? ` (${opt.ability})` : ""}`.trim();
        const mod = abilityMod(opt.ability);
        const roll = rollD20();
        const total = roll + mod;
        const dc = Number(opt.dc ?? 12);
        const ok = total >= dc;

        setLog((l) => [...l, `🎲 ${label}: ${roll} + ${mod} = ${total} vs DC ${dc} → ${ok ? "ÉXITO" : "FALLO"}`]);

        const targetId = next ? String(next) : sceneId;
        const target = scenes[targetId] ?? scene;

        const r = target?.resolve;
        if (!r) {
          // si no tiene resolve, tratamos el next como navegación directa (para checks simples)
          if (next) return go(String(next));
          setLog((l) => [...l, "⚠️ Check sin resolve ni next. Reinicio para evitar bloqueo."]);
          return resetRun();
        }

        go(ok ? r.success.next : r.fail.next);
        setLog((l) => [...l, ok ? `✅ ${r.success.text}` : `⚠️ ${r.fail.text}`]);
        return;
      }

      if (opt?.kind === "combat") {
        return doCombat(opt);
      }

      if (opt?.kind === "link" && opt.href) {
        window.location.href = String(opt.href);
        return;
      }

      if (next) return go(String(next));

      setLog((l) => [...l, "⚠️ Opción sin destino. Reinicio para evitar bloqueo."]);
      resetRun();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Simulator] onOption", e);
      setLog((l) => [...l, "⚠️ Error al procesar la opción. Reinicio para evitar bloqueo."]);
      resetRun();
    }
  }

  if (!scene) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-bold">Escena no encontrada</h2>
        <p className="mt-2 text-sm text-text/70">
          No pude cargar la escena <b>{sceneId}</b>. Esto suele pasar por un ID mal escrito en alguna rama.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={resetRun}>Volver a empezar</Button>
        </div>
      </Card>
    );
  }

  const isEnding = !!scene.end || (scene.options?.length === 1 && scene.options[0].next === "choose_theme");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">{scene.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text/80">{scene.text}</p>
          </div>

          <div className="min-w-[220px] space-y-2 rounded-xl border border-border/60 bg-black/20 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text/70">HP</span>
              <span className="font-semibold">{hp}</span>
            </div>

            {theme !== "none" && (
              <div className="space-y-1">
                <div className="text-xs font-semibold tracking-[0.18em] text-text/60">VARIABLES</div>
                {Object.entries(stats).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-text/70">{k.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text/70">Auto‑narración</span>
                <button
                  className="rounded-lg border border-border/60 px-2 py-1 text-xs"
                  onClick={() => setAutoNarrate((v) => !v)}
                >
                  {autoNarrate ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-text/70">Música</span>
                <button
                  className="rounded-lg border border-border/60 px-2 py-1 text-xs"
                  onClick={() => {
                    ensureAudioContext().catch(() => {});
                    setMusicOn((v) => !v);
                  }}
                >
                  {musicOn ? "ON" : "OFF"}
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text/70">Voz</span>
                  <span className="text-text/70">{rate.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={1.1}
                  step={0.01}
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text/70">Voz (grave)</span>
                  <span className="text-text/70">{pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.55}
                  max={1.05}
                  step={0.01}
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text/70">Volumen música</span>
                  <span className="text-text/70">{Math.round(musicVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={musicVol}
                  onChange={(e) => setMusicVol(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => speak(`${scene.title}. ${scene.text}`)}
                  className="w-full"
                >
                  Re‑narrar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {scene.options?.length ? (
          <div className="mt-4 grid gap-2">
            {scene.options.map((o, i) => (
              <Button key={`${sceneId}-${i}`} onClick={() => onOption(o)} className="justify-start">
                {o.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <Button onClick={resetRun}>Volver a empezar</Button>
          </div>
        )}

        {isEnding && (
          <div className="mt-4">
            <Button onClick={resetRun}>🔁 Volver a empezar</Button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="text-xs font-semibold tracking-[0.18em] text-text/60">REGISTRO</div>
        <div className="mt-3 max-h-64 space-y-1 overflow-auto rounded-xl border border-border/60 bg-black/25 p-3">
          {log.length === 0 ? (
            <div className="text-sm text-text/60">Tu historia aparece acá…</div>
          ) : (
            log.map((l, idx) => (
              <div key={idx} className="text-sm text-text/80">
                {l}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
