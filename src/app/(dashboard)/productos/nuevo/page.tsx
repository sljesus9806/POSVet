import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { categoriasService } from "@/lib/modules/productos";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { ProductoForm } from "../producto-form";

export default async function NuevoProductoPage() {
  await requirePermission("productos:crear");
  const categorias = await categoriasService.listar();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/productos">
            <ArrowLeft className="size-4" /> Volver a productos
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Nuevo producto</h2>
      </div>
      <ProductoForm categorias={categorias} />
    </div>
  );
}
