import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { reportesService } from "@/lib/modules/reportes";
import { requirePermission } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
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
import { CsvLink, PdfLink } from "../_pdf-link";
import { formatearFecha, resolverRango, type RangoSearchParams } from "../_rango";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type SearchParams = Promise<RangoSearchParams>;

export default async function CorteCajaPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("reportes:leer");
  const sp = await searchParams;
  const rango = resolverRango(sp, { diasPorDefecto: 7 });

  const [reporte, ubicaciones] = await Promise.all([
    reportesService.corteCajas({ desde: rango.desde, hasta: rango.hasta, ubicacionId: rango.ubicacionId }),
    prisma.ubicacion.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const q = `desde=${rango.desdeStr}&hasta=${rango.hastaStr}${
    rango.ubicacionId ? `&ubicacionId=${rango.ubicacionId}` : ""
  }`;

  const dif = (n: number | null) => (n == null ? "—" : fmt(n));
  const difClass = (n: number | null) =>
    n == null || n === 0 ? "" : n > 0 ? "text-green-600" : "text-destructive";

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
            <h2 className="text-2xl font-semibold tracking-tight">Corte de caja</h2>
            <p className="text-sm text-muted-foreground">
              Cajas (sesiones) en el rango, con esperado vs contado y diferencia.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <PdfLink href={`/api/reportes/corte-caja/pdf?${q}`} />
          <CsvLink href={`/api/reportes/corte-caja/csv?${q}`} />
          <PrintButton />
        </div>
      </div>

      <FiltrosForm
        action="/reportes/corte-caja"
        desde={rango.desdeStr}
        hasta={rango.hastaStr}
        ubicacionId={rango.ubicacionId}
        ubicaciones={ubicaciones}
      />

      <div className="print-card rounded-xl border bg-card p-5 space-y-4 shadow-sm">
        <header>
          <div className="text-lg font-semibold">Corte de caja</div>
          <div className="text-sm text-muted-foreground">
            {formatearFecha(reporte.rango.desde)} — {formatearFecha(reporte.rango.hasta)}
            {reporte.ubicacionNombre && ` · ${reporte.ubicacionNombre}`}
          </div>
        </header>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caja</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Cajero</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Fondo</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Contado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead className="no-print"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reporte.filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    Sin cajas en el rango.
                  </TableCell>
                </TableRow>
              ) : (
                reporte.filas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.folio}</TableCell>
                    <TableCell className="text-sm">{c.ubicacionNombre}</TableCell>
                    <TableCell className="text-sm">{c.abiertaPorNombre}</TableCell>
                    <TableCell>
                      {c.estado === "ABIERTA" ? (
                        <Badge variant="outline">Abierta</Badge>
                      ) : (
                        <Badge variant="secondary">Cerrada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(c.fondoInicial)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(c.totalVendido)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dif(c.efectivoEsperado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dif(c.montoContado)}</TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${difClass(c.diferencia)}`}>
                      {dif(c.diferencia)}
                    </TableCell>
                    <TableCell className="text-right no-print">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/reportes/corte-caja/${c.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap justify-end gap-x-8 gap-y-1 border-t pt-3 text-sm">
          <span className="text-muted-foreground">
            Cajas: <b className="text-foreground tabular-nums">{reporte.numCajas}</b>
          </span>
          <span className="text-muted-foreground">
            Fondos: <b className="text-foreground tabular-nums">{fmt(reporte.totalFondo)}</b>
          </span>
          <span className="text-muted-foreground">
            Vendido: <b className="text-foreground tabular-nums">{fmt(reporte.totalVendido)}</b>
          </span>
          <span className="text-muted-foreground">
            Contado: <b className="text-foreground tabular-nums">{fmt(reporte.totalContado)}</b>
          </span>
          <span className="text-muted-foreground">
            Diferencia: <b className={`tabular-nums ${difClass(reporte.totalDiferencia)}`}>{fmt(reporte.totalDiferencia)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
