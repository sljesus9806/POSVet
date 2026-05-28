import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { proveedoresService } from "@/lib/modules/proveedores";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { NuevaFacturaForm } from "./nueva-factura-form";

type SearchParams = Promise<{ proveedorId?: string; ocId?: string }>;

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("cuentas-pagar:crear");
  const sp = await searchParams;

  const proveedores = await proveedoresService.listar({ soloActivos: true });

  // Si vienen con ocId, precarga totales
  const ocPrecargada = sp.ocId
    ? await prisma.ordenCompra.findUnique({
        where: { id: sp.ocId },
        select: {
          id: true,
          folio: true,
          proveedorId: true,
          subtotal: true,
          iva: true,
          total: true,
        },
      })
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/cuentas-pagar">
            <ArrowLeft className="size-4" /> Volver a cuentas por pagar
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Capturar factura del proveedor</h2>
        <p className="text-sm text-muted-foreground mt-1">
          El folio interno (FCP-YYYY-NNNNN) se asigna automáticamente. El saldo inicial de la
          factura es igual al total y se descontará al registrar pagos.
        </p>
      </div>
      <NuevaFacturaForm
        proveedores={proveedores.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre }))}
        proveedorIdInicial={sp.proveedorId ?? ocPrecargada?.proveedorId ?? null}
        ocPrecargada={
          ocPrecargada
            ? {
                id: ocPrecargada.id,
                folio: ocPrecargada.folio,
                subtotal: Number(ocPrecargada.subtotal.toString()),
                iva: Number(ocPrecargada.iva.toString()),
                total: Number(ocPrecargada.total.toString()),
              }
            : null
        }
      />
    </div>
  );
}
