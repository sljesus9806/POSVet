// VEN — Ventas / POS (núcleo). Plan §5.8
import { ventasService } from "../../src/lib/modules/ventas";
import { productosService } from "../../src/lib/modules/productos";
import { caso, check, eq, lanza, lanzaAlguno, prisma, adminId, num, stock, r2, SEED, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.8 Ventas / POS ==");
  const usuarioId = await adminId();
  const tienda = SEED.ubicacionTienda;

  const amox = (await prisma.producto.findUnique({ where: { sku: SEED.skus.amox } }))!;
  const iver = (await prisma.producto.findUnique({ where: { sku: SEED.skus.iver } }))!;
  const canino = (await prisma.producto.findUnique({ where: { sku: SEED.skus.canino } }))!;
  const collar = (await prisma.producto.findUnique({ where: { sku: SEED.skus.collar } }))!;
  const felino = (await prisma.producto.findUnique({ where: { sku: SEED.skus.felino } }))!;

  // VEN-01
  caso("VEN-01", "abrirCaja en Tienda → ABIERTA; cajaAbiertaDeUsuario la encuentra");
  const caja = await ventasService.abrirCaja({ ubicacionId: tienda, fondoInicial: 1000 }, { usuarioId });
  S.cajaId = caja.id;
  eq(caja.estado, "ABIERTA", "caja abierta");
  const abierta = await ventasService.cajaAbiertaDeUsuario(usuarioId);
  eq(abierta?.id, caja.id, "cajaAbiertaDeUsuario la encuentra");

  // VEN-02 ✗
  caso("VEN-02", "abrir con caja ya abierta → CajaYaAbiertaError; vender sin caja → CajaNoAbiertaError");
  await lanza("CajaYaAbiertaError", () => ventasService.abrirCaja({ ubicacionId: tienda, fondoInicial: 0 }, { usuarioId }));
  await lanza("CajaNoAbiertaError", () => ventasService.crearVenta({ cajaId: "caja-inexistente", lineas: [{ productoId: amox.id, cantidad: 1 }], pagos: [{ forma: "EFECTIVO", monto: 150 }] }, { usuarioId }));

  // VEN-03
  caso("VEN-03", "buscarProductosVendibles por nombre, SKU y código de barras");
  await productosService.actualizar({ id: amox.id, codigoBarras: "7501234567890" }, { usuarioId });
  const porNombre = await ventasService.buscarProductosVendibles({ ubicacionId: tienda, q: "Amoxicilina" });
  const porSku = await ventasService.buscarProductosVendibles({ ubicacionId: tienda, q: SEED.skus.amox });
  const porBarras = await ventasService.buscarProductosVendibles({ ubicacionId: tienda, q: "7501234567890" });
  check(porNombre.some((p) => p.productoId === amox.id), "por nombre");
  check(porSku.some((p) => p.productoId === amox.id), "por SKU");
  check(porBarras.some((p) => p.productoId === amox.id), "por código de barras");

  // VEN-04 — efectivo, 1 producto
  caso("VEN-04", "crearVenta efectivo 1 producto → stock-, IVA desglosado, total y cambio correctos");
  const amoxAntes = await stock(amox.id, tienda);
  const venta4 = await ventasService.crearVenta(
    { cajaId: caja.id, lineas: [{ productoId: amox.id, cantidad: 2 }], pagos: [{ forma: "EFECTIVO", monto: 400 }] },
    { usuarioId },
  );
  S.ventaEfectivoId = venta4.id;
  eq(venta4.total, 300, "total = 150*2");
  eq(venta4.subtotal, r2(300 / 1.16), "subtotal sin IVA");
  eq(venta4.iva, r2(300 - 300 / 1.16), "IVA desglosado");
  eq(venta4.cambio, 100, "cambio = 400-300");
  eq(r2(venta4.subtotal + venta4.iva - venta4.descuentoGlobal), venta4.total, "integridad subtotal+iva-descGlobal=total");
  eq(await stock(amox.id, tienda), amoxAntes - 2, "stock descontado");
  const movVenta = await prisma.inventarioMovimiento.findFirst({ where: { referenciaTipo: "venta", referenciaId: venta4.id, tipo: "SALIDA" } });
  check(!!movVenta, "kardex SALIDA por venta");

  // VEN-05 — multi-línea + descuento línea + descuento global
  caso("VEN-05", "multi-línea + descuento por línea + descuento global → totales y r2");
  const venta5 = await ventasService.crearVenta(
    {
      cajaId: caja.id,
      descuentoGlobal: 30,
      lineas: [
        { productoId: amox.id, cantidad: 1, descuento: 10 },
        { productoId: iver.id, cantidad: 1 },
      ],
      pagos: [{ forma: "EFECTIVO", monto: 300 }],
    },
    { usuarioId },
  );
  eq(venta5.descuentoLineas, 10, "descuento de líneas = 10");
  eq(venta5.descuentoGlobal, 30, "descuento global = 30");
  eq(venta5.total, 300, "total = (140+190) - 30");
  eq(r2(venta5.subtotal + venta5.iva - venta5.descuentoGlobal), venta5.total, "integridad de dinero");

  // VEN-06 — pago mixto
  caso("VEN-06", "pago mixto (efectivo + tarjeta) → venta_pagos cuadra con total");
  const venta6 = await ventasService.crearVenta(
    { cajaId: caja.id, lineas: [{ productoId: collar.id, cantidad: 1 }], pagos: [{ forma: "EFECTIVO", monto: 50 }, { forma: "TARJETA", monto: 45 }] },
    { usuarioId },
  );
  S.ventaMixtaId = venta6.id;
  eq(venta6.total, 95, "total collar = 95");
  eq(venta6.pagos.length, 2, "2 pagos");
  eq(r2(venta6.pagos.reduce((a, p) => a + p.monto, 0)), venta6.total, "Σ pagos = total");

  // VEN-07 — a crédito
  caso("VEN-07", "crearVenta a crédito → saldoCredito venta + saldoActual cliente incrementados");
  const clienteAntes = await prisma.cliente.findUnique({ where: { id: S.clienteCreditoId } });
  const venta7 = await ventasService.crearVenta(
    { cajaId: caja.id, clienteId: S.clienteCreditoId, lineas: [{ productoId: iver.id, cantidad: 1 }], pagos: [{ forma: "CREDITO", monto: 155 }] },
    { usuarioId },
  );
  S.ventaCreditoId = venta7.id;
  S.ventaCreditoTotal = venta7.total;
  eq(venta7.total, 155, "precio DISTRIBUIDOR de iver = 155");
  const venta7Db = await prisma.venta.findUnique({ where: { id: venta7.id } });
  eq(num(venta7Db?.saldoCredito), 155, "saldoCredito de la venta = 155");
  eq(num(venta7Db?.montoCredito), 155, "montoCredito de la venta = 155");
  const clienteDesp = await prisma.cliente.findUnique({ where: { id: S.clienteCreditoId } });
  eq(num(clienteDesp?.saldoActual), num(clienteAntes?.saldoActual) + 155, "saldoActual cliente +155");

  // VEN-08 — precio por tipo
  caso("VEN-08", "precio por tipo de cliente (MAYOREO) aplica la lista correcta");
  const venta8 = await ventasService.crearVenta(
    { cajaId: caja.id, clienteId: S.clienteMayoreoId, lineas: [{ productoId: canino.id, cantidad: 1 }], pagos: [{ forma: "EFECTIVO", monto: 820 }] },
    { usuarioId },
  );
  eq(venta8.tipoPrecio, "MAYOREO", "tipoPrecio MAYOREO");
  eq(venta8.lineas[0].precioUnitario, 820, "precio MAYOREO del producto = 820");

  // VEN-09 ✗ — caminos de error
  caso("VEN-09", "pago insuficiente / cambio no-efectivo / stock insuficiente / crédito excede / sin precio");
  await lanza("PagoInsuficienteError", () => ventasService.crearVenta({ cajaId: caja.id, lineas: [{ productoId: amox.id, cantidad: 1 }], pagos: [{ forma: "EFECTIVO", monto: 100 }] }, { usuarioId }), "pago insuficiente");
  await lanza("CambioSoloEfectivoError", () => ventasService.crearVenta({ cajaId: caja.id, lineas: [{ productoId: amox.id, cantidad: 1 }], pagos: [{ forma: "TARJETA", monto: 200 }] }, { usuarioId }), "cambio con tarjeta");
  await lanza("StockInsuficienteError", () => ventasService.crearVenta({ cajaId: caja.id, lineas: [{ productoId: felino.id, cantidad: 10 }], pagos: [{ forma: "EFECTIVO", monto: 5400 }] }, { usuarioId }), "stock insuficiente");
  await lanza("CreditoExcedeLineaError", () => ventasService.crearVenta({ cajaId: caja.id, clienteId: S.clienteCreditoChicoId, lineas: [{ productoId: iver.id, cantidad: 1 }], pagos: [{ forma: "CREDITO", monto: 155 }] }, { usuarioId }), "crédito 155 excede línea 100");
  const sinPrecio = await productosService.crear({ sku: "SINPREC-QA-001", nombre: "Sin precio público QA", unidadMedida: "PZA", tipo: "ACCESORIO", precios: [{ tipo: "DISTRIBUIDOR", precio: 100 }] }, { usuarioId });
  await lanza("ProductoSinPrecioError", () => ventasService.crearVenta({ cajaId: caja.id, lineas: [{ productoId: sinPrecio.id, cantidad: 1 }], pagos: [{ forma: "EFECTIVO", monto: 100 }] }, { usuarioId }), "producto sin precio para el tipo");

  // VEN-10 — cancelar venta
  caso("VEN-10", "cancelarVenta restituye stock y revierte crédito; repetir → VentaYaCanceladaError");
  const amoxPreCancel = await stock(amox.id, tienda);
  await ventasService.cancelarVenta({ ventaId: S.ventaEfectivoId, motivo: "QA cancelación" }, { usuarioId });
  eq(await stock(amox.id, tienda), amoxPreCancel + 2, "stock restituido (+2)");
  const movDevol = await prisma.inventarioMovimiento.findFirst({ where: { referenciaTipo: "venta_cancelada", referenciaId: S.ventaEfectivoId, tipo: "ENTRADA" } });
  check(!!movDevol, "kardex ENTRADA por cancelación");
  await lanza("VentaYaCanceladaError", () => ventasService.cancelarVenta({ ventaId: S.ventaEfectivoId, motivo: "otra vez" }, { usuarioId }));
  // crédito: vender a crédito al cliente chico (collar→fallback público 95 ≤ 100) y cancelar
  const ventaCredChico = await ventasService.crearVenta({ cajaId: caja.id, clienteId: S.clienteCreditoChicoId, lineas: [{ productoId: collar.id, cantidad: 1 }], pagos: [{ forma: "CREDITO", monto: 95 }] }, { usuarioId });
  await ventasService.cancelarVenta({ ventaId: ventaCredChico.id, motivo: "QA revertir crédito" }, { usuarioId });
  const chicoTrasCancel = await prisma.cliente.findUnique({ where: { id: S.clienteCreditoChicoId } });
  eq(num(chicoTrasCancel?.saldoActual), 0, "saldoActual del cliente chico revertido a 0");

  // VEN-12 (antes de cerrar caja) — consultas
  caso("VEN-12", "listarVentas y obtenerVenta (detalle: líneas + pagos)");
  const ventas = await ventasService.listarVentas({});
  check(ventas.length > 0, `listarVentas devuelve ${ventas.length}`);
  const detalle = await ventasService.obtenerVenta(S.ventaMixtaId);
  check(!!detalle && detalle.lineas.length > 0 && detalle.pagos.length === 2, "detalle con líneas y pagos");

  // VEN-11 — cerrar caja (al final)
  caso("VEN-11", "cerrarCaja con conteo de efectivo → esperado vs contado, diferencia, CERRADA");
  const detCaja = await ventasService.obtenerCaja(caja.id);
  const efectivo = detCaja?.desglosePorForma.find((d) => d.forma === "EFECTIVO")?.total ?? 0;
  const esperado = r2(1000 + efectivo);
  const cerrada = await ventasService.cerrarCaja({ cajaId: caja.id, montoContadoEfectivo: esperado }, { usuarioId });
  eq(cerrada.estado, "CERRADA", "caja cerrada");
  eq(cerrada.montoEsperadoEfectivo ?? -1, esperado, "monto esperado calculado");
  eq(cerrada.diferenciaEfectivo ?? -1, 0, "diferencia 0 (conté lo esperado)");
}
