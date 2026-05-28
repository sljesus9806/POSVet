import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePlus, ReceiptText } from "lucide-react";
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

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADA_PARCIAL: "Parcial",
  PAGADA: "Pagada",
  CANCELADA: "Cancelada",
};
const ESTADO_VARIANT: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  PENDIENTE: "outline",
  PAGADA_PARCIAL: "secondary",
  PAGADA: "default",
  CANCELADA: "destructive",
};

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}
function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default async function EstadoCuentaPage({
  params,
}: {
  params: Promise<{ proveedorId: string }>;
}) {
  await requirePermission("cuentas-pagar:leer");
  const { proveedorId } = await params;
  const ec = await cuentasPagarService.estadoCuenta(proveedorId);
  if (!ec) notFound();

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/cuentas-pagar">
            <ArrowLeft className="size-4" /> Volver a cuentas por pagar
          </Link>
        </Button>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight">{ec.proveedorNombre}</h2>
          <span className="font-mono text-sm text-muted-foreground">{ec.proveedorCodigo}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Estado de cuenta</p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Saldo actual</div>
          <div className="text-2xl font-semibold tabular-nums">{fmtMoneda(ec.saldoActual)}</div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Total facturado</div>
          <div className="text-2xl font-semibold tabular-nums">{fmtMoneda(ec.totalFacturado)}</div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Total pagado</div>
          <div className="text-2xl font-semibold tabular-nums">{fmtMoneda(ec.totalPagado)}</div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/cuentas-pagar/facturas/nueva?proveedorId=${ec.proveedorId}`}>
            <FilePlus className="size-4" /> Capturar factura
          </Link>
        </Button>
        {ec.saldoActual > 0 && (
          <Button asChild variant="outline">
            <Link href={`/cuentas-pagar/pagos/nuevo?proveedorId=${ec.proveedorId}`}>
              <ReceiptText className="size-4" /> Registrar pago
            </Link>
          </Button>
        )}
      </div>

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Facturas pendientes</h3>
        </div>
        {ec.facturasPendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            No hay facturas pendientes de pago.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Folio prov.</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ec.facturasPendientes.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.folio}</TableCell>
                    <TableCell className="font-mono text-xs">{f.folioProveedor}</TableCell>
                    <TableCell className="text-sm">
                      {fmtFecha(f.fechaVencimiento)}
                      {f.diasParaVencer < 0 && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          {Math.abs(f.diasParaVencer)}d vencida
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VARIANT[f.estado] ?? "outline"}>
                        {ESTADO_LABEL[f.estado] ?? f.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmtMoneda(f.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmtMoneda(f.saldo)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/cuentas-pagar/facturas/${f.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Pagos recientes</h3>
        </div>
        {ec.pagosRecientes.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            Sin pagos registrados a este proveedor.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ec.pagosRecientes.map((p) => (
                <TableRow key={p.id} className={p.estado === "CANCELADO" ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{p.folio}</TableCell>
                  <TableCell className="text-sm">{fmtFecha(p.fecha)}</TableCell>
                  <TableCell className="text-sm">{p.formaPago}</TableCell>
                  <TableCell>
                    <Badge variant={p.estado === "CANCELADO" ? "destructive" : "default"}>
                      {p.estado === "CANCELADO" ? "Cancelado" : "Registrado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmtMoneda(p.monto)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/cuentas-pagar/pagos/${p.id}`}>Ver</Link>
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
