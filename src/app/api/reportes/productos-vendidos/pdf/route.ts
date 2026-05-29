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
  const rango = rangoFromSearch(url.searchParams, { diasPorDefecto: 30 });
  const [reporte, empresa] = await Promise.all([
    reportesService.productosVendidos(rango),
    getEmpresaParaPdf(),
  ]);

  const filas = reporte.filas.map((f) => [
    f.sku,
    f.nombre,
    f.categoria ?? "—",
    { content: pdfFmt.num(f.cantidad, 2), styles: { halign: "right" as const } },
    f.unidadMedida,
    { content: pdfFmt.mxn(f.montoTotal), styles: { halign: "right" as const } },
  ]);

  const buf = generarReportePDF({
    empresa,
    titulo: "Productos vendidos",
    rango: { desde: reporte.rango.desde, hasta: reporte.rango.hasta },
    ubicacionNombre: reporte.ubicacionNombre,
    columnas: [
      { header: "SKU" },
      { header: "Producto" },
      { header: "Categoría" },
      { header: "Cantidad", align: "right" },
      { header: "U.M." },
      { header: "Monto", align: "right" },
    ],
    filas,
    totales: [
      { label: "Productos distintos", valor: String(reporte.filas.length) },
      { label: "Cantidad total", valor: pdfFmt.num(reporte.totalCantidad, 2) },
      { label: "Monto total", valor: pdfFmt.mxn(reporte.totalMonto) },
    ],
  });

  return pdfResponse(buf, "productos-vendidos.pdf");
}
