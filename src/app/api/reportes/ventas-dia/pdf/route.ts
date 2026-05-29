import { requirePermission } from "@/lib/auth-helpers";
import {
  generarReportePDF,
  pdfFmt,
  pdfResponse,
  reportesService,
} from "@/lib/modules/reportes";
import { getEmpresaParaPdf } from "../../_empresa";
import { rangoFromSearch } from "../../_search";

const FORMA_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CREDITO: "Crédito",
};

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const url = new URL(req.url);
  const rango = rangoFromSearch(url.searchParams);
  const [reporte, empresa] = await Promise.all([
    reportesService.ventasDelDia(rango),
    getEmpresaParaPdf(),
  ]);

  const filasHora = reporte.porHora.map((h) => [
    { content: `${String(h.hora).padStart(2, "0")}:00`, styles: { halign: "left" as const } },
    { content: String(h.numTickets), styles: { halign: "right" as const } },
    { content: pdfFmt.mxn(h.total), styles: { halign: "right" as const } },
  ]);

  const filasPagos = reporte.porFormaPago.map((p) => [
    { content: FORMA_LABEL[p.forma] ?? p.forma, styles: { halign: "left" as const } },
    { content: pdfFmt.mxn(p.monto), styles: { halign: "right" as const } },
  ]);

  // Construimos dos tablas como UN solo PDF: hora encima, pagos abajo.
  const buf = generarReportePDF({
    empresa,
    titulo: "Ventas del día",
    rango: { desde: reporte.rango.desde, hasta: reporte.rango.hasta },
    ubicacionNombre: reporte.ubicacionNombre,
    columnas: [
      { header: "Hora", align: "left" },
      { header: "# Tickets", align: "right" },
      { header: "Total", align: "right" },
    ],
    filas: filasHora.length > 0 ? filasHora : [[{ content: "Sin ventas en el rango", colSpan: 3 } as never, "", ""]],
    totales: [
      { label: "Total vendido", valor: pdfFmt.mxn(reporte.totalVendido) },
      { label: "Tickets", valor: String(reporte.numTickets) },
      { label: "Ticket promedio", valor: pdfFmt.mxn(reporte.ticketPromedio) },
      {
        label: "Canceladas",
        valor: `${reporte.numTicketsCancelados} · ${pdfFmt.mxn(reporte.totalCancelado)}`,
      },
    ],
    notas:
      filasPagos.length > 0
        ? [
            "Pagos por forma:",
            ...reporte.porFormaPago.map(
              (p) => `  ${FORMA_LABEL[p.forma] ?? p.forma}: ${pdfFmt.mxn(p.monto)}`,
            ),
          ]
        : undefined,
  });

  const fileName = `ventas-dia_${rango.desde.toISOString().slice(0, 10)}_${rango.hasta
    .toISOString()
    .slice(0, 10)}.pdf`;
  return pdfResponse(buf, fileName);
}
