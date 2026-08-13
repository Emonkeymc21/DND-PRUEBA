import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/auth";
import TreeEditorClient from "@/components/admin/tree-editor";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Árbol narrativo",
  robots: { index: false, follow: false },
};

export default async function ArbolPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-caps font-display text-3xl font-extrabold text-primary md:text-4xl">
          Árbol narrativo
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Cada nodo tiene un título, un texto y hasta 15 opciones. Cada opción define hacia qué nodo
          lleva y qué palabras clave la disparan cuando alguien escribe su acción en texto libre.
        </p>
      </div>
      <TreeEditorClient />
    </div>
  );
}
