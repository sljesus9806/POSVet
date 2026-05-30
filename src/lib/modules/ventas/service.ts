import { Prisma } from "@prisma/client";
import { prisma, TX_OPTS } from "../shared/db";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { tipoPrecioEfectivo } from "../clientes";
import { inventarioService, StockInsuficienteError } from "../inventario";
import { ventasRepository, type VentaConRelaciones } from "./repository";
import {
  abrirCajaSchema,
  cancelarVentaSchema,
  cerrarCajaSchema,
  crearVentaSchema,
  type AbrirCajaInput,
  type CancelarVentaInput,
  type CerrarCajaInput,
  type CrearVentaInput,
} from "./schemas";
import { VENTA_EVENTS } from "./events";
import type {
  CajaDetalle,
  CajaListado,
  ProductoVendible,
  TipoPrecio,
  VentaDetalle,
  VentaListado,
} from "./types";

export { StockInsuficienteError };

export class CajaYaAbiertaError extends Error {
  constructor() {
    super("Ya tienes una caja abierta. Ciérrala antes de abrir otra.");
    this.name = "CajaYaAbiertaError";
  }
}

export class CajaNoAbiertaError extends Error {
  constructor() {
    super("Debes abrir una caja antes de vender.");
    this.name = "CajaNoAbiertaError";
  }
}

export class CajaNoEncontradaError extends Error {
  constructor() {
    super("Caja no encontrada o no está abierta.");
    this.name = "CajaNoEncontradaError";
  }
}

export class VentaNoEncontradaError extends Error {
  constructor() {
    super("Venta no encontrada.");
    this.name = "VentaNoEncontradaError";
  }
}

export class VentaYaCanceladaError extends Error {
  constructor() {
    super("La venta ya está cancelada.");
    this.name = "VentaYaCanceladaError";
  }
}

export class VentaConAbonosAplicadosError extends Error {
  constructor() {
    super("La venta tiene abonos aplicados. Cancela primero esos abonos.");
    this.name = "VentaConAbonosAplicadosError";
  }
}

export class PagoInsuficienteError extends Error {
  constructor(public total: number, public pagado: number) {
    super(`El pago (${pagado.toFixed(2)}) no cubre el total (${total.toFixed(2)})`);
    this.name = "PagoInsuficienteError";
  }
}

export class CambioSoloEfectivoError extends Error {
  constructor() {
    super("El cambio solo se permite cuando hay pago en efectivo.");
    this.name = "CambioSoloEfectivoError";
  }
}

export class ProductoSinPrecioError extends Error {
  constructor(public sku: string) {
    super(`El producto ${sku} no tiene precio configurado`);
    this.name = "ProductoSinPrecioError";
  }
}

export class CreditoSinClienteError extends Error {
  constructor() {
    super("Las ventas a crédito requieren un cliente seleccionado.");
    this.name = "CreditoSinClienteError";
  }
}

export class CreditoExcedeLineaError extends Error {
  constructor(
    public lineaCredito: number,
    public saldoActual: number,
    public montoCredito: number,
  ) {
    const disponible = Math.max(0, lineaCredito - saldoActual);
    super(
      `El crédito solicitado ($${montoCredito.toFixed(2)}) excede el disponible del cliente ($${disponible.toFixed(2)}).`,
    );
    this.name = "CreditoExcedeLineaError";
  }
}

export class CreditoSinLineaError extends Error {
  constructor() {
    super("Este cliente no tiene línea de crédito autorizada.");
    this.name = "CreditoSinLineaError";
  }
}

const D = Prisma.Decimal;

function toNumber(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : Number(d.toString());
}

// Redondeo a 2 decimales en MXN
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cajaAListado(c: Awaited<ReturnType<typeof ventasRepository.obtenerCaja>>): CajaListado {
  if (!c) throw new Error("caja requerida");
  return {
    id: c.id,
    folio: c.folio,
    ubicacionId: c.ubicacionId,
    ubicacionNombre: c.ubicacion.nombre,
    estado: c.estado,
    abiertaPorNombre: c.abiertaPor.nombre,
    cerradaPorNombre: c.cerradaPor?.nombre ?? null,
    fondoInicial: toNumber(c.fondoInicial),
    totalVendido: toNumber(c.totalVendido),
    montoEsperadoEfectivo: c.montoEsperadoEfectivo ? toNumber(c.montoEsperadoEfectivo) : null,
    montoContadoEfectivo: c.montoContadoEfectivo ? toNumber(c.montoContadoEfectivo) : null,
    diferenciaEfectivo: c.diferenciaEfectivo ? toNumber(c.diferenciaEfectivo) : null,
    abiertaEn: c.abiertaEn,
    cerradaEn: c.cerradaEn,
  };
}

function ventaAListado(v: VentaConRelaciones): VentaListado {
  return {
    id: v.id,
    folio: v.folio,
    fechaVenta: v.fechaVenta,
    estado: v.estado,
    tipoPrecio: v.tipoPrecio,
    total: toNumber(v.total),
    totalLineas: v._count.lineas,
    clienteNombre: v.cliente?.nombre ?? null,
    usuarioNombre: v.usuario.nombre,
    cajaFolio: v.caja.folio,
    ubicacionNombre: v.ubicacion.nombre,
  };
}

function ventaADetalle(v: VentaConRelaciones): VentaDetalle {
  return {
    ...ventaAListado(v),
    subtotal: toNumber(v.subtotal),
    descuentoLineas: toNumber(v.descuentoLineas),
    descuentoGlobal: toNumber(v.descuentoGlobal),
    iva: toNumber(v.iva),
    totalPagado: toNumber(v.totalPagado),
    cambio: toNumber(v.cambio),
    observaciones: v.observaciones,
    motivoCancelacion: v.motivoCancelacion,
    canceladaEn: v.canceladaEn,
    canceladaPorNombre: v.canceladaPor?.nombre ?? null,
    clienteId: v.clienteId,
    clienteCodigo: v.cliente?.codigo ?? null,
    clienteRfc: v.cliente?.rfc ?? null,
    ubicacionId: v.ubicacionId,
    cajaId: v.cajaId,
    lineas: v.lineas.map((l) => ({
      id: l.id,
      productoId: l.productoId,
      productoSku: l.productoSku,
      productoNombre: l.productoNombre,
      unidadMedida: l.unidadMedida,
      cantidad: toNumber(l.cantidad),
      precioUnitario: toNumber(l.precioUnitario),
      descuento: toNumber(l.descuento),
      subtotal: toNumber(l.subtotal),
      ivaTasa: toNumber(l.ivaTasa),
      ivaImporte: toNumber(l.ivaImporte),
      total: toNumber(l.total),
      loteNumero: l.lote?.lote ?? null,
    })),
    pagos: v.pagos.map((p) => ({
      id: p.id,
      forma: p.forma,
      monto: toNumber(p.monto),
      referencia: p.referencia,
    })),
  };
}

export const ventasService = {
  // ---------------- Caja ----------------
  async cajaAbiertaDeUsuario(usuarioId: string): Promise<CajaListado | null> {
    const c = await ventasRepository.cajaAbiertaDeUsuario(usuarioId);
    return c ? cajaAListado(c) : null;
  },

  async listarCajas(opts: { estado?: "ABIERTA" | "CERRADA"; limit?: number } = {}): Promise<CajaListado[]> {
    const filas = await ventasRepository.listarCajas(opts);
    return filas.map(cajaAListado);
  },

  async obtenerCaja(id: string): Promise<CajaDetalle | null> {
    const c = await ventasRepository.obtenerCaja(id);
    if (!c) return null;
    const resumen = await ventasRepository.resumenCaja(id);
    return {
      ...cajaAListado(c),
      observacionesApertura: c.observacionesApertura,
      observacionesCierre: c.observacionesCierre,
      totalVentas: resumen.totalVentas,
      desglosePorForma: resumen.desglose,
    };
  },

  async abrirCaja(input: AbrirCajaInput, ctx: { usuarioId: string; ip?: string | null }): Promise<CajaListado> {
    const data = abrirCajaSchema.parse(input);
    const yaAbierta = await ventasRepository.cajaAbiertaDeUsuario(ctx.usuarioId);
    if (yaAbierta) throw new CajaYaAbiertaError();

    const caja = await prisma.$transaction(async (tx) => {
      const folio = await ventasRepository.proximoFolioCaja(tx);
      return tx.caja.create({
        data: {
          folio,
          ubicacionId: data.ubicacionId,
          abiertaPorId: ctx.usuarioId,
          estado: "ABIERTA",
          fondoInicial: data.fondoInicial,
          observacionesApertura: data.observaciones,
        },
        include: {
          ubicacion: { select: { id: true, nombre: true } },
          abiertaPor: { select: { id: true, nombre: true } },
          cerradaPor: { select: { id: true, nombre: true } },
        },
      });
    }, TX_OPTS);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "cajas",
      accion: "abrir",
      entidad: "caja",
      entidadId: caja.id,
      despues: { folio: caja.folio, fondoInicial: data.fondoInicial },
      ip: ctx.ip,
    });
    await eventBus.emit(VENTA_EVENTS.CAJA_ABIERTA, {
      cajaId: caja.id,
      folio: caja.folio,
      ubicacionId: caja.ubicacionId,
      usuarioId: ctx.usuarioId,
      fondoInicial: toNumber(caja.fondoInicial),
    });
    return cajaAListado(caja);
  },

  async cerrarCaja(input: CerrarCajaInput, ctx: { usuarioId: string; ip?: string | null }): Promise<CajaDetalle> {
    const data = cerrarCajaSchema.parse(input);
    const caja = await ventasRepository.obtenerCaja(data.cajaId);
    if (!caja || caja.estado !== "ABIERTA") throw new CajaNoEncontradaError();

    const resumen = await ventasRepository.resumenCaja(data.cajaId);
    const efectivoVendido = resumen.desglose.find((d) => d.forma === "EFECTIVO")?.total ?? 0;
    const esperado = r2(toNumber(caja.fondoInicial) + efectivoVendido);
    const contado = r2(data.montoContadoEfectivo);
    const diferencia = r2(contado - esperado);

    const cerrada = await prisma.caja.update({
      where: { id: caja.id },
      data: {
        estado: "CERRADA",
        cerradaPorId: ctx.usuarioId,
        cerradaEn: new Date(),
        totalVendido: resumen.totalVendido,
        montoEsperadoEfectivo: esperado,
        montoContadoEfectivo: contado,
        diferenciaEfectivo: diferencia,
        observacionesCierre: data.observaciones,
      },
      include: {
        ubicacion: { select: { id: true, nombre: true } },
        abiertaPor: { select: { id: true, nombre: true } },
        cerradaPor: { select: { id: true, nombre: true } },
      },
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "cajas",
      accion: "cerrar",
      entidad: "caja",
      entidadId: cerrada.id,
      despues: {
        folio: cerrada.folio,
        totalVendido: resumen.totalVendido,
        esperado,
        contado,
        diferencia,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(VENTA_EVENTS.CAJA_CERRADA, {
      cajaId: cerrada.id,
      folio: cerrada.folio,
      usuarioId: ctx.usuarioId,
      totalVendido: resumen.totalVendido,
      montoEsperadoEfectivo: esperado,
      montoContadoEfectivo: contado,
      diferenciaEfectivo: diferencia,
    });

    const detalle = await this.obtenerCaja(cerrada.id);
    if (!detalle) throw new CajaNoEncontradaError();
    return detalle;
  },

  // ---------------- Catálogo POS ----------------
  async buscarProductosVendibles(opts: { ubicacionId: string; q?: string; limit?: number }): Promise<ProductoVendible[]> {
    const filas = await ventasRepository.productosVendibles(opts);
    return filas.map((p) => {
      const precios: ProductoVendible["precios"] = { PUBLICO: null, MAYOREO: null, VETERINARIO: null };
      for (const pr of p.precios) precios[pr.tipo] = toNumber(pr.precio);
      return {
        productoId: p.id,
        sku: p.sku,
        codigoBarras: p.codigoBarras,
        nombre: p.nombre,
        unidadMedida: p.unidadMedida,
        ivaTasa: toNumber(p.ivaAplicable),
        precios,
        stockUbicacion: toNumber(p.inventarios[0]?.stock ?? 0),
      };
    });
  },

  // ---------------- Ventas ----------------
  async listarVentas(opts: Parameters<typeof ventasRepository.listarVentas>[0] = {}): Promise<VentaListado[]> {
    const filas = await ventasRepository.listarVentas(opts);
    return filas.map(ventaAListado);
  },

  async obtenerVenta(id: string): Promise<VentaDetalle | null> {
    const v = await ventasRepository.obtenerVenta(id);
    return v ? ventaADetalle(v) : null;
  },

  async crearVenta(input: CrearVentaInput, ctx: { usuarioId: string; ip?: string | null }): Promise<VentaDetalle> {
    const data = crearVentaSchema.parse(input);

    // Caja debe estar abierta y pertenecer al usuario
    const caja = await ventasRepository.obtenerCaja(data.cajaId);
    if (!caja || caja.estado !== "ABIERTA") throw new CajaNoAbiertaError();
    if (caja.abiertaPorId !== ctx.usuarioId) {
      throw new CajaNoAbiertaError();
    }

    // Cliente y tipo de precio efectivo
    let tipoPrecio: TipoPrecio = "PUBLICO";
    let clienteInfo: {
      id: string;
      lineaCredito: number;
      saldoActual: number;
    } | null = null;
    if (data.clienteId) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: data.clienteId },
        select: {
          id: true,
          activo: true,
          tipoCliente: true,
          tipoPrecio: true,
          lineaCredito: true,
          saldoActual: true,
        },
      });
      if (!cliente || !cliente.activo) {
        throw new Error("Cliente no encontrado o inactivo");
      }
      tipoPrecio = tipoPrecioEfectivo({ tipoCliente: cliente.tipoCliente, tipoPrecio: cliente.tipoPrecio });
      clienteInfo = {
        id: cliente.id,
        lineaCredito: toNumber(cliente.lineaCredito),
        saldoActual: toNumber(cliente.saldoActual),
      };
    }

    // Cargar productos y precios para snapshot
    const productoIds = Array.from(new Set(data.lineas.map((l) => l.productoId)));
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds }, activo: true },
      include: { precios: true },
    });
    const productoMap = new Map(productos.map((p) => [p.id, p]));
    for (const id of productoIds) {
      if (!productoMap.has(id)) throw new Error(`Producto no encontrado o inactivo: ${id}`);
    }

    // Calcular líneas (precios incluyen IVA → desglosar)
    type LineaCalculada = {
      productoId: string;
      loteId: string | null;
      productoSku: string;
      productoNombre: string;
      unidadMedida: string;
      cantidad: number;
      precioUnitario: number; // con IVA
      descuento: number;
      subtotal: number; // sin IVA
      ivaTasa: number;
      ivaImporte: number;
      total: number; // con IVA, neto de descuento
    };
    const lineasCalc: LineaCalculada[] = data.lineas.map((l) => {
      const prod = productoMap.get(l.productoId)!;
      const precioRecord = prod.precios.find((p) => p.tipo === tipoPrecio) ?? prod.precios.find((p) => p.tipo === "PUBLICO");
      if (!precioRecord) throw new ProductoSinPrecioError(prod.sku);
      const precioUnitario = toNumber(precioRecord.precio);
      const ivaTasa = toNumber(prod.ivaAplicable);
      const bruto = r2(precioUnitario * l.cantidad);
      const descuento = r2(Math.min(l.descuento ?? 0, bruto));
      const total = r2(bruto - descuento); // con IVA
      const subtotal = r2(total / (1 + ivaTasa)); // sin IVA
      const ivaImporte = r2(total - subtotal);
      return {
        productoId: prod.id,
        loteId: l.loteId ?? null,
        productoSku: prod.sku,
        productoNombre: prod.nombre,
        unidadMedida: prod.unidadMedida,
        cantidad: l.cantidad,
        precioUnitario,
        descuento,
        subtotal,
        ivaTasa,
        ivaImporte,
        total,
      };
    });

    const subtotalGlobal = r2(lineasCalc.reduce((acc, l) => acc + l.subtotal, 0));
    const ivaGlobal = r2(lineasCalc.reduce((acc, l) => acc + l.ivaImporte, 0));
    const descuentoLineasTotal = r2(lineasCalc.reduce((acc, l) => acc + l.descuento, 0));
    const totalAntesDescuentoGlobal = r2(subtotalGlobal + ivaGlobal);
    const descuentoGlobal = r2(Math.min(data.descuentoGlobal ?? 0, totalAntesDescuentoGlobal));
    const total = r2(totalAntesDescuentoGlobal - descuentoGlobal);

    if (total <= 0) throw new Error("El total de la venta debe ser mayor a cero");

    // Validar pagos
    const pagado = r2(data.pagos.reduce((acc, p) => acc + p.monto, 0));
    if (pagado + 0.001 < total) throw new PagoInsuficienteError(total, pagado);
    const cambio = r2(pagado - total);
    const hayEfectivo = data.pagos.some((p) => p.forma === "EFECTIVO");
    if (cambio > 0 && !hayEfectivo) throw new CambioSoloEfectivoError();

    // Validar crédito: si hay pago a crédito, requiere cliente con línea suficiente.
    const montoCredito = r2(
      data.pagos.filter((p) => p.forma === "CREDITO").reduce((acc, p) => acc + p.monto, 0),
    );
    if (montoCredito > 0) {
      if (!clienteInfo) throw new CreditoSinClienteError();
      if (clienteInfo.lineaCredito <= 0) throw new CreditoSinLineaError();
      const nuevoSaldo = clienteInfo.saldoActual + montoCredito;
      if (nuevoSaldo > clienteInfo.lineaCredito + 0.005) {
        throw new CreditoExcedeLineaError(
          clienteInfo.lineaCredito,
          clienteInfo.saldoActual,
          montoCredito,
        );
      }
    }
    // El cambio solo puede salir contra efectivo, no contra crédito (validado arriba),
    // y el crédito no genera cambio.

    // Transacción: crear venta + líneas + pagos + descontar inventario atómicamente.
    // Reintenta ante colisión de folio (correlativo no atómico, protegido por @unique);
    // mismo patrón que compras/cobranza/cuentas-pagar. Ver issue #20.
    let venta: VentaConRelaciones | undefined;
    let alertasBajoStock: Array<{ productoId: string; ubicacionId: string; stock: number; stockMinimo: number }> = [];
    let folioError: unknown;
    for (let intento = 0; intento < 5; intento++) {
    try {
    const resultadoTx = await prisma.$transaction(async (tx) => {
      const folio = await ventasRepository.proximoFolioVenta(tx);
      const v = await tx.venta.create({
        data: {
          folio,
          cajaId: caja.id,
          ubicacionId: caja.ubicacionId,
          usuarioId: ctx.usuarioId,
          clienteId: data.clienteId ?? null,
          estado: "COMPLETADA",
          tipoPrecio,
          subtotal: subtotalGlobal,
          descuentoLineas: descuentoLineasTotal,
          descuentoGlobal,
          iva: ivaGlobal,
          total,
          totalPagado: pagado,
          cambio,
          montoCredito,
          saldoCredito: montoCredito,
          observaciones: data.observaciones,
          lineas: {
            create: lineasCalc.map((l) => ({
              productoId: l.productoId,
              loteId: l.loteId,
              productoSku: l.productoSku,
              productoNombre: l.productoNombre,
              unidadMedida: l.unidadMedida,
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
              descuento: l.descuento,
              subtotal: l.subtotal,
              ivaTasa: l.ivaTasa,
              ivaImporte: l.ivaImporte,
              total: l.total,
            })),
          },
          pagos: {
            create: data.pagos.map((p) => ({
              forma: p.forma,
              monto: p.monto,
              referencia: p.referencia,
            })),
          },
        },
        include: {
          caja: { select: { id: true, folio: true } },
          ubicacion: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          canceladaPor: { select: { id: true, nombre: true } },
          cliente: { select: { id: true, codigo: true, nombre: true, rfc: true } },
          lineas: { include: { lote: { select: { lote: true } } } },
          pagos: true,
          _count: { select: { lineas: true } },
        },
      });

      // Agregamos venta al total vendido de la caja (sólo informativo en vivo)
      await tx.caja.update({
        where: { id: caja.id },
        data: { totalVendido: new D(caja.totalVendido.toString()).plus(total) },
      });

      // Si la venta es a crédito, incrementa saldoActual del cliente.
      if (montoCredito > 0 && clienteInfo) {
        await tx.cliente.update({
          where: { id: clienteInfo.id },
          data: { saldoActual: { increment: montoCredito } },
        });
      }

      // Descontar inventario por línea
      const alertas: Array<{ productoId: string; ubicacionId: string; stock: number; stockMinimo: number }> = [];
      // Agregamos cantidades iguales por (producto,lote) para minimizar movimientos.
      const acumulado = new Map<string, { productoId: string; loteId: string | null; cantidad: number }>();
      for (const l of lineasCalc) {
        const key = `${l.productoId}::${l.loteId ?? ""}`;
        const prev = acumulado.get(key);
        if (prev) prev.cantidad = r2(prev.cantidad + l.cantidad);
        else acumulado.set(key, { productoId: l.productoId, loteId: l.loteId, cantidad: l.cantidad });
      }
      for (const item of acumulado.values()) {
        const res = await inventarioService.aplicarSalidaPorVenta(tx, {
          productoId: item.productoId,
          ubicacionId: caja.ubicacionId,
          loteId: item.loteId,
          cantidad: item.cantidad,
          ventaId: v.id,
          usuarioId: ctx.usuarioId,
          folioVenta: v.folio,
        });
        if (res.bajoMinimo) {
          alertas.push({
            productoId: item.productoId,
            ubicacionId: caja.ubicacionId,
            stock: res.stockResultante,
            stockMinimo: res.stockMinimo,
          });
        }
      }
      return { venta: v, alertasBajoStock: alertas };
    }, TX_OPTS);
    venta = resultadoTx.venta;
    alertasBajoStock = resultadoTx.alertasBajoStock;
    break;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("folio")
      ) {
        folioError = err;
        continue;
      }
      throw err;
    }
    }
    if (!venta) {
      throw folioError ?? new Error("No se pudo generar un folio de venta único");
    }

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "ventas",
      accion: "crear",
      entidad: "venta",
      entidadId: venta.id,
      despues: { folio: venta.folio, total, lineas: lineasCalc.length, formaPagos: data.pagos.map((p) => p.forma) },
      ip: ctx.ip,
    });

    await eventBus.emit(VENTA_EVENTS.CREADA, {
      ventaId: venta.id,
      folio: venta.folio,
      cajaId: venta.cajaId,
      ubicacionId: venta.ubicacionId,
      usuarioId: ctx.usuarioId,
      clienteId: venta.clienteId,
      tipoPrecio,
      total,
      lineas: lineasCalc.map((l) => ({ productoId: l.productoId, loteId: l.loteId, cantidad: l.cantidad })),
    });

    if (alertasBajoStock.length > 0) {
      await inventarioService.notificarBajoStock(alertasBajoStock);
    }

    return ventaADetalle(venta);
  },

  async cancelarVenta(input: CancelarVentaInput, ctx: { usuarioId: string; ip?: string | null }): Promise<VentaDetalle> {
    const data = cancelarVentaSchema.parse(input);
    const actual = await ventasRepository.obtenerVenta(data.ventaId);
    if (!actual) throw new VentaNoEncontradaError();
    if (actual.estado === "CANCELADA") throw new VentaYaCanceladaError();

    // Si la venta tiene crédito con abonos aplicados (saldo < monto), no permitir cancelar
    // hasta que se cancelen esos abonos. saldoCredito solo cae con abonos REGISTRADOS.
    const montoCredito = toNumber(actual.montoCredito);
    const saldoCredito = toNumber(actual.saldoCredito);
    if (montoCredito > 0 && saldoCredito < montoCredito - 0.005) {
      throw new VentaConAbonosAplicadosError();
    }

    const cancelada = await prisma.$transaction(async (tx) => {
      const v = await tx.venta.update({
        where: { id: actual.id },
        data: {
          estado: "CANCELADA",
          motivoCancelacion: data.motivo,
          canceladaPorId: ctx.usuarioId,
          canceladaEn: new Date(),
        },
        include: {
          caja: { select: { id: true, folio: true } },
          ubicacion: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          canceladaPor: { select: { id: true, nombre: true } },
          cliente: { select: { id: true, codigo: true, nombre: true, rfc: true } },
          lineas: { include: { lote: { select: { lote: true } } } },
          pagos: true,
          _count: { select: { lineas: true } },
        },
      });

      // Si la caja sigue abierta, restamos del totalVendido en vivo
      if (actual.caja && actual.caja.id) {
        await tx.caja.updateMany({
          where: { id: actual.cajaId, estado: "ABIERTA" },
          data: { totalVendido: { decrement: actual.total } },
        });
      }

      // Si la venta era a crédito (saldo pendiente), reducimos el saldoActual del
      // cliente por ese saldo (lo que aún no se cobraba) y dejamos saldoCredito=0.
      if (saldoCredito > 0 && actual.clienteId) {
        await tx.cliente.update({
          where: { id: actual.clienteId },
          data: { saldoActual: { decrement: saldoCredito } },
        });
        await tx.venta.update({
          where: { id: actual.id },
          data: { saldoCredito: 0 },
        });
      }

      // Restituir stock por línea (agregado por producto+lote)
      const acumulado = new Map<string, { productoId: string; loteId: string | null; cantidad: number }>();
      for (const l of actual.lineas) {
        const key = `${l.productoId}::${l.loteId ?? ""}`;
        const prev = acumulado.get(key);
        const cant = toNumber(l.cantidad);
        if (prev) prev.cantidad = r2(prev.cantidad + cant);
        else acumulado.set(key, { productoId: l.productoId, loteId: l.loteId, cantidad: cant });
      }
      for (const item of acumulado.values()) {
        await inventarioService.aplicarEntradaPorCancelacionVenta(tx, {
          productoId: item.productoId,
          ubicacionId: actual.ubicacionId,
          loteId: item.loteId,
          cantidad: item.cantidad,
          ventaId: actual.id,
          usuarioId: ctx.usuarioId,
          folioVenta: actual.folio,
        });
      }
      return v;
    }, TX_OPTS);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "ventas",
      accion: "cancelar",
      entidad: "venta",
      entidadId: cancelada.id,
      antes: { estado: "COMPLETADA" },
      despues: { estado: "CANCELADA", motivo: data.motivo },
      ip: ctx.ip,
    });

    await eventBus.emit(VENTA_EVENTS.CANCELADA, {
      ventaId: cancelada.id,
      folio: cancelada.folio,
      ubicacionId: cancelada.ubicacionId,
      usuarioId: ctx.usuarioId,
      motivo: data.motivo,
      lineas: actual.lineas.map((l) => ({
        productoId: l.productoId,
        loteId: l.loteId,
        cantidad: toNumber(l.cantidad),
      })),
    });

    return ventaADetalle(cancelada);
  },

  // ---------------- Reportes operativos básicos ----------------
  async ventasDelDia(fecha = new Date()): Promise<{
    fecha: Date;
    totalVendido: number;
    totalTickets: number;
    ticketPromedio: number;
    porFormaPago: Array<{ forma: string; total: number }>;
    porUsuario: Array<{ usuarioId: string; nombre: string; total: number; tickets: number }>;
  }> {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    const ventas = await prisma.venta.findMany({
      where: { fechaVenta: { gte: inicio, lte: fin }, estado: "COMPLETADA" },
      include: {
        pagos: { select: { forma: true, monto: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });

    const totalVendido = r2(ventas.reduce((acc, v) => acc + toNumber(v.total), 0));
    const totalTickets = ventas.length;
    const ticketPromedio = totalTickets ? r2(totalVendido / totalTickets) : 0;

    const porFormaMap = new Map<string, number>();
    for (const v of ventas) {
      for (const p of v.pagos) porFormaMap.set(p.forma, (porFormaMap.get(p.forma) ?? 0) + toNumber(p.monto));
    }
    const porUsuarioMap = new Map<string, { nombre: string; total: number; tickets: number }>();
    for (const v of ventas) {
      const prev = porUsuarioMap.get(v.usuarioId) ?? { nombre: v.usuario.nombre, total: 0, tickets: 0 };
      prev.total += toNumber(v.total);
      prev.tickets += 1;
      porUsuarioMap.set(v.usuarioId, prev);
    }

    return {
      fecha: inicio,
      totalVendido,
      totalTickets,
      ticketPromedio,
      porFormaPago: Array.from(porFormaMap.entries()).map(([forma, total]) => ({ forma, total: r2(total) })),
      porUsuario: Array.from(porUsuarioMap.entries()).map(([usuarioId, v]) => ({
        usuarioId,
        nombre: v.nombre,
        total: r2(v.total),
        tickets: v.tickets,
      })),
    };
  },
};
