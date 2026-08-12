import { Badge } from "@/components/ui";
import BestiaryClient from "@/components/bestiary/bestiary-client";

export const metadata = {
  title: "Bestiario",
  description:
    "Consultá estadísticas de criaturas del SRD 5.1 de D&D en tiempo real y tirá ataques contra ellas.",
};

export default function BestiarioPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>🐉 Bestiario</Badge>
        <h1 className="title-caps mt-3 text-3xl font-extrabold md:text-4xl">
          <span className="gold-gradient">Criaturas</span>
        </h1>
        <p className="mt-2 max-w-2xl text-text/80">
          Datos en vivo del SRD 5.1. Buscá una criatura, mirá sus estadísticas y tirá un ataque
          contra su clase de armadura para ver cómo se siente el sistema.
        </p>
        <p className="mt-2 text-xs text-muted">
          Fuente: dnd5eapi.co · Contenido del SRD 5.1 bajo licencia OGL. Los nombres están en inglés
          porque así los publica la API.
        </p>
      </div>

      <BestiaryClient />
    </div>
  );
}
