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

type PendingCheck = { label: string; dc: number; mod: number } | null;

export default function SimulatorClient() {
  const [sceneId, setSceneId] = React.useState("start");
  const [log, setLog] = React.useState<string[]>([]);
  const [autoNarrate, setAutoNarrate] = React.useState(true);
  const [rate, setRate] = React.useState(1.0);
  const [voiceURI, setVoiceURI] = React.useState<string | undefined>(undefined);
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [hp, setHp] = React.useState(12);
  const [enemyHp, setEnemyHp] = React.useState(16);
  const [pendingCheck, setPendingCheck] = React.useState<PendingCheck>(null);

  const lastResolved = React.useRef<string | null>(null);

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
      setPendingCheck(null);
      lastResolved.current = null;
    }
    if (s?.title) setLog((l) => [...l, `➡️ ${s.title}`]);
  }

  function resolveCheckNow(p: PendingCheck) {
    if (!p) return;
    const roll = rollD20();
    const total = roll + p.mod;
    const ok = total >= p.dc;

    setLog((l) => [
      ...l,
      `🎲 ${p.label}: tiraste ${roll} + ${p.mod} = ${total} vs DC ${p.dc} → ${ok ? "Éxito" : "Fallo"}`
    ]);

    const r = scene.resolve;
    if (!r) return;
    go(ok ? r.success.next : r.fail.next);
    setLog((l) => [...l, ok ? `✅ ${r.success.text}` : `⚠️ ${r.fail.text}`]);

    setPendingCheck(null);
  }

  // Auto-resolver escenas con "resolve" (para que la historia siempre avance)
  React.useEffect(() => {
    if (!scene?.resolve) return;
    if (!pendingCheck) return; // necesitamos datos de DC/label
    if (lastResolved.current === sceneId) return; // evitar reroll infinito
    lastResolved.current = sceneId;

    // micro delay para que se vea el texto de la escena de tirada
    const t = window.setTimeout(() => resolveCheckNow(pendingCheck), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  function doCombat(playerAttackMod: number, advantage?: boolean) {
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
    if ("kind" in opt && opt.kind === "check") {
      // Paso 1: ir a la escena de tirada (opt.next) y guardar la DC/label para resolver ahí.
      setPendingCheck({ label: `${opt.skill} (${opt.ability})`, dc: opt.dc, mod: 2 });
      go(opt.next);
      return;
    }
    if ("kind" in opt && opt.kind === "combat") return doCombat(opt.playerAttackMod, opt.advantage);
    if ("kind" in opt && opt.kind === "link") {
      window.location.href = opt.href;
      return;
    }
    go(opt.next);
  }

  const showCombatBars =
    (scene.options ?? []).some(o => ("kind" in o && o.kind === "combat")) ||
    sceneId.toLowerCase().includes("ambush");

  const showResolveHint = !!scene.resolve;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">{scene.title}</h2>
            <p className="text-sm text-text/80">
              Tutorial interactivo en español. La historia avanza con decisiones + tiradas + consecuencias.
            </p>
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
                min={0.85}
                max={1.25}
                step={0.05}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
            </label>
            <select
              className="rounded-md border border-border/60 bg-bg px-2 py-2 text-sm"
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
            onClick={() => { setLog([]); setSceneId("start"); resetCombat(); setPendingCheck(null); lastResolved.current = null; }}
            type="button"
            variant="ghost"
          >
            ♻️ Reiniciar
          </Button>
        </div>

        {showResolveHint && (
          <div className="rounded-xl border border-border/60 bg-black/20 p-3 text-sm text-text/75">
            <b className="text-primary">Tirada en curso:</b> el sistema está resolviendo la escena y te lleva a la consecuencia automáticamente.
          </div>
        )}

        {showCombatBars && (
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
