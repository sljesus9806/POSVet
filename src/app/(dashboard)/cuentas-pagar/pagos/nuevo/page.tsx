import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { proveedoresService } from "@/lib/modules/proveedores";
import { cuentasPagarService } from "@/lib/modules/cuentas-pagar";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { NuevoPagoForm } from "./nuevo-pago-form";

type SearchParams = Promise<{ proveedorId?: string; facturaId?: string }>;

export default async function NuevoPagoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("cuentas-pagar:crear");
  const sp = await searchParams;

  const proveedores = await proveedoresService.listar({ soloActivos: true });

  // Si vienen con proveedorId, pre-cargamos las facturas pendientes
  let pendientesIniciales: Awaited<ReturnType<typeof cuentasPagarService.listarFacturas>> = [];
  if (sp.proveedorId) {
    const [pendientes, parciales] = await Promise.all([
      cuentasPagarService.listarFacturas({ proveedorId: sp.proveedorId, estado: "PENDIENTE" }),
      cuentasPagarService.listarFacturas({ proveedorId: sp.proveedorId, estado: "PAGADA_PARCIAL" }),
    ]);
    pendientesIniciales = [...pendientes, ...parciales].sort(
      (a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime(),
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/cuentas-pagar/pagos">
            <ArrowLeft className="size-4" /> Volver a pagos
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Registrar pago a proveedor</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Captura el monto total del pago y distribúyelo entre las facturas pendientes del proveedor.
          La suma de distribuciones debe igualar el monto del pago.
        </p>
      </div>
      <NuevoPagoForm
        proveedores={proveedores.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre }))}
        proveedorIdInicial={sp.proveedorId ?? null}
        facturaIdInicial={sp.facturaId ?? null}
        pendientesIniciales={pendientesIniciales.map((f) => ({
          id: f.id,
          folio: f.folio,
          folioProveedor: f.folioProveedor,
          fechaVencimiento: f.fechaVencimiento.toISOString(),
          saldo: f.saldo,
          total: f.total,
        }))}
      />
    </div>
  );
}
