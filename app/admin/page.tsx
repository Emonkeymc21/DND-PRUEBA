import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/auth";
import AdminClient from "@/components/admin/admin-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const ok = await isAdminRequest();
  if (!ok) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">Admin</h1>
      <p className="max-w-3xl text-text/80">Ver inscriptos, filtrar, exportar CSV y marcar como contactado.</p>
      <AdminClient />
    </div>
  );
}
