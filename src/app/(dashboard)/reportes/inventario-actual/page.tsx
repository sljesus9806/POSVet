import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { reportesService } from "@/lib/modules/reportes";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarOrLineChart, ChartCard } from "@/components/reportes/chart-card";
import { PrintButton } from "../print-button";
import { PrintStyles } from "../print-styles";
import { CsvLink, PdfLink } from "../_pdf-link";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(n);

type SearchParams = Promise<{
  ubicacionId?: string;
  categoriaId?: string;
  soloConStock?: string;
}>;

export default async function InventarioActualPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("reportes:leer");
  const sp = await searchParams;
  const ubicacionId = sp.ubicacionId || undefined;
  const categoriaId = sp.categoriaId || undefined;
  const soloConStock = sp.soloConStock !== "no";

  const [reporte, ubicaciones, categorias] = await Promise.all([
    reportesService.inventarioActual({ ubicacionId, categoriaId, soloConStock }),
    prisma.ubicacion.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.categoria.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const params = new URLSearchParams();
  if (ubicacionId) params.set("ubicacionId", ubicacionId);
  if (categoriaId) params.set("categoriaId", categoriaId);
  params.set("soloConStock", soloConStock ? "si" : "no");
  const pdfHref = `/api/reportes/inventario-actual/pdf?${params.toString()}`;

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
            <h2 className="text-2xl font-semibold tracking-tight">Inventario actual</h2>
            <p className="text-sm text-muted-foreground">
              Stock por ubicación valorizado a costo y a precio de venta.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <PdfLink href={pdfHref} />
          <CsvLink href={pdfHref.replace("/pdf", "/csv")} />
          <PrintButton />
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border no-print">
        <div className="min-w-[180px]">
          <Label htmlFor="ubicacionId">Ubicación</Label>
          <select
            id="ubicacionId"
            name="ubicacionId"
            defaultValue={ubicacionId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="">Todas</option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <Label htmlFor="categoriaId">Categoría</Label>
          <select
            id="categoriaId"
            name="categoriaId"
            defaultValue={categoriaId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input
            type="checkbox"
            name="soloConStock"
            value="no"
            defaultChecked={!soloConStock}
            className="size-4"
          />
          Incluir productos sin stock
        </label>
        <Button type="submit" variant="outline" size="sm">
          Aplicar
        </Button>
      </form>

      <div className="print-card grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border bg-card p-5 shadow-sm">
        <Stat
          label="Capital invertido"
          value={fmt(reporte.totalCosto)}
          highlight
        />
        <Stat label="Valor a precio venta" value={fmt(reporte.totalVenta)} />
        <Stat label="Margen potencial" value={fmt(reporte.margenPotencial)} />
        <Stat
          label="Líneas de inventario"
          value={String(reporte.filas.length)}
        />
      </div>

      {reporte.porCategoria.length > 0 && (
        <div className="no-print">
          <ChartCard
            title="Capital invertido por categoría"
            subtitle="Valor a costo agrupado por categoría"
          >
            <BarOrLineChart
              data={reporte.porCategoria.map((c) => ({
                categoria:
                  c.categoria.length > 18
                    ? c.categoria.slice(0, 16) + "…"
                    : c.categoria,
                valor: c.valorCosto,
              }))}
              xKey="categoria"
              yKeys={[{ key: "valor", label: "Valor a costo" }]}
              type="bar"
              currency
              height={280}
            />
          </ChartCard>
        </div>
      )}

      <div className="print-card rounded-xl border bg-card p-5 space-y-4 shadow-sm">
        {reporte.filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay inventario con los filtros aplicados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Valor a costo</TableHead>
                <TableHead className="text-right">Valor a venta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.filas.map((f) => (
                <TableRow key={`${f.productoId}_${f.ubicacionId}`}>
                  <TableCell className="font-mono text-xs">{f.sku}</TableCell>
                  <TableCell>{f.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {f.categoria ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {f.ubicacionNombre}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(f.stock)} {f.unidadMedida}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {fmt(f.costoUnitario)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmt(f.valorCosto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(f.valorVenta)}
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
