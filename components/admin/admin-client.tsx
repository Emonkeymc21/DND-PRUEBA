import { Card, Button } from "@/components/ui";

/**
 * Panel de inicio del admin.
 *
 * Este sitio no tiene base de datos propia: cada postulación se manda
 * directo a Google Forms (donde queda en la hoja de respuestas de siempre)
 * y al canal de Discord configurado. No hay una lista propia que mostrar
 * acá — el lugar correcto para ver las respuestas es Google Forms / la
 * hoja de cálculo vinculada, y el canal de Discord para el aviso en el
 * momento.
 */
export default function AdminClient() {
  const formsUrl = process.env.NEXT_PUBLIC_GOOGLE_FORM_VIEW_URL;

  return (
    <div className="space-y-4">
      <Card className="edge-top">
        <h2 className="font-display text-lg font-bold text-primary">Dónde ver las postulaciones</h2>
        <p className="mt-2 text-sm text-text/80">
          Cada envío del formulario llega directo a tu Google Form y, si configuraste el webhook, a tu
          canal de Discord. No hace falta este panel para verlas — están ahí apenas se postulan.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {formsUrl ? (
            <Button as="link" href={formsUrl} variant="primary">
              Abrir respuestas en Google Forms
            </Button>
          ) : null}
        </div>
        {!formsUrl ? (
          <p className="mt-3 text-xs text-muted">
            Configurá <code>NEXT_PUBLIC_GOOGLE_FORM_VIEW_URL</code> con el link a la hoja de respuestas
            de tu formulario para que aparezca acá un acceso directo.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="font-display text-base font-bold text-primary">Modelo de recomendación</h3>
          <p className="mt-2 text-sm text-muted">
            Ajustá qué tan importante es cada dimensión al sugerir campañas, o corregí una
            recomendación para que el motor aprenda.
          </p>
          <Button as="link" href="/admin/modelo" variant="ghost" className="mt-3">
            Abrir
          </Button>
        </Card>

        <Card>
          <h3 className="font-display text-base font-bold text-primary">Árbol narrativo</h3>
          <p className="mt-2 text-sm text-muted">
            Agregá o editá los nodos de la escena de la encrucijada (/encrucijada) sin tocar código.
          </p>
          <Button as="link" href="/admin/arbol" variant="ghost" className="mt-3">
            Abrir
          </Button>
        </Card>
      </div>
    </div>
  );
}
