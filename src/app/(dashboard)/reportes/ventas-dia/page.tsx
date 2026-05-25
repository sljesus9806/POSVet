import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { reportesService } from "@/lib/modules/reportes";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiltrosForm } from "../filtros-form";
import { PrintButton } from "../print-button";
import { PrintStyles } from "../print-styles";
import { formatearFecha, resolverRango, type RangoSearchParams } from "../_rango";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type SearchParams = Promise<RangoSearchParams>;

export default async function VentasDiaPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("reportes:leer");
  const sp = await searchParams;
  const rango = resolverRango(sp, { diasPorDefecto: 0 });

  const [reporte, ubicaciones] = await Promise.all([
    reportesService.ventasDelDia({
      desde: rango.desde,
      hasta: rango.hasta,
      ubicacionId: rango.ubicacionId,
    }),
    prisma.ubicacion.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PrintStyles />

      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/reportes" aria-label="Volver">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ventas del día</h2>
            <p className="text-sm text-muted-foreground">
              Resumen de ventas dentro del rango seleccionado.
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <FiltrosForm
        action="/reportes/ventas-dia"
        desde={rango.desdeStr}
        hasta={rango.hastaStr}
        ubicacionId={rango.ubicacionId}
        ubicaciones={ubicaciones}
      />

      <div className="print-card rounded-lg border bg-card p-5 space-y-5">
        <header>
          <div className="text-lg font-semibold">Ventas del día</div>
          <div className="text-sm text-muted-foreground">
            {formatearFecha(reporte.rango.desde)} — {formatearFecha(reporte.rango.hasta)}
            {reporte.ubicacionNombre && ` · ${reporte.ubicacionNombre}`}
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total vendido" value={fmt(reporte.totalVendido)} />
          <Stat label="# Tickets" value={String(reporte.numTickets)} />
          <Stat label="Ticket promedio" value={fmt(reporte.ticketPromedio)} />
          <Stat
            label="Canceladas"
            value={`${reporte.numTicketsCancelados} · ${fmt(reporte.totalCancelado)}`}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-sm font-semibold mb-2">Ventas por hora</h3>
            {reporte.porHora.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas en el rango.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right"># Tickets</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reporte.porHora.map((h) => (
                    <TableRow key={h.hora}>
                      <TableCell className="tabular-nums">
                        {String(h.hora).padStart(2, "0")}:00
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{h.numTickets}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(h.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Pagos por forma</h3>
            {reporte.porFormaPago.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos en el rango.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reporte.porFormaPago.map((p) => (
                    <TableRow key={p.forma}>
                      <TableCell>{p.forma}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(p.monto)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}
