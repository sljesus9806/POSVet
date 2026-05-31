import { requirePermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { csvResponse, fechaIso, toCsv } from "../../_csv";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const sp = new URL(req.url).searchParams;
  const dias = Number(sp.get("dias")) >= 7 ? Number(sp.get("dias")) : 60;
  const categoriaId = sp.get("categoriaId") || undefined;
  const soloConStock = sp.get("soloConStock") !== "no";

  const reporte = await reportesService.productosSinMovimiento({ dias, categoriaId, soloConStock });

  const csv = toCsv(
    ["SKU", "Producto", "Categoría", "Última venta", "Días sin venta", "Stock", "U.M.", "Valor costo"],
    reporte.filas.map((f) => [
      f.sku,
      f.nombre,
      f.categoria ?? "",
      f.ultimaVenta ? fechaIso(f.ultimaVenta) : "Nunca",
      f.diasSinVenta >= 999999 ? "" : f.diasSinVenta,
      f.stockTotal,
      f.unidadMedida,
      f.valorCosto,
    ]),
  );
  return csvResponse(csv, `productos-sin-movimiento_${dias}d.csv`);
}
