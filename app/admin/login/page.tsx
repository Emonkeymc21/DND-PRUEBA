import { Card } from "@/components/ui";
import AdminLoginForm from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin login" };

export default function AdminLogin() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-4xl font-extrabold">Ingreso Admin</h1>
      <Card>
        <AdminLoginForm />
        <p className="mt-3 text-xs text-text/70">Acceso restringido. Si no tenés la clave, volvé al inicio.</p>
</Card>
    </div>
  );
}
