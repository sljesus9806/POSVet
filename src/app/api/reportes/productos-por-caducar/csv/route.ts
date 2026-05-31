import { requirePermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { csvResponse, fechaIso, toCsv } from "../../_csv";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const sp = new URL(req.url).searchParams;
  const dias = Number(sp.get("dias")) > 0 ? Number(sp.get("dias")) : 90;

  const reporte = await reportesService.productosPorCaducar({ dias });

  const csv = toCsv(
    ["SKU", "Producto", "Lote", "Caducidad", "Días para caducar", "Cantidad", "U.M.", "Costo unitario", "Valor costo", "Bucket"],
    reporte.filas.map((f) => [
      f.sku,
      f.nombre,
      f.lote,
      fechaIso(f.caducidad),
      f.diasParaCaducar,
      f.cantidad,
      f.unidadMedida,
      f.costoUnitario,
      f.cantidad * f.costoUnitario,
      f.bucket,
    ]),
  );
  return csvResponse(csv, `productos-por-caducar_${dias}d.csv`);
}
