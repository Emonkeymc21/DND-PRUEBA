import { Container } from "@/components/ui";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 py-10">
      <Container className="text-sm text-text/70">
        <p>
          Hecho con Next.js + TypeScript + Tailwind. Datos SRD vía APIs públicas.
        </p>
        <p className="mt-2">
          Nota legal: Este proyecto usa información del SRD/recursos OGL. No está afiliado a Wizards of the Coast.
        </p>
      </Container>
    </footer>
  );
}
