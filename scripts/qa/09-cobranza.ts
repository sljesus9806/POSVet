// COB — Cobranza (crédito). Plan §5.9
import { cobranzaService } from "../../src/lib/modules/cobranza";
import { caso, check, eq, lanza, prisma, adminId, num, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.9 Cobranza ==");
  const usuarioId = await adminId();

  // COB-01
  caso("COB-01", "resumen → saldos por cobrar tras la venta a crédito");
  const resumen = await cobranzaService.resumen();
  check(resumen.totalPorCobrar >= 155, `totalPorCobrar=${resumen.totalPorCobrar}`);

  // COB-02
  caso("COB-02", "listarVentasCredito y estadoCuenta del cliente");
  const ventasCredito = await cobranzaService.listarVentasCredito({ clienteId: S.clienteCreditoId });
  check(ventasCredito.some((v) => v.ventaId === S.ventaCreditoId), "venta a crédito listada");
  const estado = await cobranzaService.estadoCuenta(S.clienteCreditoId);
  eq(estado?.saldoActual, 155, "saldoActual = 155");

  // COB-03 — abono parcial
  caso("COB-03", "registrarAbono parcial → reduce saldoActual cliente y saldoCredito venta");
  await cobranzaService.registrarAbono(
    { clienteId: S.clienteCreditoId, formaPago: "EFECTIVO", monto: 55, aplicaciones: [{ ventaId: S.ventaCreditoId, monto: 55 }] },
    { usuarioId },
  );
  let venta = await prisma.venta.findUnique({ where: { id: S.ventaCreditoId } });
  let cliente = await prisma.cliente.findUnique({ where: { id: S.clienteCreditoId } });
  eq(num(venta?.saldoCredito), 100, "saldoCredito venta = 100");
  eq(num(cliente?.saldoActual), 100, "saldoActual cliente = 100");

  // COB-04 — abono que liquida
  caso("COB-04", "registrarAbono que liquida → saldo a 0");
  const abonoLiquida = await cobranzaService.registrarAbono(
    { clienteId: S.clienteCreditoId, formaPago: "TRANSFERENCIA", monto: 100, referencia: "TRF-QA", aplicaciones: [{ ventaId: S.ventaCreditoId, monto: 100 }] },
    { usuarioId },
  );
  S.abonoLiquidaId = abonoLiquida.id;
  venta = await prisma.venta.findUnique({ where: { id: S.ventaCreditoId } });
  eq(num(venta?.saldoCredito), 0, "saldoCredito venta = 0");
  // Σ aplicaciones = monto del abono
  eq(r2Sum(abonoLiquida.aplicaciones.map((a) => a.monto)), abonoLiquida.monto, "Σ aplicaciones = monto abono");

  // COB-05
  caso("COB-05", "listarAbonos y obtenerAbono (con aplicaciones)");
  const abonos = await cobranzaService.listarAbonos({ clienteId: S.clienteCreditoId });
  check(abonos.length >= 2, `${abonos.length} abonos`);
  const det = await cobranzaService.obtenerAbono(abonoLiquida.id);
  check(!!det && det.aplicaciones.length === 1, "detalle con aplicaciones");

  // COB-06 — cancelar abono revierte saldos
  caso("COB-06", "cancelarAbono → revierte saldos al estado previo");
  await cobranzaService.cancelarAbono({ abonoId: S.abonoLiquidaId, motivo: "QA reversión" }, { usuarioId });
  venta = await prisma.venta.findUnique({ where: { id: S.ventaCreditoId } });
  cliente = await prisma.cliente.findUnique({ where: { id: S.clienteCreditoId } });
  eq(num(venta?.saldoCredito), 100, "saldoCredito vuelve a 100");
  eq(num(cliente?.saldoActual), 100, "saldoActual vuelve a 100");

  // COB-07 ✗
  caso("COB-07", "abono > saldo y abono con venta de otro cliente → errores controlados");
  await lanza(
    "AplicacionExcedeSaldoVentaError",
    () => cobranzaService.registrarAbono({ clienteId: S.clienteCreditoId, formaPago: "EFECTIVO", monto: 99999, aplicaciones: [{ ventaId: S.ventaCreditoId, monto: 99999 }] }, { usuarioId }),
    "abono mayor al saldo",
  );
  await lanza(
    "VentaDistintoClienteError",
    () => cobranzaService.registrarAbono({ clienteId: S.clientePublicoId, formaPago: "EFECTIVO", monto: 50, aplicaciones: [{ ventaId: S.ventaCreditoId, monto: 50 }] }, { usuarioId }),
    "venta de otro cliente",
  );
}

function r2Sum(nums: number[]): number {
  return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
}
