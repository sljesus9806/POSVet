import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { ProveedorForm } from "../proveedor-form";

export default async function NuevoProveedorPage() {
  await requirePermission("proveedores:crear");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/proveedores">
            <ArrowLeft className="size-4" /> Volver a proveedores
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Nuevo proveedor</h2>
        <p className="text-sm text-muted-foreground mt-1">
          El código (PRV-NNNNN) se asigna automáticamente al guardar. El catálogo de productos se gestiona después de crearlo.
        </p>
      </div>
      <ProveedorForm />
    </div>
  );
}
