import { requirePermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { csvResponse, toCsv } from "../../_csv";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const sp = new URL(req.url).searchParams;
  const ubicacionId = sp.get("ubicacionId") || undefined;
  const categoriaId = sp.get("categoriaId") || undefined;
  const soloConStock = sp.get("soloConStock") !== "no";

  const reporte = await reportesService.inventarioActual({ ubicacionId, categoriaId, soloConStock });

  const csv = toCsv(
    ["SKU", "Producto", "Categoría", "Ubicación", "Stock", "U.M.", "Costo unitario", "Valor costo", "Valor venta"],
    reporte.filas.map((f) => [
      f.sku,
      f.nombre,
      f.categoria ?? "",
      f.ubicacionNombre,
      f.stock,
      f.unidadMedida,
      f.costoUnitario,
      f.valorCosto,
      f.valorVenta,
    ]),
  );
  return csvResponse(csv, "inventario-actual.csv");
}
