import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/auth";
import ModelClient from "@/components/admin/model-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Modelo",
  robots: { index: false, follow: false },
};

export default async function ModeloPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-caps font-display text-3xl font-extrabold text-primary md:text-4xl">
          Modelo de recomendación
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ajustá cuánto pesa cada dimensión al recomendar campañas, o corregí una recomendación y dejá
          que el motor aprenda de tu criterio.
        </p>
      </div>
      <ModelClient />
    </div>
  );
}
