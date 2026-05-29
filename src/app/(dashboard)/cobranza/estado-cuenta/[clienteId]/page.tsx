import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HandCoins } from "lucide-react";
import { cobranzaService } from "@/lib/modules/cobranza";
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

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}
function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default async function EstadoCuentaClientePage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  await requirePermission("cobranza:leer");
  const { clienteId } = await params;
  const ec = await cobranzaService.estadoCuenta(clienteId);
  if (!ec) notFound();

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/cobranza">
            <ArrowLeft className="size-4" /> Volver a cobranza
          </Link>
        </Button>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight">{ec.clienteNombre}</h2>
          <span className="font-mono text-sm text-muted-foreground">{ec.clienteCodigo}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Estado de cuenta · {ec.diasCredito} días de crédito
        </p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Saldo actual</div>
          <div className="text-2xl font-semibold tabular-nums">{fmtMoneda(ec.saldoActual)}</div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Línea de crédito</div>
          <div className="text-2xl font-semibold tabular-nums">{fmtMoneda(ec.lineaCredito)}</div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Crédito disponible</div>
          <div className="text-2xl font-semibold tabular-nums">{fmtMoneda(ec.disponible)}</div>
        </div>
      </section>

      {ec.saldoActual > 0 && (
        <div>
          <Button asChild>
            <Link href={`/cobranza/abonos/nuevo?clienteId=${ec.clienteId}`}>
              <HandCoins className="size-4" /> Registrar abono
            </Link>
          </Button>
        </div>
      )}

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Ventas a crédito pendientes</h3>
        </div>
        {ec.ventasCredito.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            Sin ventas a crédito pendientes.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead className="text-right">Crédito original</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ec.ventasCredito.map((v) => (
                <TableRow key={v.ventaId}>
                  <TableCell className="font-mono text-xs">{v.folio}</TableCell>
                  <TableCell className="text-sm">{fmtFecha(v.fechaVenta)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {v.diasDesdeVenta}
                    {v.diasDesdeVenta > ec.diasCredito && ec.diasCredito > 0 && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        vencida
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {fmtMoneda(v.montoCredito)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmtMoneda(v.saldoCredito)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/ventas/historial/${v.ventaId}`}>Ver venta</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Abonos recientes</h3>
        </div>
        {ec.abonosRecientes.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            Sin abonos registrados a este cliente.
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
              {ec.abonosRecientes.map((a) => (
                <TableRow key={a.id} className={a.estado === "CANCELADO" ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{a.folio}</TableCell>
                  <TableCell className="text-sm">{fmtFecha(a.fecha)}</TableCell>
                  <TableCell className="text-sm">{a.formaPago}</TableCell>
                  <TableCell>
                    <Badge variant={a.estado === "CANCELADO" ? "destructive" : "default"}>
                      {a.estado === "CANCELADO" ? "Cancelado" : "Registrado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmtMoneda(a.monto)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/cobranza/abonos/${a.id}`}>Ver</Link>
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
