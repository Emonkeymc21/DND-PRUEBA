import { Card } from "@/components/ui";
import AdminLoginForm from "@/components/admin/admin-login-form";

export const metadata = { title: "Admin login" };

export default function AdminLogin() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-4xl font-extrabold">Ingreso Admin</h1>
      <Card>
        <AdminLoginForm />
        <p className="mt-3 text-xs text-text/70">
          Seguridad simple por contraseña en <code className="rounded bg-black/40 px-1 py-0.5">ADMIN_PASSWORD</code>. (Gratis y rápido)
        </p>
      </Card>
    </div>
  );
}
