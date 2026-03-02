import SimulatorClient from "@/components/simulator/simulator-client";

export const metadata = {
  title: "Simulador"
};

export default function SimulatorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Simulador de experiencia</h1>
      <p className="max-w-3xl text-text/80">
        Un one-shot tutorial interactivo en español, con narración épica y decisiones que cambian el rumbo de la historia.
      </p>
      <SimulatorClient />
    </div>
  );
}
