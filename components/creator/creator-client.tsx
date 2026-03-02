"use client";

import * as React from "react";
import { z } from "zod";
import { Button, Card } from "@/components/ui";
import { safeString } from "@/lib/utils";

type Choice = { index: string; name: string; url: string };

type Character = {
  name: string;
  concept: string;
  race?: Choice;
  class?: Choice;
  background?: Choice;
  abilities: Record<"STR"|"DEX"|"CON"|"INT"|"WIS"|"CHA", number>;
  skills: string[];
  equipment: string[];
  spells: string[];
};

const AbilityKeys = ["STR","DEX","CON","INT","WIS","CHA"] as const;


const CLASS_ES: Record<string,string> = {
  barbarian: "Bárbaro",
  bard: "Bardo",
  cleric: "Clérigo",
  druid: "Druida",
  fighter: "Guerrero",
  monk: "Monje",
  paladin: "Paladín",
  ranger: "Explorador",
  rogue: "Pícaro",
  sorcerer: "Hechicero",
  warlock: "Brujo",
  wizard: "Mago",
};

const BACKGROUND_ES: Record<string,string> = {
  acolyte: "Acólito",
  charlatan: "Charlatán",
  criminal: "Criminal",
  entertainer: "Artista/Entretenedor",
  folk_hero: "Héroe del pueblo",
  guild_artisan: "Artesano de gremio",
  hermit: "Ermitaño",
  noble: "Noble",
  outlander: "Forastero",
  sage: "Sabio",
  sailor: "Marinero",
  soldier: "Soldado",
  urchin: "Huérfano de la calle",
};

const SKILL_ES: Record<string,string> = {
  "Acrobatics": "Acrobacias",
  "Animal Handling": "Trato con animales",
  "Arcana": "Arcana",
  "Athletics": "Atletismo",
  "Deception": "Engaño",
  "History": "Historia",
  "Insight": "Perspicacia",
  "Intimidation": "Intimidación",
  "Investigation": "Investigación",
  "Medicine": "Medicina",
  "Nature": "Naturaleza",
  "Perception": "Percepción",
  "Performance": "Interpretación",
  "Persuasion": "Persuasión",
  "Religion": "Religión",
  "Sleight of Hand": "Juego de manos",
  "Stealth": "Sigilo",
  "Survival": "Supervivencia",
};

function displayChoice(c?: Choice, kind?: "class"|"background"|"skill") {
  if (!c) return "";
  if (kind === "class") return CLASS_ES[c.index] ?? c.name;
  if (kind === "background") return BACKGROUND_ES[c.index] ?? c.name;
  if (kind === "skill") return SKILL_ES[c.name] ?? c.name;
  return c.name;
}


function roll4d6DropLowest() {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1).sort((a,b)=>a-b);
  return rolls.slice(1).reduce((a,b)=>a+b,0);
}

function pointBuyBase(): Character["abilities"] {
  return { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
}

export default function CreatorClient() {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [races, setRaces] = React.useState<Choice[]>([]);
  const [classes, setClasses] = React.useState<Choice[]>([]);
  const [backgrounds, setBackgrounds] = React.useState<Choice[]>([]);
  const [skills, setSkills] = React.useState<Choice[]>([]);
  const [spells, setSpells] = React.useState<Choice[]>([]);

  const [char, setChar] = React.useState<Character>({
    name: "",
    concept: "",
    abilities: pointBuyBase(),
    skills: [],
    equipment: [],
    spells: []
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/srd/bootstrap");
      if (!res.ok) throw new Error("No se pudo cargar SRD");
      const data = await res.json();
      setRaces(data.races);
      setClasses(data.classes);
      setBackgrounds(data.backgrounds);
      setSkills(data.skills);
      setSpells(data.spells);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, []);

  function next() { setStep((s) => Math.min(8, s + 1)); }
  function prev() { setStep((s) => Math.max(1, s - 1)); }

  function update<K extends keyof Character>(key: K, value: Character[K]) {
    setChar((c) => ({ ...c, [key]: value }));
  }

  function toggleSkill(name: string) {
    setChar((c) => {
      const set = new Set(c.skills);
      if (set.has(name)) set.delete(name);
      else if (set.size < 4) set.add(name);
      return { ...c, skills: Array.from(set) };
    });
  }

  function toggleSpell(name: string) {
    setChar((c) => {
      const set = new Set(c.spells);
      if (set.has(name)) set.delete(name);
      else if (set.size < 3) set.add(name);
      return { ...c, spells: Array.from(set) };
    });
  }

  function doRollAbilities() {
    const vals = AbilityKeys.map(() => roll4d6DropLowest()).sort((a,b)=>b-a);
    const out: any = {};
    AbilityKeys.forEach((k, i) => out[k] = vals[i] ?? 10);
    update("abilities", out);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(char, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personaje-${(char.name || "dnd").toLowerCase().replace(/\s+/g,"-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printSheet() {
    window.print();
  }

  const canNext = step === 1 ? (char.name.trim().length >= 2) : true;

  return (
    <div className="space-y-4">
      {loading && (
        <Card>
          <div className="text-text/80">Cargando SRD…</div>
        </Card>
      )}

      <Card className="print:shadow-none print:border-none print:bg-white print:text-black">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-primary print:text-black">Creador rápido (SRD)</h2>
          <div className="text-sm text-text/70">Paso {step} / 8</div>
        </div>

        {step === 1 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 font-semibold text-primary">Nombre</div>
              <input className="w-full rounded-md border border-border/60 bg-bg px-3 py-2" value={char.name} onChange={(e)=>update("name", e.target.value)} />
            </label>
            <label className="text-sm">
              <div className="mb-1 font-semibold text-primary">Concepto (1 línea)</div>
              <input className="w-full rounded-md border border-border/60 bg-bg px-3 py-2" value={char.concept} onChange={(e)=>update("concept", e.target.value)} placeholder="Ej: Pícaro carismático que busca redención" />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {races.map(r => (
              <button key={r.index} className={`rounded-xl border p-3 text-left transition ${char.race?.index===r.index ? "border-primary bg-black/30" : "border-border/60 hover:border-primary/70"}`}
                onClick={() => update("race", r)} type="button">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-text/70">{r.index}</div>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {classes.map(c => (
              <button key={c.index} className={`rounded-xl border p-3 text-left transition ${char.class?.index===c.index ? "border-primary bg-black/30" : "border-border/60 hover:border-primary/70"}`}
                onClick={() => update("class", c)} type="button">
                <div className="font-semibold">{displayChoice(c,"class")}</div>
                <div className="text-xs text-text/70">{c.index}</div>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {backgrounds.map(b => (
              <button key={b.index} className={`rounded-xl border p-3 text-left transition ${char.background?.index===b.index ? "border-primary bg-black/30" : "border-border/60 hover:border-primary/70"}`}
                onClick={() => update("background", b)} type="button">
                <div className="font-semibold">{displayChoice(b,"background")}</div>
                <div className="text-xs text-text/70">{b.index}</div>
              </button>
            ))}
            <div className="text-xs text-text/70 md:col-span-2">
              Nota: “Backgrounds” en SRD puede ser limitado. Si tu API no trae, el wizard sigue funcionando.
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => update("abilities", pointBuyBase())}>Point buy (base)</Button>
              <Button type="button" onClick={doRollAbilities}>🎲 Tirar atributos (4d6 drop)</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {AbilityKeys.map(k => (
                <label key={k} className="text-sm">
                  <div className="mb-1 font-semibold text-primary">{k}</div>
                  <input
                    type="number"
                    min={3}
                    max={18}
                    className="w-full rounded-md border border-border/60 bg-bg px-3 py-2"
                    value={char.abilities[k]}
                    onChange={(e)=>update("abilities", { ...char.abilities, [k]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="mt-4">
            <p className="text-sm text-text/80">Elegí hasta 4 skills.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {skills.map(s => {
                const active = char.skills.includes(s.name);
                return (
                  <button key={s.index} type="button"
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${active ? "border-primary bg-black/30" : "border-border/60 hover:border-primary/70"}`}
                    onClick={() => toggleSkill(s.name)}
                  >
                    {displayChoice(s,"skill")}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="mt-4">
            <p className="text-sm text-text/80">Elegí hasta 3 hechizos (opcional). La lista es SRD.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {spells.slice(0, 40).map(s => {
                const active = char.spells.includes(s.name);
                return (
                  <button key={s.index} type="button"
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${active ? "border-primary bg-black/30" : "border-border/60 hover:border-primary/70"}`}
                    onClick={() => toggleSpell(s.name)}
                  >
                    {displayChoice(s,"skill")}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-text/70">Mostrando 40 para performance. Podés ampliar en el código.</div>
          </div>
        )}

        {step === 8 && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/60 bg-black/25 p-4">
              <div className="text-2xl font-extrabold text-primary print:text-black">{char.name || "Personaje"}</div>
              <div className="text-sm text-text/75 print:text-black">{char.concept || "—"}</div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div><b className="text-primary print:text-black">Raza:</b> {char.race?.name ?? "—"}</div>
                <div><b className="text-primary print:text-black">Clase:</b> {char.class?.name ?? "—"}</div>
                <div><b className="text-primary print:text-black">Trasfondo:</b> {char.background?.name ?? "—"}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-black/25 p-4">
                <div className="font-bold text-primary print:text-black">Atributos</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  {AbilityKeys.map(k => (
                    <div key={k} className="rounded-lg border border-border/60 bg-bg/50 p-2 print:bg-white print:text-black">
                      <div className="text-xs text-text/70 print:text-black">{k}</div>
                      <div className="text-xl font-extrabold">{char.abilities[k]}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-black/25 p-4">
                <div className="font-bold text-primary print:text-black">Skills</div>
                <div className="mt-2 text-sm">{char.skills.length ? char.skills.join(", ") : "—"}</div>

                <div className="mt-4 font-bold text-primary print:text-black">Hechizos</div>
                <div className="mt-2 text-sm">{char.spells.length ? char.spells.join(", ") : "—"}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <Button type="button" onClick={exportJSON}>⬇️ Exportar JSON</Button>
              <Button type="button" variant="ghost" onClick={printSheet}>🖨️ Imprimir / PDF</Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 print:hidden">
          <Button type="button" variant="ghost" onClick={prev} disabled={step === 1}>← Atrás</Button>
          <Button type="button" onClick={next} disabled={!canNext || step === 8}>Siguiente →</Button>
        </div>
      </Card>

      <Card className="text-sm text-text/80">
        <div className="font-bold text-primary">Notas</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Los datos vienen de una API pública SRD, y la app funciona sin API keys.</li>
          <li>Si querés un modo “con IA”, podés agregarlo como opcional via variables de entorno (documentado en README).</li>
        </ul>
      </Card>
    </div>
  );
}
