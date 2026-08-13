import { Badge } from "@/components/ui";
import TreeEngineDemo from "@/components/simulator/tree-engine-demo";

export const metadata = {
  title: "Encrucijada",
  description: "Una escena corta de rol: describí lo que hace tu personaje y mirá adónde te lleva.",
};

export default function LaboratorioPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>🌒 Encrucijada</Badge>
        <h1 className="title-caps mt-3 font-display text-3xl font-extrabold md:text-4xl">
          <span className="gold-gradient">Una decisión, una historia</span>
        </h1>
        <p className="mt-2 max-w-2xl text-text/80">
          Describí con tus propias palabras qué hace tu personaje frente a la puerta. No hay
          opciones fijas: escribí lo que se te ocurra.
        </p>
      </div>

      <TreeEngineDemo />
    </div>
  );
}
