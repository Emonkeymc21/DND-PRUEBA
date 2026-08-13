"use client";

import * as React from "react";
import scenesRaw from "@/data/simulator/scenes.es.json";
import { Button, Card } from "@/components/ui";
import { Dice3D, type RollResult } from "@/components/dice/dice3d";
import { FreeAction, type TurnPayload } from "@/components/simulator/free-action";
import { ProfilePanel, type MlArchetype, type MlCampaign } from "@/components/simulator/profile-panel";
import { Typewriter, useSpanishVoice, speakDramatic, stopSpeaking } from "@/components/simulator/narration";
import { AudioPlayer, type AudioTheme } from "@/components/audio/AudioPlayer";
import { getBus } from "@/lib/audio/engine";
import { setSfxMuted, playClick } from "@/lib/audio/sfx";
import { zeroVector, type Vector } from "@/data/ml-simulation-dataset";

/**
 * Simulador.
 *
 * Motor de escenas (53 escenas ramificadas en scenes.es.json) + capa de ML +
 * dado 3D + audio limpio.
 *
 * Cambios respecto de la versión anterior:
 * - El generador de "ambiente" que sumaba osciladores inarmónicos y ruido
 *   blanco se fue entero. La música de fondo ahora va por Howler.js
 *   (components/audio/AudioPlayer.tsx) con pistas de audio reales en
 *   /public/audio/, no síntesis. El SFX corto del dado sigue sintetizado
 *   (lib/audio/sfx.ts) porque ahí sí tiene sentido: es un efecto de 50ms,
 *   no algo que suene largo rato.
 * - La selección de voz y la narración se fueron a components/simulator/narration.tsx,
 *   con modulación por frase y máquina de escribir como acompañamiento.
 * - El perfil ya no son 4 ejes calculados con un léxico local: son 8
 *   dimensiones inferidas por k-NN contra un corpus etiquetado, con
 *   recomendación de campaña.
 */

// ---------------------------------------------------------------------------
// Tipos del motor de escenas
// ---------------------------------------------------------------------------

type Effects = Record<string, number>;

type RawSceneOption = {
  label: string;
  kind?: "check" | "combat" | "link";
  next?: string;
  href?: string;
  dc?: number;
  ability?: string;
  skill?: string;
  playerAttackMod?: number;
  advantage?: boolean;
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

/** Claves con las que el formulario levanta lo que dejó el simulador. */
export const PROFILE_TAGS_KEY = "mesa_perfil_tags";
export const PROFILE_VECTOR_KEY = "mesa_perfil_vector";
export const PROFILE_ML_KEY = "mesa_perfil_ml";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function rollD20(): number {
  return rollDie(20);
}

function clamp(n: number, min: number, max: number): number {
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

const THEME_LABEL: Record<ThemeKey, string> = {
  fantasy: "fantasía épica",
  scifi: "sci-fi / cyberpunk",
  anime: "anime / shonen",
  magic: "mundo mágico",
  horror: "terror",
  none: "fantasía",
};

/** El reproductor de audio usa las mismas claves que el motor de escenas. */
const THEME_TO_AUDIO: Record<ThemeKey, AudioTheme> = {
  fantasy: "fantasy",
  scifi: "scifi",
  anime: "anime",
  magic: "magic",
  horror: "horror",
  none: "none",
};

function defaultStats(theme: ThemeKey): Record<string, number> {
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

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function SimulatorClient() {
  const scenes = scenesRaw as unknown as ScenesDict;

  const [sceneId, setSceneId] = React.useState<string>("choose_theme");
  const [log, setLog] = React.useState<string[]>([]);

  // Audio: sfx sintetizado para el dado (corto, con envolvente, sin ruido);
  // la música de fondo va por Howler con pistas reales (AudioPlayer más abajo).
  const [sfxOn, setSfxOn] = React.useState(true);

  // Narración
  const [autoNarrate, setAutoNarrate] = React.useState(false);
  const { voice, supported: speechSupported } = useSpanishVoice();

  // Combate
  const [hp, setHp] = React.useState(12);
  const [enemyHp, setEnemyHp] = React.useState(16);

  // Run
  const [theme, setTheme] = React.useState<ThemeKey>("none");
  const [stats, setStats] = React.useState<Record<string, number>>({});

  // Perfil del modelo
  const [vectorHistory, setVectorHistory] = React.useState<Vector[]>([]);
  const [profile, setProfile] = React.useState<Vector>(zeroVector());
  const [archetype, setArchetype] = React.useState<MlArchetype | null>(null);
  const [campaigns, setCampaigns] = React.useState<MlCampaign[]>([]);
  const [confidence, setConfidence] = React.useState<number | null>(null);
  const [freeTurns, setFreeTurns] = React.useState(0);

  const scene = scenes[sceneId] ?? null;

  // --- Sincronización del audio ---
  React.useEffect(() => {
    setSfxMuted(!sfxOn);
  }, [sfxOn]);

  // La narración se corta al desmontar; Howler se limpia solo dentro de
  // AudioPlayer (su propio cleanup en el hook useAmbientPlayer).
  React.useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const speak = React.useCallback(
    (txt: string) => {
      if (!autoNarrate || !speechSupported) return;
      speakDramatic(txt, { voice });
    },
    [autoNarrate, speechSupported, voice],
  );

  React.useEffect(() => {
    if (!autoNarrate || !scene || scene.narrate === false) return;
    speak(`${scene.title}. ${scene.text}`);
  }, [autoNarrate, scene, speak]);

  /** El audio necesita un gesto del usuario para arrancar. */
  function unlockAudio() {
    getBus();
  }

  function resetRun() {
    stopSpeaking();
    setSceneId("choose_theme");
    setLog([]);
    setHp(12);
    setEnemyHp(16);
    setTheme("none");
    setStats({});
    setVectorHistory([]);
    setProfile(zeroVector());
    setArchetype(null);
    setCampaigns([]);
    setConfidence(null);
    setFreeTurns(0);
  }

  function applyEffects(effects?: Effects) {
    if (!effects) return;

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
      setTheme(nextTheme);
      setStats((s) => (Object.keys(s).length ? s : defaultStats(nextTheme)));
      setEnemyHp(16);
      setHp((h) => (h <= 0 ? 12 : h));
    }

    setSceneId(next);
    const s = scenes[next];
    if (s?.title) setLog((l) => [...l, `➡️ ${s.title}`]);
  }

  function abilityMod(ability?: string): number {
    if (!ability) return 2;
    const a = ability.toUpperCase();
    if (a === "CHA") return 2 + (stats.reputacion ?? 0);
    if (a === "WIS") return 2 + (stats.cordura ?? 0);
    if (a === "INT") return 2 + (stats.afinidad ?? 0);
    if (a === "STR") return 2 + (stats.ki ?? 0);
    return 2;
  }

  /** Turno de texto libre resuelto: aplica perfil, narración y desenlace. */
  function onFreeAction(payload: TurnPayload) {
    const { action, narration, roll, turnVector, profile: newProfile } = payload;

    if (turnVector) setVectorHistory((h) => [...h, turnVector]);
    setProfile(newProfile);
    setArchetype(payload.archetype);
    setCampaigns(payload.campaigns);
    setConfidence(payload.confidence);
    setFreeTurns((n) => n + 1);

    const desenlace = roll.crit
      ? "🌟 Crítico: sale incluso mejor de lo que imaginabas."
      : roll.fumble
        ? "💥 Pifia: sale mal, y de una forma que no viste venir."
        : roll.success
          ? "✅ Te sale."
          : "⚠️ No te sale como esperabas.";

    setLog((l) => [
      ...l,
      `✍️ Vos: ${action}`,
      `📖 ${narration}`,
      `🎲 ${roll.roll}${roll.dc !== null ? ` vs DC ${roll.dc}` : ""} → ${desenlace}`,
    ]);

    speak(narration);
  }

  /** Lleva el perfil inferido al formulario y abre la postulación. */
  function goToSignup() {
    try {
      const tags: string[] = [];
      if (archetype) {
        tags.push(archetype.name, `Clase: ${archetype.suggestedClass}`);
      }
      const top = campaigns.find((c) => !c.blocked);
      if (top) tags.push(`Campaña: ${top.name}`);

      window.sessionStorage.setItem(PROFILE_TAGS_KEY, JSON.stringify(tags));
      window.sessionStorage.setItem(PROFILE_VECTOR_KEY, JSON.stringify(profile));
      window.sessionStorage.setItem(
        PROFILE_ML_KEY,
        JSON.stringify({
          archetype: archetype
            ? { id: archetype.id, name: archetype.name, suggestedClass: archetype.suggestedClass }
            : null,
          campaign: top ? { id: top.id, name: top.name, score: top.score } : null,
          inferredFields: null,
        }),
      );
    } catch {
      // sessionStorage bloqueado: el formulario funciona igual, sin precarga.
    }
    window.location.href = "/#postularme";
  }

  function doCombat(opt: RawSceneOption) {
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
      setLog((l) => [
        ...l,
        `⚔️ Tu ataque: ${advantage ? `(${playerA}, ${playerB}) ⇒ ` : ""}${playerRoll}+${attackMod} → PEGÁS. Daño ${dmg}.`,
      ]);
    } else {
      setLog((l) => [
        ...l,
        `⚔️ Tu ataque: ${advantage ? `(${playerA}, ${playerB}) ⇒ ` : ""}${playerRoll}+${attackMod} → FALLÁS.`,
      ]);
    }

    if (newEnemy <= 0) {
      setEnemyHp(0);
      setLog((l) => [...l, "🏆 Ganaste el combate."]);
      go(opt.next ? String(opt.next) : "choose_theme");
      return;
    }

    const eRoll = rollD20();
    if (eRoll + 3 >= 12) {
      const dmg = rollDie(6) + 1;
      newHp -= dmg;
      setLog((l) => [...l, `🩸 Enemigo: ${eRoll}+3 → te pega. Daño ${dmg}.`]);
    } else {
      setLog((l) => [...l, `🛡️ Enemigo: ${eRoll}+3 → falla.`]);
    }

    if (newHp <= 0) {
      setHp(0);
      setLog((l) => [...l, "💀 Caíste. Tu historia termina acá."]);
      const bad =
        theme === "fantasy"
          ? "fan_bad_end"
          : theme === "scifi"
            ? "sci_bad_end"
            : theme === "anime"
              ? "ani_bad_end"
              : theme === "magic"
                ? "mag_bad_end"
                : theme === "horror"
                  ? "hor_bad_end"
                  : "choose_theme";
      go(bad);
      return;
    }

    setEnemyHp(newEnemy);
    setHp(newHp);
  }

  function onOption(opt: RawSceneOption) {
    try {
      unlockAudio();
      playClick();
      applyEffects(opt.effects);

      const next = opt?.next;

      if (opt?.kind === "check") {
        const label = `${opt.skill ?? "Chequeo"}${opt.ability ? ` (${opt.ability})` : ""}`.trim();
        const mod = abilityMod(opt.ability);
        const roll = rollD20();
        const total = roll + mod;
        const dc = Number(opt.dc ?? 12);
        const ok = total >= dc;

        setLog((l) => [
          ...l,
          `🎲 ${label}: ${roll} + ${mod} = ${total} vs DC ${dc} → ${ok ? "ÉXITO" : "FALLO"}`,
        ]);

        const targetId = next ? String(next) : sceneId;
        const target = scenes[targetId] ?? scene;
        const r = target?.resolve;

        if (!r) {
          if (next) return go(String(next));
          setLog((l) => [...l, "⚠️ Check sin resolve ni next. Reinicio para evitar bloqueo."]);
          return resetRun();
        }

        go(ok ? r.success.next : r.fail.next);
        setLog((l) => [...l, ok ? `✅ ${r.success.text}` : `⚠️ ${r.fail.text}`]);
        return;
      }

      if (opt?.kind === "combat") return doCombat(opt);

      if (opt?.kind === "link" && opt.href) {
        window.location.href = String(opt.href);
        return;
      }

      if (next) return go(String(next));

      setLog((l) => [...l, "⚠️ Opción sin destino. Reinicio para evitar bloqueo."]);
      resetRun();
    } catch (e) {
      console.error("[Simulator] onOption", e);
      setLog((l) => [...l, "⚠️ Error al procesar la opción. Reinicio para evitar bloqueo."]);
      resetRun();
    }
  }

  if (!scene) {
    return (
      <Card>
        <h2 className="font-display text-lg font-bold">Escena no encontrada</h2>
        <p className="mt-2 text-sm text-muted">
          No pude cargar la escena <b>{sceneId}</b>. Suele ser un ID mal escrito en alguna rama.
        </p>
        <div className="mt-4">
          <Button onClick={resetRun}>Volver a empezar</Button>
        </div>
      </Card>
    );
  }

  const isEnding =
    !!scene.end || (scene.options?.length === 1 && scene.options[0]!.next === "choose_theme");

  const showFreeAction = !isEnding && !!scene.options?.length && sceneId !== "choose_theme";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* ------------------------------ Escena ------------------------------ */}
      <div className="space-y-5">
        <Card className="edge-top">
          <h2 className="font-display text-xl font-bold text-primary">{scene.title}</h2>
          <Typewriter
            key={sceneId}
            text={scene.text}
            className="mt-2 text-[15px] leading-relaxed text-text/85"
          />

          {scene.options?.length ? (
            <div className="mt-5 grid gap-2">
              {scene.options.map((o, i) => (
                <Button
                  key={`${sceneId}-${i}`}
                  onClick={() => onOption(o)}
                  variant="ghost"
                  className="justify-start text-left"
                >
                  {o.kind === "check" ? "🎲 " : o.kind === "combat" ? "⚔️ " : ""}
                  {o.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <Button onClick={resetRun}>Volver a empezar</Button>
            </div>
          )}

          {showFreeAction ? (
            <div className="mt-5">
              <FreeAction
                key={`${sceneId}-${freeTurns}`}
                sceneTitle={scene.title}
                sceneText={scene.text}
                theme={THEME_LABEL[theme]}
                history={log.slice(-6)}
                vectorHistory={vectorHistory}
                onResolved={onFreeAction}
              />
            </div>
          ) : null}

          {isEnding ? (
            <div className="mt-5 space-y-4">
              {freeTurns > 0 ? (
                <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Tu perfil de mesa
                  </div>
                  <div className="mt-3">
                    <ProfilePanel
                      vector={profile}
                      archetype={archetype}
                      campaigns={campaigns}
                      confidence={confidence}
                    />
                  </div>
                  {archetype ? (
                    <p className="mt-3 rounded-xl border border-border/60 bg-surface/60 p-3 text-xs text-muted">
                      <span className="font-semibold text-text/85">Para el Master: </span>
                      {archetype.masterTip}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button className="w-full sm:w-auto" onClick={goToSignup} type="button">
                      Postularme con este perfil
                    </Button>
                    <Button variant="ghost" className="w-full sm:w-auto" onClick={resetRun} type="button">
                      🔁 Jugar de nuevo
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={resetRun}>🔁 Volver a empezar</Button>
              )}
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">Registro</div>
          <div className="mt-3 max-h-64 space-y-1 overflow-auto rounded-xl border border-border/60 bg-bg/50 p-3">
            {log.length === 0 ? (
              <div className="text-sm text-muted">Tu historia aparece acá…</div>
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

      {/* ------------------------------ Panel ------------------------------ */}
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Estado</span>
            <span className="font-display text-sm font-bold text-text">❤️ {hp}</span>
          </div>

          {theme !== "none" && Object.keys(stats).length > 0 ? (
            <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted">{k.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-semibold text-text/85">{v}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        {freeTurns > 0 ? (
          <Card>
            <ProfilePanel
              vector={profile}
              archetype={archetype}
              campaigns={campaigns}
              confidence={confidence}
              compact
            />
          </Card>
        ) : (
          <Card>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">Tu perfil</div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Escribí tus propias acciones y el modelo va a ir armando tu perfil de jugador acá.
            </p>
          </Card>
        )}

        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">Ajustes</div>

          <div className="mt-3 space-y-3">
            <AudioPlayer theme={THEME_TO_AUDIO[theme]} />

            <div className="flex items-center justify-between text-xs">
              <span className="text-text/80">Sonido de dados</span>
              <button
                type="button"
                className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold"
                onClick={() => {
                  unlockAudio();
                  setSfxOn((v) => !v);
                }}
              >
                {sfxOn ? "ON" : "OFF"}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-text/80">
                Narración por voz
                {!speechSupported ? <span className="block text-[10px] text-muted">no disponible acá</span> : null}
              </span>
              <button
                type="button"
                disabled={!speechSupported}
                className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                onClick={() => {
                  if (autoNarrate) stopSpeaking();
                  setAutoNarrate((v) => !v);
                }}
              >
                {autoNarrate ? "ON" : "OFF"}
              </button>
            </div>

            {autoNarrate && speechSupported ? (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => speakDramatic(`${scene.title}. ${scene.text}`, { voice })}
              >
                Re-narrar escena
              </Button>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">
            Dado libre
          </div>
          <div className="flex justify-center">
            <Dice3D size={170} onResult={(r: RollResult) => setLog((l) => [...l, `🎲 Tirada libre: ${r.roll}`])} />
          </div>
        </Card>
      </div>
    </div>
  );
}
