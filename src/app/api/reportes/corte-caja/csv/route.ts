import { requirePermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { ventasService } from "@/lib/modules/ventas";
import { csvResponse, toCsv } from "../../_csv";
import { rangoFromSearch } from "../../_search";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const sp = new URL(req.url).searchParams;
  const cajaId = sp.get("cajaId");

  // ---- Ventas de una caja (corte individual) ----
  if (cajaId) {
    const caja = await ventasService.obtenerCaja(cajaId);
    if (!caja) return new Response("Caja no encontrada", { status: 404 });
    const ventas = await ventasService.listarVentas({ cajaId: caja.id, limit: 1000 });
    const csv = toCsv(
      ["Folio", "Fecha", "Cliente", "Total", "Estado"],
      ventas.map((v) => [v.folio, v.fechaVenta.toISOString(), v.clienteNombre ?? "", v.total, v.estado]),
    );
    return csvResponse(csv, `corte-caja_${caja.folio}.csv`);
  }

  // ---- Resumen de cajas por rango ----
  const rango = rangoFromSearch(sp, { diasPorDefecto: 7 });
  const reporte = await reportesService.corteCajas(rango);
  const csv = toCsv(
    [
      "Caja",
      "Ubicación",
      "Cajero",
      "Cerrada por",
      "Estado",
      "Abierta",
      "Cerrada",
      "Fondo inicial",
      "Total vendido",
      "Ventas",
      "Efectivo esperado",
      "Efectivo contado",
      "Diferencia",
    ],
    reporte.filas.map((c) => [
      c.folio,
      c.ubicacionNombre,
      c.abiertaPorNombre,
      c.cerradaPorNombre ?? "",
      c.estado,
      c.abiertaEn.toISOString(),
      c.cerradaEn ? c.cerradaEn.toISOString() : "",
      c.fondoInicial,
      c.totalVendido,
      c.numVentas,
      c.efectivoEsperado ?? "",
      c.montoContado ?? "",
      c.diferencia ?? "",
    ]),
  );
  return csvResponse(
    csv,
    `corte-caja_${rango.desde.toISOString().slice(0, 10)}_${rango.hasta.toISOString().slice(0, 10)}.csv`,
  );
}
