import { Badge } from "@/components/ui";
import TreeEngineDemo from "@/components/simulator/tree-engine-demo";

export const metadata = {
  title: "Laboratorio narrativo",
  description: "Demo del motor híbrido Python (FastAPI + scikit-learn) / TypeScript que clasifica texto libre contra un árbol narrativo.",
};

export default function LaboratorioPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>🧪 Laboratorio</Badge>
        <h1 className="title-caps mt-3 font-display text-3xl font-extrabold md:text-4xl">
          <span className="gold-gradient">Motor narrativo híbrido</span>
        </h1>
        <p className="mt-2 max-w-2xl text-text/80">
          Esta página prueba en vivo el árbol de decisiones (
          <code>data/role_tree_dataset.json</code>) contra dos motores intercambiables: un servicio
          Python con scikit-learn (si lo tenés corriendo en <code>localhost:8000</code>) y un
          equivalente en TypeScript que responde siempre, incluso en producción.
        </p>
        <p className="mt-2 text-xs text-muted">
          Para ver el motor Python en acción: <code>cd ml_service && uvicorn app:app --port 8000</code>.
          Sin eso corriendo, la etiqueta va a decir "motor: typescript" — es el comportamiento
          esperado, no un error.
        </p>
      </div>

      <TreeEngineDemo />
    </div>
  );
}
