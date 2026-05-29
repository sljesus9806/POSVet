import { requirePermission } from "@/lib/auth-helpers";
import {
  generarReportePDF,
  pdfFmt,
  pdfResponse,
  reportesService,
} from "@/lib/modules/reportes";
import { getEmpresaParaPdf } from "../../_empresa";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const sp = new URL(req.url).searchParams;
  const ubicacionId = sp.get("ubicacionId") || undefined;
  const categoriaId = sp.get("categoriaId") || undefined;
  const soloConStock = sp.get("soloConStock") !== "no";

  const [reporte, empresa] = await Promise.all([
    reportesService.inventarioActual({ ubicacionId, categoriaId, soloConStock }),
    getEmpresaParaPdf(),
  ]);

  const filas = reporte.filas.map((f) => [
    f.sku,
    f.nombre,
    f.categoria ?? "—",
    f.ubicacionNombre,
    { content: pdfFmt.num(f.stock, 2) + " " + f.unidadMedida, styles: { halign: "right" as const } },
    { content: pdfFmt.mxn(f.costoUnitario), styles: { halign: "right" as const } },
    { content: pdfFmt.mxn(f.valorCosto), styles: { halign: "right" as const } },
    { content: pdfFmt.mxn(f.valorVenta), styles: { halign: "right" as const } },
  ]);

  const subParts: string[] = [];
  if (reporte.soloConStock) subParts.push("Solo con stock > 0");
  if (reporte.categoriaNombre) subParts.push(`Categoría: ${reporte.categoriaNombre}`);

  const buf = generarReportePDF({
    empresa,
    titulo: "Inventario actual valorizado",
    subtitulo: subParts.length > 0 ? subParts.join(" · ") : null,
    ubicacionNombre: reporte.ubicacionNombre,
    columnas: [
      { header: "SKU" },
      { header: "Producto" },
      { header: "Categoría" },
      { header: "Ubicación" },
      { header: "Stock", align: "right" },
      { header: "Costo unit.", align: "right" },
      { header: "Valor costo", align: "right" },
      { header: "Valor venta", align: "right" },
    ],
    filas,
    totales: [
      { label: "Capital invertido", valor: pdfFmt.mxn(reporte.totalCosto) },
      { label: "Valor a precio venta", valor: pdfFmt.mxn(reporte.totalVenta) },
      { label: "Margen potencial", valor: pdfFmt.mxn(reporte.margenPotencial) },
    ],
    notas:
      reporte.porCategoria.length > 0
        ? [
            "Por categoría (valor a costo):",
            ...reporte.porCategoria.map(
              (c) => `  ${c.categoria}: ${pdfFmt.mxn(c.valorCosto)}`,
            ),
          ]
        : undefined,
  });

  return pdfResponse(buf, "inventario-actual.pdf");
}
