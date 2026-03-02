import CreatorClient from "@/components/creator/creator-client";

export const metadata = { title: "Creador de personaje" };

export default function CreatorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Creador de personaje (SRD)</h1>
      <p className="max-w-3xl text-text/80">
        Creador completo en español (SRD): raza, clase, trasfondo, equipo, dotes y conjuros. Podés exportar tu ficha en JSON o imprimirla.
      </p>
      <CreatorClient />
    </div>
  );
}
