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
  const dias = Number(sp.get("dias")) >= 7 ? Number(sp.get("dias")) : 60;
  const categoriaId = sp.get("categoriaId") || undefined;
  const soloConStock = sp.get("soloConStock") !== "no";

  const [reporte, empresa] = await Promise.all([
    reportesService.productosSinMovimiento({ dias, categoriaId, soloConStock }),
    getEmpresaParaPdf(),
  ]);

  const filas = reporte.filas.map((f) => [
    f.sku,
    f.nombre,
    f.categoria ?? "—",
    f.ultimaVenta ? pdfFmt.fecha(f.ultimaVenta) : "Nunca",
    {
      content: f.diasSinVenta >= 999999 ? "—" : String(f.diasSinVenta),
      styles: { halign: "right" as const },
    },
    {
      content: pdfFmt.num(f.stockTotal, 2) + " " + f.unidadMedida,
      styles: { halign: "right" as const },
    },
    { content: pdfFmt.mxn(f.valorCosto), styles: { halign: "right" as const } },
  ]);

  const subParts: string[] = [`Últimos ${dias} días`];
  if (reporte.categoriaNombre) subParts.push(`Categoría: ${reporte.categoriaNombre}`);
  if (reporte.soloConStock) subParts.push("Solo con stock > 0");

  const buf = generarReportePDF({
    empresa,
    titulo: "Productos sin movimiento",
    subtitulo: subParts.join(" · "),
    columnas: [
      { header: "SKU" },
      { header: "Producto" },
      { header: "Categoría" },
      { header: "Última venta" },
      { header: "Días", align: "right" },
      { header: "Stock", align: "right" },
      { header: "Valor costo", align: "right" },
    ],
    filas,
    totales: [
      { label: "Productos sin movimiento", valor: String(reporte.totalProductos) },
      { label: "Capital atrapado (valor a costo)", valor: pdfFmt.mxn(reporte.totalValorCosto) },
    ],
  });

  return pdfResponse(buf, "productos-sin-movimiento.pdf");
}
