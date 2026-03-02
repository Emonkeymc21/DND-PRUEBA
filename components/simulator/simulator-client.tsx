"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";

type Choice = {
  label: string;
  next: string;
};

type Scene = {
  id: string;
  text: string;
  choices: Choice[];
  end?: boolean;
};

type StoryMap = Record<string, Scene>;

const fantasy: StoryMap = {
  intro: {
    id: "intro",
    text: "Un dragón ha despertado en las montañas. El reino tiembla.",
    choices: [
      { label: "Ir al castillo", next: "castle" },
      { label: "Buscar al mago antiguo", next: "wizard" },
    ],
  },
  castle: {
    id: "castle",
    text: "El rey te pide ayuda. Promete gloria eterna.",
    choices: [
      { label: "Aceptar la misión", next: "dragon" },
      { label: "Rechazar y huir", next: "exile" },
    ],
  },
  wizard: {
    id: "wizard",
    text: "El mago te ofrece poder oscuro.",
    choices: [
      { label: "Aceptar poder", next: "dark_end" },
      { label: "Rechazar", next: "dragon" },
    ],
  },
  dragon: {
    id: "dragon",
    text: "El dragón ruge frente a ti.",
    choices: [{ label: "Combatir", next: "hero_end" }],
  },
  hero_end: {
    id: "hero_end",
    text: "Derrotaste al dragón. Eres leyenda.",
    choices: [],
    end: true,
  },
  dark_end: {
    id: "dark_end",
    text: "El poder te consume. Te conviertes en señor oscuro.",
    choices: [],
    end: true,
  },
  exile: {
    id: "exile",
    text: "Huyes. El reino cae sin ti.",
    choices: [],
    end: true,
  },
};

const scifi: StoryMap = {
  intro: {
    id: "intro",
    text: "La nave interestelar recibe una señal desconocida.",
    choices: [
      { label: "Investigar señal", next: "signal" },
      { label: "Ignorar", next: "escape" },
    ],
  },
  signal: {
    id: "signal",
    text: "Una IA despierta.",
    choices: [{ label: "Desconectarla", next: "ai_end" }],
  },
  escape: {
    id: "escape",
    text: "Saltás al hiperespacio. Algo te sigue.",
    choices: [{ label: "Enfrentar amenaza", next: "space_end" }],
  },
  ai_end: {
    id: "ai_end",
    text: "La IA toma control del universo digital.",
    choices: [],
    end: true,
  },
  space_end: {
    id: "space_end",
    text: "Te pierdes en el vacío eterno.",
    choices: [],
    end: true,
  },
};

const anime: StoryMap = {
  intro: {
    id: "intro",
    text: "El torneo comienza. Tu rival sonríe.",
    choices: [
      { label: "Atacar primero", next: "fight" },
      { label: "Esperar y analizar", next: "focus" },
    ],
  },
  fight: {
    id: "fight",
    text: "Desatas tu técnica secreta.",
    choices: [],
    end: true,
  },
  focus: {
    id: "focus",
    text: "Tu aura se expande. Despiertas poder oculto.",
    choices: [],
    end: true,
  },
};

const magic: StoryMap = {
  intro: {
    id: "intro",
    text: "El sombrero seleccionador susurra tu destino.",
    choices: [
      { label: "Aceptar casa", next: "school" },
      { label: "Resistir", next: "dark" },
    ],
  },
  school: {
    id: "school",
    text: "Aprendes un hechizo prohibido.",
    choices: [],
    end: true,
  },
  dark: {
    id: "dark",
    text: "Una reliquia oscura te elige.",
    choices: [],
    end: true,
  },
};

const horror: StoryMap = {
  intro: {
    id: "intro",
    text: "La casa cruje en la noche.",
    choices: [
      { label: "Explorar sótano", next: "basement" },
      { label: "Salir corriendo", next: "escape" },
    ],
  },
  basement: {
    id: "basement",
    text: "Algo respira detrás tuyo.",
    choices: [],
    end: true,
  },
  escape: {
    id: "escape",
    text: "Sobrevives… pero algo te sigue.",
    choices: [],
    end: true,
  },
};

const stories = { fantasy, scifi, anime, magic, horror };

export default function SimulatorClient() {
  const [theme, setTheme] = useState<keyof typeof stories | null>(null);
  const [sceneId, setSceneId] = useState("intro");
  const [pitch, setPitch] = useState(0.65);

  const story = theme ? stories[theme] : null;
  const scene = story ? story[sceneId] ?? null : null;

  useEffect(() => {
    if (!scene) return;
    const utter = new SpeechSynthesisUtterance(scene.text);
    utter.lang = "es-ES";
    utter.pitch = pitch;
    utter.rate = 0.9;
    speechSynthesis.speak(utter);
  }, [scene, pitch]);

  if (!theme) {
    return (
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold">Elegí tu aventura</h2>
        {Object.keys(stories).map((t) => (
          <Button key={t} onClick={() => setTheme(t as any)}>
            {t.toUpperCase()}
          </Button>
        ))}
      </Card>
    );
  }

  if (!scene) {
    return (
      <Card className="p-6">
        <p>Escena no encontrada. Reiniciando…</p>
        <Button onClick={() => setSceneId("intro")}>
          Volver al inicio
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <p className="text-lg">{scene.text}</p>

      {!scene.end &&
        scene.choices.map((choice) => (
          <Button key={choice.next} onClick={() => setSceneId(choice.next)}>
            {choice.label}
          </Button>
        ))}

      {scene.end && (
        <Button onClick={() => setSceneId("intro")}>
          Volver a empezar
        </Button>
      )}

      <div className="pt-4">
        <label className="block text-sm">Voz (grave)</label>
        <input
          type="range"
          min="0.4"
          max="1"
          step="0.05"
          value={pitch}
          onChange={(e) => setPitch(Number(e.target.value))}
        />
      </div>
    </Card>
  );
}
