import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/auth";
import AdminClient from "@/components/admin/admin-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-caps text-3xl font-extrabold text-primary md:text-4xl">Postulaciones</h1>
        <p className="mt-2 text-sm text-muted">
          Filtrá, marcá contactados y exportá a CSV.
        </p>
      </div>
      <AdminClient />
    </div>
  );
}
