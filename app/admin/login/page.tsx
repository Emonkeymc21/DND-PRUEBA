import { Card } from "@/components/ui";
import AdminLoginForm from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ingreso admin",
  robots: { index: false, follow: false },
};

export default function AdminLogin() {
  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <h1 className="title-caps text-3xl font-extrabold text-primary">Ingreso</h1>
      <Card className="edge-top">
        <AdminLoginForm />
        <p className="mt-4 text-xs text-muted">
          Panel privado. La clave se configura en la variable de entorno <code>ADMIN_PASSWORD</code>.
        </p>
      </Card>
    </div>
  );
}
