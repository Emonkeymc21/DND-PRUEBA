"use client";

import * as React from "react";
import { Card, Badge } from "@/components/ui";
import { D20 } from "@/components/dice/d20";

/**
 * Bestiario en vivo del SRD 5.1, vía nuestro proxy cacheado (/api/dnd5e).
 *
 * La lista completa son ~330 monstruos y llega en un solo request liviano
 * (sólo index + name). El detalle se pide recién al abrir uno, así que la
 * página carga instantánea aunque estés con datos móviles.
 */

type ListItem = { index: string; name: string };

type MonsterAction = {
  name: string;
  desc: string;
  attack_bonus?: number;
};

type Monster = {
  index: string;
  name: string;
  size?: string;
  type?: string;
  alignment?: string;
  armor_class?: Array<{ value: number; type?: string }> | number;
  hit_points?: number;
  hit_dice?: string;
  challenge_rating?: number;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  actions?: MonsterAction[];
  speed?: Record<string, string>;
};

function armorClass(m: Monster): number | null {
  if (typeof m.armor_class === "number") return m.armor_class;
  if (Array.isArray(m.armor_class) && m.armor_class[0]) return m.armor_class[0].value;
  return null;
}

/** Traducción de los tipos más comunes: la API viene sólo en inglés. */
const TYPE_ES: Record<string, string> = {
  aberration: "aberración",
  beast: "bestia",
  celestial: "celestial",
  construct: "constructo",
  dragon: "dragón",
  elemental: "elemental",
  fey: "feérico",
  fiend: "diablo",
  giant: "gigante",
  humanoid: "humanoide",
  monstrosity: "monstruosidad",
  ooze: "cieno",
  plant: "planta",
  undead: "no-muerto",
};

function Stat({ label, value }: { label: string; value: number | undefined }) {
  if (typeof value !== "number") return null;
  const mod = Math.floor((value - 10) / 2);
  return (
    <div className="rounded-xl border border-border/60 bg-surface/60 px-2 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="font-display text-base font-bold text-text">{value}</div>
      <div className="text-[11px] text-primary">
        {mod >= 0 ? "+" : ""}
        {mod}
      </div>
    </div>
  );
}

export default function BestiaryClient() {
  const [list, setList] = React.useState<ListItem[]>([]);
  const [q, setQ] = React.useState("");
  const [loadingList, setLoadingList] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Monster | null>(null);
  const [loadingOne, setLoadingOne] = React.useState(false);

  // Caché en memoria: si volvés a abrir el mismo monstruo, no se vuelve a pedir.
  const cache = React.useRef<Map<string, Monster>>(new Map());

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/dnd5e?resource=monsters");
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as { results?: ListItem[] };
        if (!cancelled) setList(data.results ?? []);
      } catch {
        if (!cancelled) setListError("No pude cargar el bestiario. Probá recargar en un rato.");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function open(index: string) {
    const hit = cache.current.get(index);
    if (hit) {
      setSelected(hit);
      return;
    }

    setLoadingOne(true);
    try {
      const res = await fetch(`/api/dnd5e?resource=monsters&index=${encodeURIComponent(index)}`);
      if (!res.ok) throw new Error("bad response");
      const data = (await res.json()) as Monster;
      cache.current.set(index, data);
      setSelected(data);
    } catch {
      setSelected(null);
    } finally {
      setLoadingOne(false);
    }
  }

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle ? list.filter((m) => m.name.toLowerCase().includes(needle)) : list;
    return base.slice(0, 60);
  }, [list, q]);

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      {/* Lista */}
      <div className="space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar monstruo (en inglés)…"
          className="w-full rounded-xl border border-border/70 bg-surface/80 px-4 py-3 text-base text-text outline-none transition placeholder:text-muted/60 focus:border-primary/70"
        />

        {loadingList ? (
          <div className="space-y-2" aria-label="Cargando bestiario">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-surface/70" />
            ))}
          </div>
        ) : listError ? (
          <Card className="border-ember/50 bg-ember/10 text-sm">{listError}</Card>
        ) : (
          <>
            <div className="text-xs text-muted">
              {filtered.length} de {list.length} criaturas
            </div>
            <div className="max-h-[32rem] space-y-1.5 overflow-auto pr-1">
              {filtered.map((m) => (
                <button
                  key={m.index}
                  type="button"
                  onClick={() => void open(m.index)}
                  className={[
                    "w-full rounded-xl border px-4 py-2.5 text-left text-sm transition",
                    selected?.index === m.index
                      ? "border-primary/70 bg-primary/10 text-primary"
                      : "border-border/60 bg-surface/50 text-text/85 hover:border-primary/50 hover:text-primary",
                  ].join(" ")}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detalle */}
      <div>
        {loadingOne ? (
          <Card className="animate-pulse">
            <div className="h-6 w-1/3 rounded bg-surface" />
            <div className="mt-3 h-4 w-1/2 rounded bg-surface" />
            <div className="mt-6 grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-surface" />
              ))}
            </div>
          </Card>
        ) : selected ? (
          <Card className="edge-top space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-primary">{selected.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {selected.size ? `${selected.size} · ` : ""}
                {selected.type ? (TYPE_ES[selected.type] ?? selected.type) : ""}
                {selected.alignment ? ` · ${selected.alignment}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {armorClass(selected) !== null ? <Badge>🛡️ CA {armorClass(selected)}</Badge> : null}
              {selected.hit_points ? (
                <Badge>
                  ❤️ {selected.hit_points} PG{selected.hit_dice ? ` (${selected.hit_dice})` : ""}
                </Badge>
              ) : null}
              {selected.challenge_rating !== undefined ? <Badge>⚔️ VD {selected.challenge_rating}</Badge> : null}
              {selected.speed?.walk ? <Badge>👣 {selected.speed.walk}</Badge> : null}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <Stat label="FUE" value={selected.strength} />
              <Stat label="DES" value={selected.dexterity} />
              <Stat label="CON" value={selected.constitution} />
              <Stat label="INT" value={selected.intelligence} />
              <Stat label="SAB" value={selected.wisdom} />
              <Stat label="CAR" value={selected.charisma} />
            </div>

            {selected.actions?.length ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-primary">Acciones</div>
                {selected.actions.slice(0, 6).map((a) => (
                  <div key={a.name} className="rounded-xl border border-border/60 bg-surface/50 p-4">
                    <div className="text-sm font-bold text-text">{a.name}</div>
                    <p className="mt-1 text-sm leading-relaxed text-text/75">{a.desc}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Tirada de ataque real contra la CA de esta criatura */}
            {armorClass(selected) !== null ? (
              <div className="rounded-2xl border border-border/70 bg-surface/40 p-5">
                <div className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-primary">
                  Probá tu suerte contra {selected.name}
                </div>
                <D20
                  key={selected.index}
                  dc={armorClass(selected)!}
                  mod={5}
                  label={`Atacar (CA ${armorClass(selected)})`}
                />
              </div>
            ) : null}
          </Card>
        ) : (
          <Card className="grid min-h-[16rem] place-items-center text-center">
            <div>
              <div className="text-4xl">🐉</div>
              <p className="mt-3 text-sm text-muted">
                Elegí una criatura de la lista para ver sus estadísticas.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
