import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { productosService } from "@/lib/modules/productos";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { TransferenciaForm } from "./transferencia-form";

export default async function NuevaTransferenciaPage() {
  await requirePermission("inventario:editar");

  const [productos, ubicaciones] = await Promise.all([
    productosService.listar({ soloActivos: true }),
    prisma.ubicacion.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/inventario/transferencias">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Nueva transferencia</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Mueve stock de una ubicación a otra. Se generan dos movimientos en el kardex (salida + entrada) y un folio T-AAAA-NNNNN.
        </p>
      </div>

      <TransferenciaForm
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
