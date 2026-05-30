// CXP — Cuentas por pagar. Plan §5.10
import { cuentasPagarService } from "../../src/lib/modules/cuentas-pagar";
import { caso, check, eq, lanza, prisma, adminId, num, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.10 Cuentas por pagar ==");
  const usuarioId = await adminId();

  // CXP-01 — registrar factura
  caso("CXP-01", "registrarFactura → incrementa saldoActual del proveedor");
  const provAntes = await prisma.proveedor.findUnique({ where: { id: S.proveedorId } });
  const factura = await cuentasPagarService.registrarFactura(
    { proveedorId: S.proveedorId, folioProveedor: "FAC-QA-001", ordenCompraId: S.ocRecibidaId, fechaEmision: "2026-05-01", fechaVencimiento: "2026-06-01", subtotal: 4310, iva: 690, total: 5000 },
    { usuarioId },
  );
  S.facturaId = factura.id;
  eq(factura.saldo, 5000, "saldo inicial = total");
  const provDesp = await prisma.proveedor.findUnique({ where: { id: S.proveedorId } });
  eq(num(provDesp?.saldoActual), num(provAntes?.saldoActual) + 5000, "saldoActual proveedor +5000");

  // CXP-02 — consultas
  caso("CXP-02", "listarFacturas, obtenerFactura, resumen, estadoCuenta");
  const facturas = await cuentasPagarService.listarFacturas({ proveedorId: S.proveedorId });
  check(facturas.some((f) => f.id === factura.id), "factura listada");
  const resumen = await cuentasPagarService.resumen();
  check(resumen.totalPorPagar >= 5000, `totalPorPagar=${resumen.totalPorPagar}`);
  const estado = await cuentasPagarService.estadoCuenta(S.proveedorId);
  check(!!estado && estado.saldoActual >= 5000, "estadoCuenta refleja saldo");

  // CXP-03 — pago parcial
  caso("CXP-03", "registrarPago parcial → reduce saldo, estado PAGADA_PARCIAL");
  await cuentasPagarService.registrarPago(
    { proveedorId: S.proveedorId, formaPago: "TRANSFERENCIA", monto: 2000, referencia: "PAGO-QA-1", aplicaciones: [{ facturaId: factura.id, monto: 2000 }] },
    { usuarioId },
  );
  let facDb = await prisma.facturaProveedor.findUnique({ where: { id: factura.id } });
  eq(num(facDb?.saldo), 3000, "saldo factura = 3000");
  eq(facDb?.estado, "PAGADA_PARCIAL", "estado PAGADA_PARCIAL");

  // CXP-04 — pago que liquida
  caso("CXP-04", "registrarPago que liquida → factura PAGADA");
  const pagoLiquida = await cuentasPagarService.registrarPago(
    { proveedorId: S.proveedorId, formaPago: "EFECTIVO", monto: 3000, aplicaciones: [{ facturaId: factura.id, monto: 3000 }] },
    { usuarioId },
  );
  S.pagoLiquidaId = pagoLiquida.id;
  facDb = await prisma.facturaProveedor.findUnique({ where: { id: factura.id } });
  eq(num(facDb?.saldo), 0, "saldo factura = 0");
  eq(facDb?.estado, "PAGADA", "estado PAGADA");

  // CXP-05 — cancelaciones
  caso("CXP-05", "cancelarPago y cancelarFactura → reversiones de saldo");
  await cuentasPagarService.cancelarPago({ pagoId: S.pagoLiquidaId, motivo: "QA cancela pago" }, { usuarioId });
  facDb = await prisma.facturaProveedor.findUnique({ where: { id: factura.id } });
  eq(num(facDb?.saldo), 3000, "saldo factura vuelve a 3000");
  eq(facDb?.estado, "PAGADA_PARCIAL", "estado vuelve a PAGADA_PARCIAL");
  // cancelar una factura SIN pagos (separada)
  const provAntesCancel = await prisma.proveedor.findUnique({ where: { id: S.proveedorId } });
  const factura2 = await cuentasPagarService.registrarFactura(
    { proveedorId: S.proveedorId, folioProveedor: "FAC-QA-002", fechaEmision: "2026-05-02", fechaVencimiento: "2026-06-02", total: 1000 },
    { usuarioId },
  );
  await cuentasPagarService.cancelarFactura({ facturaId: factura2.id, motivo: "QA cancela factura" }, { usuarioId });
  const facturaCancelada = await prisma.facturaProveedor.findUnique({ where: { id: factura2.id } });
  eq(facturaCancelada?.estado, "CANCELADA", "factura cancelada");
  const provFinal = await prisma.proveedor.findUnique({ where: { id: S.proveedorId } });
  eq(num(provFinal?.saldoActual), num(provAntesCancel?.saldoActual), "saldo proveedor neto sin cambio (factura cancelada se anuló)");

  // CXP-06 ✗
  caso("CXP-06", "pago > saldo y cancelar factura con pagos → errores controlados");
  await lanza(
    "AplicacionExcedeSaldoError",
    () => cuentasPagarService.registrarPago({ proveedorId: S.proveedorId, formaPago: "EFECTIVO", monto: 99999, aplicaciones: [{ facturaId: factura.id, monto: 99999 }] }, { usuarioId }),
    "pago mayor al saldo",
  );
  await lanza(
    "FacturaConPagosError",
    () => cuentasPagarService.cancelarFactura({ facturaId: factura.id, motivo: "no debe poder" }, { usuarioId }),
    "cancelar factura con pago activo",
  );
}
