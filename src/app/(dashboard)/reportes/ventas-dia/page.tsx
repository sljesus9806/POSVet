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
import {
  BarOrLineChart,
  ChartCard,
  DonutChart,
} from "@/components/reportes/chart-card";
import { FiltrosForm } from "../filtros-form";
import { PrintButton } from "../print-button";
import { PrintStyles } from "../print-styles";
import { formatearFecha, resolverRango, type RangoSearchParams } from "../_rango";
import { CsvLink, PdfLink } from "../_pdf-link";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const FORMA_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CREDITO: "Crédito",
};

type SearchParams = Promise<RangoSearchParams>;

export default async function VentasDiaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const datosHora = Array.from({ length: 24 }, (_, h) => {
    const row = reporte.porHora.find((p) => p.hora === h);
    return {
      hora: `${String(h).padStart(2, "0")}h`,
      total: row?.total ?? 0,
      tickets: row?.numTickets ?? 0,
    };
  });

  const datosForma = reporte.porFormaPago.map((p) => ({
    label: FORMA_LABEL[p.forma] ?? p.forma,
    valor: p.monto,
  }));

  const pdfHref = `/api/reportes/ventas-dia/pdf?desde=${rango.desdeStr}&hasta=${rango.hastaStr}${
    rango.ubicacionId ? `&ubicacionId=${rango.ubicacionId}` : ""
  }`;

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
        <div className="flex gap-2">
          <PdfLink href={pdfHref} />
          <CsvLink href={pdfHref.replace("/pdf", "/csv")} />
          <PrintButton />
        </div>
      </div>

      <FiltrosForm
        action="/reportes/ventas-dia"
        desde={rango.desdeStr}
        hasta={rango.hastaStr}
        ubicacionId={rango.ubicacionId}
        ubicaciones={ubicaciones}
      />

      <div className="print-card rounded-xl border bg-card p-5 space-y-5 shadow-sm">
        <header>
          <div className="text-lg font-semibold">Ventas del día</div>
          <div className="text-sm text-muted-foreground">
            {formatearFecha(reporte.rango.desde)} — {formatearFecha(reporte.rango.hasta)}
            {reporte.ubicacionNombre && ` · ${reporte.ubicacionNombre}`}
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total vendido" value={fmt(reporte.totalVendido)} highlight />
          <Stat label="# Tickets" value={String(reporte.numTickets)} />
          <Stat label="Ticket promedio" value={fmt(reporte.ticketPromedio)} />
          <Stat
            label="Canceladas"
            value={`${reporte.numTicketsCancelados} · ${fmt(reporte.totalCancelado)}`}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 no-print">
          <ChartCard
            title="Ventas por hora"
            subtitle="Total cobrado dentro de cada hora del día"
          >
            <BarOrLineChart
              data={datosHora}
              xKey="hora"
              yKeys={[{ key: "total", label: "Total" }]}
              type="bar"
              currency
            />
          </ChartCard>
        </div>
        <div className="no-print">
          <ChartCard
            title="Pagos por forma"
            subtitle={`${datosForma.length} formas registradas`}
          >
            {datosForma.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin pagos en el rango.
              </p>
            ) : (
              <DonutChart data={datosForma} currency />
            )}
          </ChartCard>
        </div>
      </div>

      <div className="print-card rounded-xl border bg-card p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 shadow-sm">
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
                    <TableCell className="text-right tabular-nums">
                      {h.numTickets}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(h.total)}
                    </TableCell>
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
                    <TableCell>{FORMA_LABEL[p.forma] ?? p.forma}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(p.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "bg-primary/5 border-primary/20" : "bg-background"
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-xl font-semibold tabular-nums mt-1 ${
          highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
