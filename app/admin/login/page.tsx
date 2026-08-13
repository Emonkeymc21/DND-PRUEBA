import { Card } from "@/components/ui";
import AdminLoginForm from "@/components/admin/admin-login-form";
import { isUsingDefaultPassword, DEFAULT_DEV_PASSWORD } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ingreso admin",
  robots: { index: false, follow: false },
};

export default function AdminLogin() {
  const usingDefault = isUsingDefaultPassword();

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <h1 className="title-caps font-display text-3xl font-extrabold text-primary">Ingreso</h1>

      {usingDefault ? (
        <div className="rounded-xl border border-ember/60 bg-ember/10 p-4 text-sm text-text/90">
          <p className="font-semibold text-ember">⚠️ Estás usando la clave de desarrollo.</p>
          <p className="mt-1 text-xs">
            Sin <code>ADMIN_PASSWORD</code> configurada, el panel acepta{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">{DEFAULT_DEV_PASSWORD}</code>. Esta
            clave está escrita en el código fuente — cualquiera con acceso al repositorio la conoce.
            Antes de publicar el sitio, configurá tu propia <code>ADMIN_PASSWORD</code> (mínimo 8
            caracteres) en las variables de entorno.
          </p>
        </div>
      ) : null}

      <Card className="edge-top">
        <AdminLoginForm />
        <p className="mt-4 text-xs text-muted">
          Panel privado. La clave se configura en la variable de entorno <code>ADMIN_PASSWORD</code>.
        </p>
      </Card>
    </div>
  );
}
