import { requirePermission } from "@/lib/auth-helpers";
import { generarReportePDF, pdfFmt, pdfResponse, reportesService } from "@/lib/modules/reportes";
import { ventasService } from "@/lib/modules/ventas";
import { getEmpresaParaPdf } from "../../_empresa";
import { rangoFromSearch } from "../../_search";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const sp = new URL(req.url).searchParams;
  const empresa = await getEmpresaParaPdf();
  const cajaId = sp.get("cajaId");

  // ---- Corte formal de una caja ----
  if (cajaId) {
    const caja = await ventasService.obtenerCaja(cajaId);
    if (!caja) return new Response("Caja no encontrada", { status: 404 });
    const ventas = await ventasService.listarVentas({ cajaId: caja.id, limit: 500 });

    const filas = ventas.map((v) => [
      v.folio,
      { content: v.fechaVenta.toLocaleTimeString("es-MX"), styles: { halign: "left" as const } },
      { content: pdfFmt.mxn(v.total), styles: { halign: "right" as const } },
      v.estado === "CANCELADA" ? "Cancelada" : "OK",
    ]);

    const buf = generarReportePDF({
      empresa,
      titulo: `Corte de caja ${caja.folio}`,
      subtitulo: `${caja.ubicacionNombre} · ${caja.abiertaPorNombre} · ${caja.estado === "ABIERTA" ? "Abierta" : "Cerrada"}`,
      columnas: [
        { header: "Folio" },
        { header: "Hora" },
        { header: "Total", align: "right" },
        { header: "Estado" },
      ],
      filas: filas.length > 0 ? filas : [[{ content: "Sin ventas", colSpan: 4 } as never, "", "", ""]],
      totales: [
        { label: "Fondo inicial", valor: pdfFmt.mxn(caja.fondoInicial) },
        { label: "Total vendido", valor: pdfFmt.mxn(caja.totalVendido) },
        { label: "Efectivo esperado", valor: caja.montoEsperadoEfectivo != null ? pdfFmt.mxn(caja.montoEsperadoEfectivo) : "—" },
        { label: "Efectivo contado", valor: caja.montoContadoEfectivo != null ? pdfFmt.mxn(caja.montoContadoEfectivo) : "—" },
        { label: "Diferencia", valor: caja.diferenciaEfectivo != null ? pdfFmt.mxn(caja.diferenciaEfectivo) : "—" },
      ],
      notas:
        caja.desglosePorForma.length > 0
          ? [
              "Desglose por forma de pago:",
              ...caja.desglosePorForma.map((d) => `  ${d.forma}: ${pdfFmt.mxn(d.total)}`),
            ]
          : undefined,
    });
    return pdfResponse(buf, `corte-caja_${caja.folio}.pdf`);
  }

  // ---- Resumen de cajas por rango ----
  const rango = rangoFromSearch(sp, { diasPorDefecto: 7 });
  const reporte = await reportesService.corteCajas(rango);

  const filas = reporte.filas.map((c) => [
    c.folio,
    c.ubicacionNombre,
    c.abiertaPorNombre,
    c.estado === "ABIERTA" ? "Abierta" : "Cerrada",
    { content: pdfFmt.mxn(c.fondoInicial), styles: { halign: "right" as const } },
    { content: pdfFmt.mxn(c.totalVendido), styles: { halign: "right" as const } },
    { content: c.efectivoEsperado != null ? pdfFmt.mxn(c.efectivoEsperado) : "—", styles: { halign: "right" as const } },
    { content: c.montoContado != null ? pdfFmt.mxn(c.montoContado) : "—", styles: { halign: "right" as const } },
    { content: c.diferencia != null ? pdfFmt.mxn(c.diferencia) : "—", styles: { halign: "right" as const } },
  ]);

  const buf = generarReportePDF({
    empresa,
    titulo: "Corte de caja — resumen",
    rango: { desde: reporte.rango.desde, hasta: reporte.rango.hasta },
    ubicacionNombre: reporte.ubicacionNombre,
    columnas: [
      { header: "Caja" },
      { header: "Ubicación" },
      { header: "Cajero" },
      { header: "Estado" },
      { header: "Fondo", align: "right" },
      { header: "Vendido", align: "right" },
      { header: "Esperado", align: "right" },
      { header: "Contado", align: "right" },
      { header: "Diferencia", align: "right" },
    ],
    filas: filas.length > 0 ? filas : [[{ content: "Sin cajas en el rango", colSpan: 9 } as never, "", "", "", "", "", "", "", ""]],
    totales: [
      { label: "Cajas", valor: String(reporte.numCajas) },
      { label: "Total fondos", valor: pdfFmt.mxn(reporte.totalFondo) },
      { label: "Total vendido", valor: pdfFmt.mxn(reporte.totalVendido) },
      { label: "Total contado", valor: pdfFmt.mxn(reporte.totalContado) },
      { label: "Total diferencia", valor: pdfFmt.mxn(reporte.totalDiferencia) },
    ],
  });
  return pdfResponse(
    buf,
    `corte-caja_${rango.desde.toISOString().slice(0, 10)}_${rango.hasta.toISOString().slice(0, 10)}.pdf`,
  );
}
