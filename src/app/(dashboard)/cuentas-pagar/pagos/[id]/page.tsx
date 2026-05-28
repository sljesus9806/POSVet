import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { CancelarPagoForm } from "./cancelar-pago-form";

type SearchParams = Promise<{ ok?: string }>;

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

export default async function PagoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("cuentas-pagar:leer");
  const { id } = await params;
  const sp = await searchParams;
  const p = await cuentasPagarService.obtenerPago(id);
  if (!p) notFound();

  const puedeCancelar = p.estado === "REGISTRADO";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/cuentas-pagar/pagos">
            <ArrowLeft className="size-4" /> Volver a pagos
          </Link>
        </Button>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight">{p.folio}</h2>
          <Badge variant={p.estado === "CANCELADO" ? "destructive" : "default"}>
            {p.estado === "CANCELADO" ? "Cancelado" : "Registrado"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Registrado por {p.usuarioNombre} · {fmtFechaHora(p.fecha)}
        </p>
      </div>

      {sp.ok === "creado" && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Pago registrado y distribuido entre {p.aplicaciones.length} factura(s).
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Proveedor</div>
          <Link
            href={`/cuentas-pagar/estado-cuenta/${p.proveedorId}`}
            className="font-medium hover:underline"
          >
            {p.proveedorNombre}
          </Link>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Forma de pago</div>
          <div className="font-medium">{p.formaPago}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Monto total</div>
          <div className="font-semibold tabular-nums">{fmtMoneda(p.monto)}</div>
        </div>
        {p.referencia && (
          <div>
            <div className="text-xs text-muted-foreground">Referencia</div>
            <div className="font-mono text-xs">{p.referencia}</div>
          </div>
        )}
        {p.observaciones && (
          <div className="sm:col-span-3">
            <div className="text-xs text-muted-foreground">Observaciones</div>
            <div>{p.observaciones}</div>
          </div>
        )}
        {p.motivoCancelacion && (
          <div className="sm:col-span-3">
            <div className="text-xs text-muted-foreground">Motivo de cancelación</div>
            <div className="text-destructive">{p.motivoCancelacion}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Cancelado el {fmtFechaHora(p.canceladoEn)}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Facturas aplicadas</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio interno</TableHead>
              <TableHead>Folio proveedor</TableHead>
              <TableHead className="text-right">Monto aplicado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {p.aplicaciones.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.facturaFolio}</TableCell>
                <TableCell className="font-mono text-xs">{a.folioProveedor}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoneda(a.monto)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/cuentas-pagar/facturas/${a.facturaId}`}>Ver factura</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {puedeCancelar && (
        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Cancelar este pago</h3>
          <p className="text-xs text-muted-foreground">
            Al cancelar el pago, los saldos de las facturas afectadas se restauran y el saldo del
            proveedor incrementa por {fmtMoneda(p.monto)}.
          </p>
          <CancelarPagoForm pagoId={p.id} folio={p.folio} />
        </section>
      )}

      {p.estado === "CANCELADO" && (
        <p className="text-xs text-muted-foreground">
          Este pago está cancelado. Sus aplicaciones ya no afectan saldos.
        </p>
      )}

      <p className="text-xs text-muted-foreground">Fecha de captura: {fmtFecha(p.fecha)}</p>
    </div>
  );
}
