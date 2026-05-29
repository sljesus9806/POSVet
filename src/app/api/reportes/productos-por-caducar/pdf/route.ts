import { requirePermission } from "@/lib/auth-helpers";
import {
  generarReportePDF,
  pdfFmt,
  pdfResponse,
  reportesService,
} from "@/lib/modules/reportes";
import { getEmpresaParaPdf } from "../../_empresa";

const BUCKET_LABEL: Record<string, string> = {
  vencidos: "Vencidos",
  "0-30": "0-30 d",
  "31-60": "31-60 d",
  "61-90": "61-90 d",
  "mas-90": "+90 d",
};

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const sp = new URL(req.url).searchParams;
  const dias = Number(sp.get("dias")) > 0 ? Number(sp.get("dias")) : 90;

  const [reporte, empresa] = await Promise.all([
    reportesService.productosPorCaducar({ dias }),
    getEmpresaParaPdf(),
  ]);

  const filas = reporte.filas.map((f) => [
    f.sku,
    f.nombre,
    f.lote,
    pdfFmt.fecha(f.caducidad),
    { content: String(f.diasParaCaducar), styles: { halign: "right" as const } },
    {
      content: pdfFmt.num(f.cantidad, 2) + " " + f.unidadMedida,
      styles: { halign: "right" as const },
    },
    {
      content: pdfFmt.mxn(f.cantidad * f.costoUnitario),
      styles: { halign: "right" as const },
    },
    BUCKET_LABEL[f.bucket] ?? f.bucket,
  ]);

  const buf = generarReportePDF({
    empresa,
    titulo: "Productos por caducar",
    subtitulo: `Ventana: ${dias} días`,
    columnas: [
      { header: "SKU" },
      { header: "Producto" },
      { header: "Lote" },
      { header: "Caducidad" },
      { header: "Días", align: "right" },
      { header: "Cantidad", align: "right" },
      { header: "Valor costo", align: "right" },
      { header: "Bucket" },
    ],
    filas,
    totales: [
      { label: "Lotes en riesgo", valor: String(reporte.totalLotes) },
      { label: "Valor en riesgo", valor: pdfFmt.mxn(reporte.totalValorCosto) },
    ],
    notas: [
      "Distribución por bucket:",
      ...reporte.porBucket
        .filter((b) => b.numLotes > 0)
        .map(
          (b) =>
            `  ${b.label}: ${b.numLotes} lotes — ${pdfFmt.mxn(b.valorCosto)}`,
        ),
    ],
  });

  return pdfResponse(buf, "productos-por-caducar.pdf");
}
