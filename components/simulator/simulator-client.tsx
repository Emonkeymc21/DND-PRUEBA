"use client";

import * as React from "react";
import scenesRaw from "@/data/simulator/scenes.es.json";
import { Button, Card } from "@/components/ui";

type SceneOption =
  | { label: string; next: string }
  | { label: string; next: string; kind: "check"; dc: number; ability: string; skill: string }
  | { label: string; next: string; kind: "combat"; playerAttackMod: number; advantage?: boolean }
  | { label: string; next: string; kind: "link"; href: string };

type Scene = {
  title: string;
  text: string;
  narrate?: boolean;
  options?: SceneOption[];
  resolve?: {
    success: { next: string; text: string };
    fail: { next: string; text: string };
  };
};

const scenes = scenesRaw as Record<string, Scene>;

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function speak(text: string, rate: number, voiceURI?: string) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-AR";
  u.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  if (voiceURI) {
    const v = voices.find(v => v.voiceURI === voiceURI);
    if (v) u.voice = v;
  }
  window.speechSynthesis.speak(u);
}

export default function SimulatorClient() {
  const [sceneId, setSceneId] = React.useState("start");
  const [log, setLog] = React.useState<string[]>([]);
  const [autoNarrate, setAutoNarrate] = React.useState(true);
  const [rate, setRate] = React.useState(1.0);
  const [voiceURI, setVoiceURI] = React.useState<string | undefined>(undefined);
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [hp, setHp] = React.useState(12);
  const [enemyHp, setEnemyHp] = React.useState(16);

  const scene = scenes[sceneId];

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  React.useEffect(() => {
    if (!autoNarrate) return;
    if (scene?.narrate) speak(`${scene.title}. ${scene.text}`, rate, voiceURI);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, autoNarrate, rate, voiceURI]);

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

  function resolveCheck(nextId: string, dc: number, label: string) {
    const roll = rollD20();
    const mod = 2; // demo: modificador fijo
    const total = roll + mod;
    const ok = total >= dc;

    setSceneId(nextId);

    setLog((l) => [
      ...l,
      `🎲 ${label}: tiraste ${roll} + ${mod} = ${total} vs DC ${dc} → ${ok ? "Éxito" : "Fallo"}`
    ]);

    const target = scenes[nextId];
    const r = target?.resolve;

    window.setTimeout(() => {
      if (!r) {
        go("start");
        setLog((l) => [...l, "⚠️ Faltó la resolución de esta tirada. Reinicié la demo para evitar un bloqueo."]);
        return;
      }
      go(ok ? r.success.next : r.fail.next);
      setLog((l) => [...l, ok ? `✅ ${r.success.text}` : `⚠️ ${r.fail.text}`]);
    }, 450);
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

  function onOption(opt: SceneOption) {
    if ("kind" in opt && opt.kind === "check") return resolveCheck(opt.next, opt.dc, `${opt.skill} (${opt.ability})`);
    if ("kind" in opt && opt.kind === "combat") return doCombat(opt.playerAttackMod, opt.advantage);
    if ("kind" in opt && opt.kind === "link") {
      window.location.href = opt.href;
      return;
    }
    go(opt.next);
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
            <select
              className="rounded-md border border-border/60 bg-bg px-2 py-1 text-sm"
              value={voiceURI ?? ""}
              onChange={(e) => setVoiceURI(e.target.value || undefined)}
              aria-label="Voz"
            >
              <option value="">Voz (default)</option>
              {voices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        </div>

        <p className="rounded-xl border border-border/60 bg-black/30 p-4 text-lg leading-relaxed">
          {scene.text}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => speak(`${scene.title}. ${scene.text}`, rate, voiceURI)}
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
