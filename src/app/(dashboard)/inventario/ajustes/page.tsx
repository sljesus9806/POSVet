import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { productosService } from "@/lib/modules/productos";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { AjusteForm } from "./ajuste-form";

export default async function AjustesPage() {
  await requirePermission("inventario:editar");

  const [productos, ubicaciones] = await Promise.all([
    productosService.listar({ soloActivos: true }),
    prisma.ubicacion.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/inventario">
            <ArrowLeft className="size-4" /> Volver a inventario
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Ajustar stock</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Registra entradas o salidas con motivo (merma, caducidad, robo, conteo físico).
        </p>
      </div>

      <AjusteForm
        productos={productos.map((p) => ({
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          unidadMedida: p.unidadMedida,
        }))}
        ubicaciones={ubicaciones.map((u) => ({ id: u.id, nombre: u.nombre, tipo: u.tipo }))}
      />
    </div>
  );
}
