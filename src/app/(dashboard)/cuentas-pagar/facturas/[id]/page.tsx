import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { cuentasPagarService } from "@/lib/modules/cuentas-pagar";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CancelarFacturaForm } from "./cancelar-factura-form";

type SearchParams = Promise<{ ok?: string }>;

const ESTADO_VARIANT: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  PENDIENTE: "outline",
  PAGADA_PARCIAL: "secondary",
  PAGADA: "default",
  CANCELADA: "destructive",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADA_PARCIAL: "Parcial",
  PAGADA: "Pagada",
  CANCELADA: "Cancelada",
};

function fmtFecha(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}
function fmtFechaHora(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default async function FacturaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("cuentas-pagar:leer");
  const { id } = await params;
  const sp = await searchParams;
  const f = await cuentasPagarService.obtenerFactura(id);
  if (!f) notFound();

  const puedeCancelar = f.estado === "PENDIENTE" || f.estado === "PAGADA_PARCIAL";
  const puedeRegistrarPago = f.saldo > 0 && f.estado !== "CANCELADA";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/cuentas-pagar">
            <ArrowLeft className="size-4" /> Volver a cuentas por pagar
          </Link>
        </Button>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight">{f.folio}</h2>
          <Badge variant={ESTADO_VARIANT[f.estado] ?? "outline"}>
            {ESTADO_LABEL[f.estado] ?? f.estado}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Folio proveedor: <span className="font-mono">{f.folioProveedor}</span>
          {" · "}capturada {fmtFechaHora(f.createdAt)} por {f.usuarioNombre}
        </p>
      </div>

      {sp.ok === "creada" && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Factura capturada. Saldo del proveedor actualizado en {fmtMoneda(f.total)}.
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Proveedor</div>
          <div>
            <Link
              href={`/cuentas-pagar/estado-cuenta/${f.proveedorId}`}
              className="font-medium hover:underline"
            >
              {f.proveedorNombre}
            </Link>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Fecha emisión</div>
          <div className="font-medium">{fmtFecha(f.fechaEmision)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Vence</div>
          <div className="font-medium">{fmtFecha(f.fechaVencimiento)}</div>
        </div>
        {f.ordenCompraFolio && (
          <div>
            <div className="text-xs text-muted-foreground">OC vinculada</div>
            <Link
              href={`/compras/${f.ordenCompraId}`}
              className="font-medium hover:underline font-mono"
            >
              {f.ordenCompraFolio}
            </Link>
          </div>
        )}
        {f.observaciones && (
          <div className="sm:col-span-3">
            <div className="text-xs text-muted-foreground">Observaciones</div>
            <div>{f.observaciones}</div>
          </div>
        )}
        {f.motivoCancelacion && (
          <div className="sm:col-span-3">
            <div className="text-xs text-muted-foreground">Motivo de cancelación</div>
            <div className="text-destructive">{f.motivoCancelacion}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Cancelada el {fmtFechaHora(f.canceladaEn)}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold mb-3">Importes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Subtotal</div>
            <div className="font-medium tabular-nums">{fmtMoneda(f.subtotal)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">IVA</div>
            <div className="font-medium tabular-nums">{fmtMoneda(f.iva)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-semibold tabular-nums">{fmtMoneda(f.total)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Saldo</div>
            <div
              className={`font-semibold tabular-nums ${
                f.saldo === 0 ? "text-green-700" : ""
              }`}
            >
              {fmtMoneda(f.saldo)}
            </div>
          </div>
        </div>
      </section>

      {(puedeRegistrarPago || puedeCancelar) && (
        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Acciones</h3>
          <div className="flex flex-wrap gap-2">
            {puedeRegistrarPago && (
              <Button asChild>
                <Link href={`/cuentas-pagar/pagos/nuevo?proveedorId=${f.proveedorId}&facturaId=${f.id}`}>
                  <ReceiptText className="size-4" /> Registrar pago
                </Link>
              </Button>
            )}
            {puedeCancelar && (
              <CancelarFacturaForm facturaId={f.id} folio={f.folio} />
            )}
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Pagos aplicados</h3>
        </div>
        {f.aplicaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            Aún no hay pagos aplicados a esta factura.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pago</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto aplicado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {f.aplicaciones.map((a) => (
                <TableRow key={a.id} className={a.pagoEstado === "CANCELADO" ? "opacity-50" : ""}>
                  <TableCell className="font-mono text-xs">{a.pagoFolio}</TableCell>
                  <TableCell className="text-sm">{fmtFecha(a.pagoFecha)}</TableCell>
                  <TableCell className="text-sm">{a.formaPago}</TableCell>
                  <TableCell>
                    {a.pagoEstado === "CANCELADO" ? (
                      <Badge variant="destructive">Cancelado</Badge>
                    ) : (
                      <Badge>Registrado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoneda(a.monto)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/cuentas-pagar/pagos/${a.pagoId}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

