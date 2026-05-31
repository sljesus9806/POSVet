import { requirePermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { csvResponse, toCsv } from "../../_csv";
import { rangoFromSearch } from "../../_search";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const rango = rangoFromSearch(new URL(req.url).searchParams, { diasPorDefecto: 30 });
  const reporte = await reportesService.productosVendidos(rango);

  const csv = toCsv(
    ["SKU", "Producto", "Categoría", "Cantidad", "U.M.", "Monto"],
    reporte.filas.map((f) => [f.sku, f.nombre, f.categoria ?? "", f.cantidad, f.unidadMedida, f.montoTotal]),
  );
  return csvResponse(csv, "productos-vendidos.csv");
}
