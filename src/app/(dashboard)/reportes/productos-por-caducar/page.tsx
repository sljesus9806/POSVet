import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { reportesService } from "@/lib/modules/reportes";
import { requirePermission } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
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
import { BarOrLineChart, ChartCard } from "@/components/reportes/chart-card";
import { PrintButton } from "../print-button";
import { PrintStyles } from "../print-styles";
import { PdfLink } from "../_pdf-link";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(n);
const fmtFecha = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);

type SearchParams = Promise<{ dias?: string }>;

export default async function ProductosPorCaducarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("reportes:leer");
  const sp = await searchParams;
  const dias = Number(sp.dias) > 0 ? Number(sp.dias) : 90;

  const reporte = await reportesService.productosPorCaducar({ dias });

  const pdfHref = `/api/reportes/productos-por-caducar/pdf?dias=${dias}`;

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
              Productos por caducar
            </h2>
            <p className="text-sm text-muted-foreground">
              Lotes con caducidad próxima o vencidos.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <PdfLink href={pdfHref} />
          <PrintButton />
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border no-print">
        <div>
          <Label htmlFor="dias">Mostrar lotes a vencer en los próximos</Label>
          <div className="flex items-center gap-2">
            <Input
              id="dias"
              name="dias"
              type="number"
              min={1}
              max={365}
              defaultValue={dias}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">días</span>
          </div>
        </div>
        <Button type="submit" variant="outline" size="sm">
          Aplicar
        </Button>
      </form>

      <div className="print-card grid grid-cols-2 md:grid-cols-5 gap-3 rounded-xl border bg-card p-5 shadow-sm">
        {reporte.porBucket.map((b) => (
          <BucketStat key={b.bucket} label={b.label} num={b.numLotes} valor={b.valorCosto} bucket={b.bucket} />
        ))}
      </div>

      {reporte.porBucket.some((b) => b.valorCosto > 0) && (
        <div className="no-print">
          <ChartCard
            title="Valor a costo por bucket"
            subtitle="Inversión en riesgo según ventana de caducidad"
          >
            <BarOrLineChart
              data={reporte.porBucket.map((b) => ({
                bucket: b.label,
                valor: b.valorCosto,
              }))}
              xKey="bucket"
              yKeys={[{ key: "valor", label: "Valor a costo" }]}
              type="bar"
              currency
              height={260}
            />
          </ChartCard>
        </div>
      )}

      <div className="print-card rounded-xl border bg-card p-5 shadow-sm">
        {reporte.filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay lotes que venzan en los próximos {dias} días.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Caducidad</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Valor a costo</TableHead>
                <TableHead>Bucket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.filas.map((f) => (
                <TableRow key={f.loteId}>
                  <TableCell className="font-mono text-xs">{f.sku}</TableCell>
                  <TableCell>{f.nombre}</TableCell>
                  <TableCell className="font-mono text-xs">{f.lote}</TableCell>
                  <TableCell>{fmtFecha(f.caducidad)}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${
                      f.diasParaCaducar < 0
                        ? "text-destructive"
                        : f.diasParaCaducar <= 30
                          ? "text-[var(--warning-foreground)]"
                          : ""
                    }`}
                  >
                    {f.diasParaCaducar}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(f.cantidad)} {f.unidadMedida}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(f.cantidad * f.costoUnitario)}
                  </TableCell>
                  <TableCell>
                    <BucketBadge bucket={f.bucket} />
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

function BucketStat({
  label,
  num,
  valor,
  bucket,
}: {
  label: string;
  num: number;
  valor: number;
  bucket: string;
}) {
  const tone =
    bucket === "vencidos"
      ? "bg-destructive/10 border-destructive/30 text-destructive"
      : bucket === "0-30"
        ? "bg-[var(--warning)]/15 border-[var(--warning)]/40"
        : "bg-background";
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums mt-1">{num}</div>
      <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
        {fmt(valor)}
      </div>
    </div>
  );
}

function BucketBadge({ bucket }: { bucket: string }) {
  if (bucket === "vencidos") return <Badge variant="destructive">Vencidos</Badge>;
  if (bucket === "0-30") return <Badge variant="warning">0–30 d</Badge>;
  if (bucket === "31-60") return <Badge variant="info">31–60 d</Badge>;
  if (bucket === "61-90") return <Badge variant="outline">61–90 d</Badge>;
  return <Badge variant="secondary">+90 d</Badge>;
}
