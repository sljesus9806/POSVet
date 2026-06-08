import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { ventasService } from "@/lib/modules/ventas";
import { clientesService } from "@/lib/modules/clientes";
import { facturacionService, formaPagoVentaASat } from "@/lib/modules/facturacion";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { EmitirFacturaForm } from "./emitir-form";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type SearchParams = Promise<{ venta?: string }>;

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Button variant="outline" asChild>
        <Link href="/facturacion">
          <ArrowLeft className="size-4" /> Volver a Facturación
        </Link>
      </Button>
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 max-w-2xl">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <div>{children}</div>
      </div>
    </div>
  );
}

export default async function NuevaFacturaPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("facturacion:crear");
  const { venta: ventaId } = await searchParams;

  if (!ventaId) {
    return (
      <Aviso>
        Para emitir una factura, primero abre la venta que quieres facturar en{" "}
        <Link href="/ventas/historial" className="underline font-medium">
          Ventas → Historial
        </Link>
        , entra a su detalle y presiona el botón <strong>Facturar</strong>.
      </Aviso>
    );
  }

  const venta = await ventasService.obtenerVenta(ventaId);
  if (!venta) {
    return <Aviso>No encontramos esa venta. Verifica que el folio sea correcto.</Aviso>;
  }
  if (venta.estado !== "COMPLETADA") {
    return (
      <Aviso>
        La venta <span className="font-mono">{venta.folio}</span> está cancelada y no se puede
        facturar.
      </Aviso>
    );
  }

  const yaFacturada = await facturacionService.facturaDeVenta(venta.id);
  if (yaFacturada) {
    return (
      <Aviso>
        Esta venta ya tiene una factura vigente (
        <Link href={`/facturacion/${yaFacturada.id}`} className="underline font-medium">
          {yaFacturada.serieFolio}
        </Link>
        ). Si necesitas rehacerla, cancela primero la factura existente.
      </Aviso>
    );
  }

  // Prellenar el receptor con los datos fiscales del cliente de la venta, si los tiene.
  const cliente = venta.clienteId ? await clientesService.obtener(venta.clienteId) : null;
  const prefill = {
    ventaId: venta.id,
    receptorRfc: cliente?.rfc ?? "",
    receptorNombre: cliente?.nombre ?? "",
    receptorRegimen: cliente?.regimenFiscal ?? "",
    receptorUsoCfdi: cliente?.usoCFDI ?? "G03",
    receptorCp: cliente?.codigoPostal ?? "",
    formaPago: formaPagoVentaASat(venta.pagos[0]?.forma ?? "EFECTIVO"),
    metodoPago: "PUE",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-3">
          <Link href={`/ventas/historial/${venta.id}`}>
            <ArrowLeft className="size-4" /> Volver a la venta
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Emitir factura</h2>
        <p className="text-sm text-muted-foreground">
          Venta <span className="font-mono">{venta.folio}</span> ·{" "}
          {venta.fechaVenta.toLocaleDateString("es-MX")} · Total{" "}
          <span className="font-semibold">{fmt(venta.total)}</span>
        </p>
      </div>

      <EmitirFacturaForm prefill={prefill} clienteNombre={cliente?.nombre ?? null} />
    </div>
  );
}
