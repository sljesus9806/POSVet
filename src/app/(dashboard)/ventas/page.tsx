import Link from "next/link";
import { History, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { ventasService } from "@/lib/modules/ventas";
import { clientesService } from "@/lib/modules/clientes";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { POSScreen } from "./pos-screen";
import { AbrirCajaForm } from "./abrir-caja-form";

export default async function VentasPage() {
  const user = await requirePermission("ventas:crear");

  const caja = await ventasService.cajaAbiertaDeUsuario(user.id);

  if (!caja) {
    const ubicaciones = await prisma.ubicacion.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, tipo: true },
    });
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Punto de venta</h2>
          <p className="text-sm text-muted-foreground">
            Antes de vender debes abrir una caja con tu fondo inicial.
          </p>
        </div>
        <AbrirCajaForm ubicaciones={ubicaciones} />
        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link href="/ventas/historial">
              <History className="size-4" /> Historial de ventas
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const clientes = await clientesService.listar({ soloActivos: true });

  // Pre-carga inicial: los 30 productos vendibles más recientes para la ubicación de la caja
  const productos = await ventasService.buscarProductosVendibles({
    ubicacionId: caja.ubicacionId,
    limit: 30,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingBag className="size-6" /> Punto de venta
          </h2>
          <p className="text-sm text-muted-foreground">
            Caja{" "}
            <span className="font-mono text-foreground">{caja.folio}</span> ·{" "}
            {caja.ubicacionNombre} · abierta por {caja.abiertaPorNombre}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/ventas/cajas/${caja.id}`}>Cerrar caja</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ventas/historial">
              <History className="size-4" /> Historial
            </Link>
          </Button>
        </div>
      </div>

      <POSScreen
        caja={{
          id: caja.id,
          folio: caja.folio,
          ubicacionId: caja.ubicacionId,
          ubicacionNombre: caja.ubicacionNombre,
        }}
        clientes={clientes.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          tipoCliente: c.tipoCliente,
          tipoPrecioEfectivo: c.tipoPrecioEfectivo,
          rfc: c.rfc,
          lineaCredito: c.lineaCredito,
          saldoActual: c.saldoActual,
        }))}
        productosIniciales={productos}
      />
    </div>
  );
}
