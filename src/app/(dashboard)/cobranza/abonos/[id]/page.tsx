import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { CancelarAbonoForm } from "./cancelar-abono-form";

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

export default async function AbonoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("cobranza:leer");
  const { id } = await params;
  const sp = await searchParams;
  const a = await cobranzaService.obtenerAbono(id);
  if (!a) notFound();

  const puedeCancelar = a.estado === "REGISTRADO";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/cobranza/abonos">
            <ArrowLeft className="size-4" /> Volver a abonos
          </Link>
        </Button>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight">{a.folio}</h2>
          <Badge variant={a.estado === "CANCELADO" ? "destructive" : "default"}>
            {a.estado === "CANCELADO" ? "Cancelado" : "Registrado"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Registrado por {a.usuarioNombre} · {fmtFechaHora(a.fecha)}
        </p>
      </div>

      {sp.ok === "creado" && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Abono registrado y aplicado a {a.aplicaciones.length} venta(s).
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Cliente</div>
          <Link
            href={`/cobranza/estado-cuenta/${a.clienteId}`}
            className="font-medium hover:underline"
          >
            {a.clienteNombre}
          </Link>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Forma de pago</div>
          <div className="font-medium">{a.formaPago}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Monto</div>
          <div className="font-semibold tabular-nums">{fmtMoneda(a.monto)}</div>
        </div>
        {a.referencia && (
          <div>
            <div className="text-xs text-muted-foreground">Referencia</div>
            <div className="font-mono text-xs">{a.referencia}</div>
          </div>
        )}
        {a.observaciones && (
          <div className="sm:col-span-3">
            <div className="text-xs text-muted-foreground">Observaciones</div>
            <div>{a.observaciones}</div>
          </div>
        )}
        {a.motivoCancelacion && (
          <div className="sm:col-span-3">
            <div className="text-xs text-muted-foreground">Motivo de cancelación</div>
            <div className="text-destructive">{a.motivoCancelacion}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Cancelado el {fmtFechaHora(a.canceladoEn)}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Ventas aplicadas</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Venta</TableHead>
              <TableHead className="text-right">Monto aplicado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {a.aplicaciones.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="font-mono text-xs">{x.ventaFolio}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoneda(x.monto)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/ventas/historial/${x.ventaId}`}>Ver venta</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {puedeCancelar && (
        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Cancelar abono</h3>
          <p className="text-xs text-muted-foreground">
            Al cancelar, el saldo de las ventas afectadas se restaura y el saldo del cliente
            sube por {fmtMoneda(a.monto)}.
          </p>
          <CancelarAbonoForm abonoId={a.id} folio={a.folio} />
        </section>
      )}

      <p className="text-xs text-muted-foreground">Fecha: {fmtFecha(a.fecha)}</p>
    </div>
  );
}
