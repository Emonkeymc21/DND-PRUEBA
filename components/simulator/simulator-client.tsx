"use client";

import * as React from "react";
import scenesRaw from "@/data/simulator/scenes.es.json";
import { Button, Card } from "@/components/ui";


type StoryStyle = "fantasy" | "scifi" | "anime" | "harry" | "terror";

function styleLabel(style: StoryStyle) {
  switch (style) {
    case "fantasy": return "🗡️ Fantasía";
    case "scifi": return "🚀 Sci‑Fi";
    case "anime": return "⚡ Anime / Shonen";
    case "harry": return "🪄 Mundo mágico";
    case "terror": return "🕯️ Terror";
  }
}

function inferStyleFromSceneId(id: string): StoryStyle | null {
  if (id === "start_fantasy") return "fantasy";
  if (id === "start_scifi") return "scifi";
  if (id === "start_anime") return "anime";
  if (id === "start_harry") return "harry";
  if (id === "start_terror") return "terror";
  return null;
}

function applySkin(text: string, style: StoryStyle | null): string {
  if (!style) return text;
  // Sólo agregamos ambientación, sin tocar mecánicas.
  const prefix = (() => {
    switch (style) {
      case "fantasy":
        return "En un mundo de acero y hechicería, ";
      case "scifi":
        return "En el vacío frío del futuro, ";
      case "anime":
        return "Con la energía al máximo, ";
      case "harry":
        return "Entre pasillos encantados, ";
      case "terror":
        return "Con la oscuridad respirándote en la nuca, ";
    }
  })();
  return prefix + text;
}
type RawSceneOption = {
  label: string;
  kind?: "check" | "combat" | "link";
  // some older JSONs used href instead of next
  next?: string;
  href?: string;
  // check
  dc?: number;
  ability?: string;
  skill?: string;
  // combat
  playerAttackMod?: number;
  advantage?: boolean;
};

type RawScene = {
  title: string;
  text: string;
  narrate?: boolean;
  summary?: string; // allowed in JSON
  options?: RawSceneOption[];
  resolve?: {
    success: { next: string; text: string };
    fail: { next: string; text: string };
  };
};

type SceneOption =
  | { label: string; next: string }
  | { label: string; next: string; kind: "check"; dc: number; ability: string; skill: string }
  | { label: string; next: string; kind: "combat"; playerAttackMod: number; advantage?: boolean }
  | { label: string; kind: "link"; href: string; next?: string };

type Scene = {
  title: string;
  text: string;
  narrate?: boolean;
  summary?: string;
  options?: SceneOption[];
  resolve?: {
    success: { next: string; text: string };
    fail: { next: string; text: string };
  };
};

function normalizeScenes(raw: unknown): Record<string, Scene> {
  const obj = (raw ?? {}) as Record<string, RawScene>;
  const out: Record<string, Scene> = {};

  for (const [id, scene] of Object.entries(obj)) {
    const options: SceneOption[] | undefined = scene.options?.map((o) => {
      const kind = o.kind;
      const next = o.next ?? (o.href && !/^https?:\/\//.test(o.href) && !o.href.startsWith("/") ? o.href : undefined);

      if (kind === "check") {
        return {
          label: o.label,
          kind: "check",
          next: next ?? "fin",
          dc: Number(o.dc ?? 12),
          ability: String(o.ability ?? "DEX"),
          skill: String(o.skill ?? "Engaño"),
        };
      }

      if (kind === "combat") {
        return {
          label: o.label,
          kind: "combat",
          next: next ?? "fin",
          playerAttackMod: Number(o.playerAttackMod ?? 4),
          advantage: o.advantage,
        };
      }

      if (kind === "link") {
        // link can either be external/internal URL, or legacy scene id in href
        return {
          label: o.label,
          kind: "link",
          href: String(o.href ?? "/"),
          next,
        };
      }

      // default: plain next transition
      return { label: o.label, next: next ?? "fin" };
    });

    out[id] = {
      title: String(scene.title ?? id),
      text: String(scene.text ?? ""),
      narrate: scene.narrate,
      summary: scene.summary,
      options,
      resolve: scene.resolve,
    };
  }

  return out;
}

const scenes = normalizeScenes(scenesRaw);

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function pickEpicSpanishVoice(voices: SpeechSynthesisVoice[]) {
  // Preferimos una voz española/latam "natural" si existe.
  const es = voices.filter(v => (v.lang || "").toLowerCase().startsWith("es"));
  const preferred = es.find(v => /google|natural|premium/i.test(v.name)) || es.find(v => /microsoft/i.test(v.name)) || es[0];
  return preferred;
}

function speak(text: string, rate: number, voice?: SpeechSynthesisVoice) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = (voice?.lang || "es-ES");
  u.rate = rate;
  if (voice) u.voice = voice;

  window.speechSynthesis.speak(u);
}

export default function SimulatorClient() {

  const [sceneId, setSceneId] = React.useState("start");
  const [storyStyle, setStoryStyle] = React.useState<StoryStyle | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const [autoNarrate, setAutoNarrate] = React.useState(true);
  const [rate, setRate] = React.useState(1.0);
  const [voice, setVoice] = React.useState<SpeechSynthesisVoice | undefined>(undefined);
  const [hp, setHp] = React.useState(12);
  const [enemyHp, setEnemyHp] = React.useState(16);

  const scene = scenes[sceneId];

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const load = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoice(pickEpicSpanishVoice(vs));
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  React.useEffect(() => {
    if (!autoNarrate) return;
    if (scene?.narrate) speak(`${scene.title}. ${scene.text}`, rate, voice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, autoNarrate, rate, voice]);

  function resetCombat() {
    setHp(12);
    setEnemyHp(16);
  }

  function go(next: string) {
    setSceneId(next);
    const s = scenes[next];
    if (next === "start") {
      setLog([]);
      resetCombat();
    }
    if (s?.title) setLog((l) => [...l, `➡️ ${s.title}`]);
  }

  function resolveCheckTo(checkSceneId: string | null, dc: number, label: string) {
    const roll = rollD20();
    const mod = 2; // demo: modificador fijo
    const total = roll + mod;
    const ok = total >= dc;

    setLog((l) => [...l, `🎲 ${label}: tiraste ${roll} + ${mod} = ${total} vs DC ${dc} → ${ok ? "Éxito" : "Fallo"}`]);

    const target = checkSceneId && scenes[checkSceneId] ? scenes[checkSceneId] : scene;

    if (checkSceneId && scenes[checkSceneId]) setSceneId(checkSceneId);

    const r = target?.resolve;
    if (!r) {
      setLog((l) => [...l, "⚠️ Falta resolución para esta tirada. Continúo para evitar bloqueo."]);
      go("combat");
      return;
    }
    go(ok ? r.success.next : r.fail.next);
    setLog((l) => [...l, ok ? `✅ ${r.success.text}` : `⚠️ ${r.fail.text}`]);
  }

  function doCombat(playerAttackMod: number, advantage?: boolean) {
    // Simplificado:
    // - vos atacás: d20 + mod vs AC 12; si pega: 1d8+3
    // - enemigo ataca: d20 + 3 vs tu AC 12; si pega: 1d6+1
    const playerRollA = rollD20();
    const playerRollB = rollD20();
    const playerRoll = advantage ? Math.max(playerRollA, playerRollB) : playerRollA;
    const playerHit = playerRoll + playerAttackMod >= 12;

    let newEnemy = enemyHp;
    let newHp = hp;

    if (playerHit) {
      const dmg = (Math.floor(Math.random() * 8) + 1) + 3;
      newEnemy -= dmg;
      setLog((l) => [...l, `⚔️ Tu ataque: ${advantage ? `(${playerRollA}, ${playerRollB}) ⇒ ` : ""}${playerRoll}+${playerAttackMod} → PEGÁS. Daño ${dmg}.`]);
    } else {
      setLog((l) => [...l, `⚔️ Tu ataque: ${advantage ? `(${playerRollA}, ${playerRollB}) ⇒ ` : ""}${playerRoll}+${playerAttackMod} → FALLÁS.`]);
    }

    if (newEnemy <= 0) {
      setEnemyHp(0);
      go("combat_end");
      return;
    }

    const eRoll = rollD20();
    const eHit = eRoll + 3 >= 12;
    if (eHit) {
      const dmg = (Math.floor(Math.random() * 6) + 1) + 1;
      newHp -= dmg;
      setLog((l) => [...l, `🩸 Enemigo: ${eRoll}+3 → te pega. Daño ${dmg}.`]);
    } else {
      setLog((l) => [...l, `🛡️ Enemigo: ${eRoll}+3 → falla.`]);
    }

    if (newHp <= 0) {
      setHp(0);
      setLog((l) => [...l, "💀 Caíste. Reiniciá y probá otra ruta."]);
      go("start");
      return;
    }

    setEnemyHp(newEnemy);
    setHp(newHp);
  }

  function onOption(opt: any) {
  try {
    const next = opt?.next ?? opt?.goto;

    if (opt?.kind === "check") {
      return resolveCheckTo(next ? String(next) : null, Number(opt.dc ?? 12), `${opt.skill ?? "Chequeo"} (${opt.ability ?? ""})`.trim());
    }

    if (opt?.kind === "combat" || opt?.kind === "battle") {
      return doCombat(Number(opt.playerAttackMod ?? 4), opt.advantage);
    }

    if (opt?.kind === "link") {
      window.location.href = String(opt.href ?? "/");
      return;
    }

    if (next) return go(String(next));

    setLog((l) => [...l, "⚠️ Opción sin destino. Reinicio para evitar bloqueo."]);
    go("start");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[Simulator] onOption", e);
    setLog((l) => [...l, "⚠️ Error al procesar la opción. Reinicio para evitar bloqueo."]);
    go("start");
  }
}


  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">{scene.title}</h2>
            <p className="text-sm text-text/80">Demo interactiva (reglas + plantillas). Narración gratis con SpeechSynthesis.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoNarrate} onChange={(e) => setAutoNarrate(e.target.checked)} />
              Auto narrar
            </label>
            <label className="flex items-center gap-2 text-sm">
              Velocidad
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.05}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <p className="rounded-xl border border-border/60 bg-black/30 p-4 text-lg leading-relaxed">{applySkin(scene.text, storyStyle)}</p>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => speak(`${scene.title}. ${scene.text}`, rate, voice)}
            type="button"
            variant="ghost"
          >
            🔊 Escuchar narración
          </Button>
          <Button
            onClick={() => { setLog([]); setSceneId("start"); resetCombat(); }}
            type="button"
            variant="ghost"
          >
            ♻️ Reiniciar
          </Button>
        </div>

        {(sceneId === "combat" || sceneId.startsWith("ambush")) && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-black/25 p-3">
              <div className="text-sm text-text/80">Tu HP</div>
              <div className="text-2xl font-extrabold text-primary">{hp}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-black/25 p-3">
              <div className="text-sm text-text/80">HP Enemigos</div>
              <div className="text-2xl font-extrabold text-primary">{enemyHp}</div>
            </div>
          </div>
        )}

        <div className="grid gap-2 md:grid-cols-2">
          {(scene.options ?? []).map((opt, i) => (
            <Button key={i} onClick={() => onOption(opt)} type="button" className="justify-start">
              {opt.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-primary">Registro de mesa</h3>
        <div className="mt-3 max-h-64 space-y-1 overflow-auto rounded-xl border border-border/60 bg-black/25 p-3 text-sm">
          {log.length === 0 ? (
            <div className="text-text/60">Tu historia aparece acá…</div>
          ) : (
            log.map((l, idx) => <div key={idx}>{l}</div>)
          )}
        </div>
      </Card>
    </div>
  );
}
