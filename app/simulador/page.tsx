import SimulatorClient from "@/components/simulator/simulator-client";

export const metadata = {
  title: "Simulador"
};

export default function SimulatorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Simulador de experiencia</h1>
      <p className="max-w-3xl text-text/80">
        Un one-shot tutorial interactivo en español. Funciona sin API keys: motor por escenas en JSON + lógica por reglas.
        Incluye narrador por voz usando <code className="rounded bg-black/40 px-1 py-0.5">SpeechSynthesis</code>.
      </p>
      <SimulatorClient />
    </div>
  );
}
