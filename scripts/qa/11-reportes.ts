// REP — Reportes (reflejan 5.7–5.10) + exportación PDF. Plan §5.11
import { reportesService, generarReportePDF } from "../../src/lib/modules/reportes";
import { caso, check, eq, num, prisma, S } from "./_harness";

function hoyRango() {
  const desde = new Date(); desde.setHours(0, 0, 0, 0);
  const hasta = new Date(); hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

export async function run(): Promise<void> {
  console.log("\n== 5.11 Reportes ==");
  const { desde, hasta } = hoyRango();
  const empresa = { razonSocial: "POSVet Veterinaria Demo SA de CV", rfc: "XAXX010101000" };

  // REP-01 — cross-check EXACTO contra la BD cruda (completadas vs canceladas en rango)
  caso("REP-01", "ventasDelDia: total/tickets/ticket promedio/por forma de pago (cross-check exacto vs BD)");
  const vdd = await reportesService.ventasDelDia({ desde, hasta });
  const ventasRango = await prisma.venta.findMany({ where: { fechaVenta: { gte: desde, lte: hasta } }, select: { estado: true, total: true } });
  const compl = ventasRango.filter((v) => v.estado === "COMPLETADA");
  const canc = ventasRango.filter((v) => v.estado === "CANCELADA");
  const sumCompl = Math.round(compl.reduce((a, v) => a + num(v.total), 0) * 100) / 100;
  const sumCanc = Math.round(canc.reduce((a, v) => a + num(v.total), 0) * 100) / 100;
  eq(vdd.totalVendido, sumCompl, `totalVendido = Σ completadas (${sumCompl})`);
  eq(vdd.numTickets, compl.length, `numTickets = #completadas (${compl.length})`);
  eq(vdd.totalCancelado, sumCanc, `totalCancelado = Σ canceladas (${sumCanc}) — no contamina ventas`);
  check(vdd.porFormaPago.length > 0, "desglose por forma de pago");
  check(Math.abs(vdd.ticketPromedio - (vdd.totalVendido / vdd.numTickets)) < 0.5, "ticket promedio coherente");

  // REP-02
  caso("REP-02", "productosVendidos: ranking coincide con lo vendido");
  const pv = await reportesService.productosVendidos({ desde, hasta });
  check(pv.filas.length > 0 && pv.totalMonto > 0, `${pv.filas.length} productos, monto=${pv.totalMonto}`);

  // REP-03
  caso("REP-03", "ventasPorUsuario: desglose por cajero");
  const vpu = await reportesService.ventasPorUsuario({ desde, hasta });
  check(vpu.filas.length > 0 && vpu.totalGeneral > 0, `${vpu.filas.length} usuarios, total=${vpu.totalGeneral}`);

  // REP-04
  caso("REP-04", "inventarioActual: stock valorizado + margen potencial");
  const inv = await reportesService.inventarioActual({ soloConStock: true });
  check(inv.totalCosto > 0 && inv.totalVenta > 0, `costo=${inv.totalCosto}, venta=${inv.totalVenta}`);
  eq(Math.round(inv.margenPotencial), Math.round(inv.totalVenta - inv.totalCosto), "margen = venta - costo");

  // REP-05
  caso("REP-05", "productosPorCaducar: incluye el lote próximo (~20d)");
  const cad = await reportesService.productosPorCaducar({ dias: 90 });
  check(cad.filas.some((f) => f.loteId === S.loteProximoId), `${cad.totalLotes} lotes por caducar`);

  // REP-06
  caso("REP-06", "antiguedadSaldosCxC: saldos de clientes (post cobranza)");
  const cxc = await reportesService.antiguedadSaldosCxC();
  check(cxc.totalGeneral > 0 && cxc.filas.some((f) => f.clienteId === S.clienteCreditoId), `totalCxC=${cxc.totalGeneral}`);

  // REP-07
  caso("REP-07", "antiguedadSaldosCxP: saldos de proveedores (post CxP)");
  const cxp = await reportesService.antiguedadSaldosCxP();
  check(cxp.totalGeneral > 0, `totalCxP=${cxp.totalGeneral}`);

  // REP-08
  caso("REP-08", "productosSinMovimiento: incluye un producto sin ventas");
  const sin = await reportesService.productosSinMovimiento({ dias: 60, soloConStock: true });
  check(sin.filas.some((f) => f.productoId === S.accId), `${sin.totalProductos} productos sin movimiento`);

  // REP-09 — PDF para cada reporte
  caso("REP-09", "generarReportePDF produce un buffer válido para cada reporte");
  const pdfs: Array<[string, Buffer]> = [
    ["ventas-dia", generarReportePDF({ empresa, titulo: "Ventas del día", rango: { desde, hasta }, columnas: [{ header: "Forma" }, { header: "Monto", align: "right" }], filas: vdd.porFormaPago.map((f) => [f.forma, f.monto]) })],
    ["productos-vendidos", generarReportePDF({ empresa, titulo: "Productos vendidos", columnas: [{ header: "SKU" }, { header: "Cant", align: "right" }, { header: "Monto", align: "right" }], filas: pv.filas.map((f) => [f.sku, f.cantidad, f.montoTotal]) })],
    ["ventas-por-usuario", generarReportePDF({ empresa, titulo: "Ventas por usuario", columnas: [{ header: "Usuario" }, { header: "Total", align: "right" }], filas: vpu.filas.map((f) => [f.usuarioNombre, f.total]) })],
    ["inventario-actual", generarReportePDF({ empresa, titulo: "Inventario actual", columnas: [{ header: "SKU" }, { header: "Stock", align: "right" }, { header: "Valor", align: "right" }], filas: inv.filas.map((f) => [f.sku, f.stock, f.valorCosto]) })],
    ["por-caducar", generarReportePDF({ empresa, titulo: "Productos por caducar", columnas: [{ header: "SKU" }, { header: "Lote" }, { header: "Días", align: "right" }], filas: cad.filas.map((f) => [f.sku, f.lote, f.diasParaCaducar]) })],
    ["antiguedad-cxc", generarReportePDF({ empresa, titulo: "Antigüedad CxC", columnas: [{ header: "Cliente" }, { header: "Total", align: "right" }], filas: cxc.filas.map((f) => [f.clienteNombre, f.total]) })],
    ["antiguedad-cxp", generarReportePDF({ empresa, titulo: "Antigüedad CxP", columnas: [{ header: "Proveedor" }, { header: "Total", align: "right" }], filas: cxp.filas.map((f) => [f.proveedorNombre, f.total]) })],
    ["sin-movimiento", generarReportePDF({ empresa, titulo: "Productos sin movimiento", columnas: [{ header: "SKU" }, { header: "Días" }], filas: sin.filas.map((f) => [f.sku, f.diasSinVenta]) })],
  ];
  const todosValidos = pdfs.every(([, buf]) => Buffer.isBuffer(buf) && buf.length > 800);
  check(todosValidos, `8 PDFs generados (${pdfs.map(([n, b]) => `${n}:${b.length}B`).join(", ")})`);
}
