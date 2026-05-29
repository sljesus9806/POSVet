import { requirePermission } from "@/lib/auth-helpers";
import {
  generarReportePDF,
  pdfFmt,
  pdfResponse,
  reportesService,
} from "@/lib/modules/reportes";
import { getEmpresaParaPdf } from "../../_empresa";
import { rangoFromSearch } from "../../_search";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const url = new URL(req.url);
  const rango = rangoFromSearch(url.searchParams);
  const [reporte, empresa] = await Promise.all([
    reportesService.ventasPorUsuario(rango),
    getEmpresaParaPdf(),
  ]);

  const filas = reporte.filas.map((f) => [
    f.usuarioNombre,
    { content: String(f.numTickets), styles: { halign: "right" as const } },
    { content: pdfFmt.mxn(f.ticketPromedio), styles: { halign: "right" as const } },
    { content: pdfFmt.mxn(f.total), styles: { halign: "right" as const } },
  ]);

  const buf = generarReportePDF({
    empresa,
    titulo: "Ventas por usuario",
    rango: { desde: reporte.rango.desde, hasta: reporte.rango.hasta },
    ubicacionNombre: reporte.ubicacionNombre,
    columnas: [
      { header: "Usuario" },
      { header: "# Tickets", align: "right" },
      { header: "Ticket promedio", align: "right" },
      { header: "Total", align: "right" },
    ],
    filas,
    totales: [
      { label: "Tickets totales", valor: String(reporte.numTicketsGeneral) },
      { label: "Total general", valor: pdfFmt.mxn(reporte.totalGeneral) },
    ],
  });

  return pdfResponse(buf, "ventas-por-usuario.pdf");
}
