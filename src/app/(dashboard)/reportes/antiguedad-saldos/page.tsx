import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
import { BarOrLineChart, ChartCard } from "@/components/reportes/chart-card";
import { PrintButton } from "../print-button";
import { PrintStyles } from "../print-styles";
import { CsvLink, PdfLink } from "../_pdf-link";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type SearchParams = Promise<{ tipo?: string }>;

type Tipo = "cxc" | "cxp";
const TABS: Array<{ id: Tipo; label: string }> = [
  { id: "cxc", label: "Cuentas por cobrar" },
  { id: "cxp", label: "Cuentas por pagar" },
];

export default async function AntiguedadSaldosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("reportes:leer");
  const sp = await searchParams;
  const tipoReq = (sp.tipo ?? "cxc") as Tipo;
  const tipo: Tipo = TABS.some((t) => t.id === tipoReq) ? tipoReq : "cxc";

  const reporteCxC = tipo === "cxc" ? await reportesService.antiguedadSaldosCxC() : null;
  const reporteCxP = tipo === "cxp" ? await reportesService.antiguedadSaldosCxP() : null;

  const titulo = tipo === "cxc" ? "Cuentas por cobrar (CxC)" : "Cuentas por pagar (CxP)";
  const labelEntidad = tipo === "cxc" ? "Cliente" : "Proveedor";

  const totales = tipo === "cxc"
    ? {
        general: reporteCxC?.totalGeneral ?? 0,
        b1: reporteCxC?.totalBucket0_30 ?? 0,
        b2: reporteCxC?.totalBucket31_60 ?? 0,
        b3: reporteCxC?.totalBucket61_90 ?? 0,
        b4: reporteCxC?.totalBucketMas90 ?? 0,
      }
    : {
        general: reporteCxP?.totalGeneral ?? 0,
        b1: reporteCxP?.totalBucket0_30 ?? 0,
        b2: reporteCxP?.totalBucket31_60 ?? 0,
        b3: reporteCxP?.totalBucket61_90 ?? 0,
        b4: reporteCxP?.totalBucketMas90 ?? 0,
      };

  const filas =
    tipo === "cxc"
      ? (reporteCxC?.filas ?? []).map((f) => ({
          id: f.clienteId,
          codigo: f.clienteCodigo,
          nombre: f.clienteNombre,
          numDocs: f.numDocumentos,
          b1: f.bucket0_30,
          b2: f.bucket31_60,
          b3: f.bucket61_90,
          b4: f.bucketMas90,
          total: f.total,
        }))
      : (reporteCxP?.filas ?? []).map((f) => ({
          id: f.proveedorId,
          codigo: f.proveedorCodigo,
          nombre: f.proveedorNombre,
          numDocs: f.numDocumentos,
          b1: f.bucket0_30,
          b2: f.bucket31_60,
          b3: f.bucket61_90,
          b4: f.bucketMas90,
          total: f.total,
        }));

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
            <h2 className="text-2xl font-semibold tracking-tight">Antigüedad de saldos</h2>
            <p className="text-sm text-muted-foreground">
              Buckets 0–30 / 31–60 / 61–90 / +90 días.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <PdfLink href={`/api/reportes/antiguedad-saldos/pdf?tipo=${tipo}`} />
          <CsvLink href={`/api/reportes/antiguedad-saldos/csv?tipo=${tipo}`} />
          <PrintButton />
        </div>
      </div>

      <nav className="flex gap-1 border-b no-print">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/reportes/antiguedad-saldos?tipo=${t.id}`}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              t.id === tipo
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="print-card grid grid-cols-2 md:grid-cols-5 gap-3 rounded-xl border bg-card p-5 shadow-sm">
        <Stat label="Total adeudado" value={fmt(totales.general)} highlight />
        <Stat label="0–30 días" value={fmt(totales.b1)} />
        <Stat label="31–60 días" value={fmt(totales.b2)} />
        <Stat label="61–90 días" value={fmt(totales.b3)} />
        <Stat label="+90 días" value={fmt(totales.b4)} tone="danger" />
      </div>

      {totales.general > 0 && (
        <div className="no-print">
          <ChartCard
            title="Distribución por bucket"
            subtitle={titulo}
          >
            <BarOrLineChart
              data={[
                { bucket: "0–30 d", valor: totales.b1 },
                { bucket: "31–60 d", valor: totales.b2 },
                { bucket: "61–90 d", valor: totales.b3 },
                { bucket: "+90 d", valor: totales.b4 },
              ]}
              xKey="bucket"
              yKeys={[{ key: "valor", label: "Monto" }]}
              type="bar"
              currency
              height={260}
            />
          </ChartCard>
        </div>
      )}

      <div className="print-card rounded-xl border bg-card p-5 shadow-sm">
        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay saldos abiertos.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>{labelEntidad}</TableHead>
                <TableHead className="text-right">Docs</TableHead>
                <TableHead className="text-right">0–30</TableHead>
                <TableHead className="text-right">31–60</TableHead>
                <TableHead className="text-right">61–90</TableHead>
                <TableHead className="text-right">+90</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.codigo}</TableCell>
                  <TableCell>{f.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.numDocs}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(f.b1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(f.b2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(f.b3)}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    {fmt(f.b4)}
                  </TableCell>
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

function Stat({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "danger";
}) {
  let cls = "bg-background";
  if (highlight) cls = "bg-primary/5 border-primary/20";
  else if (tone === "danger") cls = "bg-destructive/5 border-destructive/30";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-xl font-semibold tabular-nums mt-1 ${
          highlight ? "text-primary" : tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
