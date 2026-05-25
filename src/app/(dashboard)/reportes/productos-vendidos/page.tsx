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
const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(n);

type SearchParams = Promise<RangoSearchParams>;

export default async function ProductosVendidosPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("reportes:leer");
  const sp = await searchParams;
  const rango = resolverRango(sp, { diasPorDefecto: 7 });

  const [reporte, ubicaciones] = await Promise.all([
    reportesService.productosVendidos({
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
            <h2 className="text-2xl font-semibold tracking-tight">Productos vendidos</h2>
            <p className="text-sm text-muted-foreground">
              Ranking por monto vendido; incluye también cantidad total.
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <FiltrosForm
        action="/reportes/productos-vendidos"
        desde={rango.desdeStr}
        hasta={rango.hastaStr}
        ubicacionId={rango.ubicacionId}
        ubicaciones={ubicaciones}
      />

      <div className="print-card rounded-lg border bg-card p-5 space-y-4">
        <header>
          <div className="text-lg font-semibold">Productos vendidos</div>
          <div className="text-sm text-muted-foreground">
            {formatearFecha(reporte.rango.desde)} — {formatearFecha(reporte.rango.hasta)}
            {reporte.ubicacionNombre && ` · ${reporte.ubicacionNombre}`}
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Productos distintos" value={String(reporte.filas.length)} />
          <Stat label="Cantidad total" value={fmtNum(reporte.totalCantidad)} />
          <Stat label="Monto total" value={fmt(reporte.totalMonto)} />
        </section>

        {reporte.filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas en el rango.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.filas.map((f, i) => (
                <TableRow key={f.productoId}>
                  <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{f.sku}</TableCell>
                  <TableCell>{f.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {f.categoria ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(f.cantidad)} {f.unidadMedida}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmt(f.montoTotal)}
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
