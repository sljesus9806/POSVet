import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ventasService } from "@/lib/modules/ventas";
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
import { PrintButton } from "../../print-button";
import { PrintStyles } from "../../print-styles";
import { PdfLink } from "../../_pdf-link";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type Params = Promise<{ id: string }>;

export default async function CorteCajaDetallePage({ params }: { params: Params }) {
  await requirePermission("reportes:leer");
  const { id } = await params;
  const caja = await ventasService.obtenerCaja(id);
  if (!caja) notFound();
  const ventas = await ventasService.listarVentas({ cajaId: caja.id, limit: 500 });

  const meta: Array<[string, string]> = [
    ["Ubicación", caja.ubicacionNombre],
    ["Abierta por", `${caja.abiertaPorNombre} · ${caja.abiertaEn.toLocaleString("es-MX")}`],
    [
      "Cerrada por",
      caja.cerradaEn
        ? `${caja.cerradaPorNombre ?? "—"} · ${caja.cerradaEn.toLocaleString("es-MX")}`
        : "— (abierta)",
    ],
    ["Estado", caja.estado === "ABIERTA" ? "Abierta" : "Cerrada"],
  ];

  const figuras: Array<[string, number | null, boolean?]> = [
    ["Fondo inicial", caja.fondoInicial],
    ["Total vendido", caja.totalVendido],
    ["Efectivo esperado", caja.montoEsperadoEfectivo],
    ["Efectivo contado", caja.montoContadoEfectivo],
    ["Diferencia", caja.diferenciaEfectivo, true],
  ];

  return (
    <div className="space-y-6">
      <PrintStyles />

      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/reportes/corte-caja" aria-label="Volver">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Corte de caja <span className="font-mono">{caja.folio}</span>
            </h2>
            <p className="text-sm text-muted-foreground">Documento de arqueo de la sesión.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <PdfLink href={`/api/reportes/corte-caja/pdf?cajaId=${caja.id}`} />
          <PrintButton />
        </div>
      </div>

      <div className="print-card rounded-xl border bg-card p-5 space-y-5 shadow-sm">
        <header className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-lg font-semibold">Corte de caja {caja.folio}</div>
          {caja.estado === "ABIERTA" ? (
            <Badge variant="outline">Abierta</Badge>
          ) : (
            <Badge variant="secondary">Cerrada</Badge>
          )}
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {meta.map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-muted-foreground">{k}</div>
              <div className="text-sm font-medium">{v}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t pt-4">
          {figuras.map(([k, v, isDif]) => (
            <div key={k} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{k}</div>
              <div
                className={`text-lg font-semibold tabular-nums mt-1 ${
                  isDif && v != null && v !== 0 ? (v > 0 ? "text-green-600" : "text-destructive") : ""
                }`}
              >
                {v == null ? "—" : fmt(v)}
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-sm font-semibold mb-2">Desglose por forma de pago</h3>
            {caja.desglosePorForma.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caja.desglosePorForma.map((d) => (
                    <TableRow key={d.forma}>
                      <TableCell>{d.forma}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(d.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Ventas ({caja.totalVentas})</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Sin ventas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ventas.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.folio}</TableCell>
                        <TableCell className="text-sm">{v.fechaVenta.toLocaleTimeString("es-MX")}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(v.total)}</TableCell>
                        <TableCell>
                          {v.estado === "CANCELADA" ? (
                            <Badge variant="destructive">Cancelada</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        {caja.observacionesCierre && (
          <section className="border-t pt-3">
            <h3 className="text-sm font-semibold mb-1">Observaciones de cierre</h3>
            <p className="text-sm text-muted-foreground">{caja.observacionesCierre}</p>
          </section>
        )}
      </div>
    </div>
  );
}
