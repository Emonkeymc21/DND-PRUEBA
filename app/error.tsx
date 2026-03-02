"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log to console for debugging in production
  console.error("[app/error.tsx]", error);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h2 className="text-2xl font-extrabold text-primary">Se produjo un error en la app</h2>
      <p className="mt-2 text-sm text-text/80">
        Si ves esto en producción, abrí la consola del navegador para ver el detalle exacto del error.
      </p>

      <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-border/60 bg-card/60 p-4 text-xs text-text/90">
        {error?.message || "Error desconocido"}
        {error?.digest ? `\nDigest: ${error.digest}` : ""}
      </pre>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-black hover:opacity-90"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-border/60 px-4 py-2 text-sm font-bold text-text hover:bg-card/60"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
