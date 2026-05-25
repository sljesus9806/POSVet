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

export default async function VentasPorUsuarioPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("reportes:leer");
  const sp = await searchParams;
  const rango = resolverRango(sp, { diasPorDefecto: 7 });

  const [reporte, ubicaciones] = await Promise.all([
    reportesService.ventasPorUsuario({
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
            <h2 className="text-2xl font-semibold tracking-tight">Ventas por usuario</h2>
            <p className="text-sm text-muted-foreground">
              Total y número de tickets por cajero en el rango.
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <FiltrosForm
        action="/reportes/ventas-por-usuario"
        desde={rango.desdeStr}
        hasta={rango.hastaStr}
        ubicacionId={rango.ubicacionId}
        ubicaciones={ubicaciones}
      />

      <div className="print-card rounded-lg border bg-card p-5 space-y-4">
        <header>
          <div className="text-lg font-semibold">Ventas por usuario</div>
          <div className="text-sm text-muted-foreground">
            {formatearFecha(reporte.rango.desde)} — {formatearFecha(reporte.rango.hasta)}
            {reporte.ubicacionNombre && ` · ${reporte.ubicacionNombre}`}
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Cajeros con ventas" value={String(reporte.filas.length)} />
          <Stat label="# Tickets totales" value={String(reporte.numTicketsGeneral)} />
          <Stat label="Total vendido" value={fmt(reporte.totalGeneral)} />
        </section>

        {reporte.filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas en el rango.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cajero</TableHead>
                <TableHead className="text-right"># Tickets</TableHead>
                <TableHead className="text-right">Ticket promedio</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.filas.map((f) => (
                <TableRow key={f.usuarioId}>
                  <TableCell>{f.usuarioNombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.numTickets}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(f.ticketPromedio)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmt(f.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
