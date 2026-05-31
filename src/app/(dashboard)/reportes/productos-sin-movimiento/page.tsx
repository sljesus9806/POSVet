import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { reportesService } from "@/lib/modules/reportes";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PrintButton } from "../print-button";
import { PrintStyles } from "../print-styles";
import { CsvLink, PdfLink } from "../_pdf-link";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(n);
const fmtFecha = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);

type SearchParams = Promise<{
  dias?: string;
  categoriaId?: string;
  soloConStock?: string;
}>;

export default async function ProductosSinMovimientoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("reportes:leer");
  const sp = await searchParams;
  const dias = Number(sp.dias) >= 7 ? Number(sp.dias) : 60;
  const categoriaId = sp.categoriaId || undefined;
  const soloConStock = sp.soloConStock !== "no";

  const [reporte, categorias] = await Promise.all([
    reportesService.productosSinMovimiento({ dias, categoriaId, soloConStock }),
    prisma.categoria.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const params = new URLSearchParams();
  params.set("dias", String(dias));
  if (categoriaId) params.set("categoriaId", categoriaId);
  params.set("soloConStock", soloConStock ? "si" : "no");
  const pdfHref = `/api/reportes/productos-sin-movimiento/pdf?${params.toString()}`;

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
            <h2 className="text-2xl font-semibold tracking-tight">
              Productos sin movimiento
            </h2>
            <p className="text-sm text-muted-foreground">
              Inventario muerto: productos que no se han vendido en el último
              periodo.
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
        <div>
          <Label htmlFor="dias">Sin venta en los últimos</Label>
          <div className="flex items-center gap-2">
            <Input
              id="dias"
              name="dias"
              type="number"
              min={7}
              max={730}
              defaultValue={dias}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">días</span>
          </div>
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

      <div className="print-card grid grid-cols-2 md:grid-cols-3 gap-3 rounded-xl border bg-card p-5 shadow-sm">
        <Stat label="Productos sin movimiento" value={String(reporte.totalProductos)} highlight />
        <Stat label="Valor a costo (capital atrapado)" value={fmt(reporte.totalValorCosto)} />
        <Stat label="Corte" value={fmtFecha(reporte.fechaCorte)} />
      </div>

      <div className="print-card rounded-xl border bg-card p-5 shadow-sm">
        {reporte.filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos los productos han tenido movimiento en los últimos {dias} días.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Última venta</TableHead>
                <TableHead className="text-right">Días sin venta</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Valor a costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.filas.map((f) => (
                <TableRow key={f.productoId}>
                  <TableCell className="font-mono text-xs">{f.sku}</TableCell>
                  <TableCell>{f.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {f.categoria ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.ultimaVenta ? fmtFecha(f.ultimaVenta) : "Nunca"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {f.diasSinVenta >= 999999 ? "—" : f.diasSinVenta}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(f.stockTotal)} {f.unidadMedida}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(f.valorCosto)}
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
