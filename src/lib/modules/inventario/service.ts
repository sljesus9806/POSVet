import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { inventarioRepository } from "./repository";
import {
  ajustarStockSchema,
  crearTransferenciaSchema,
  definirStockMinimoSchema,
  registrarEntradaSchema,
  type AjustarStockInput,
  type CrearTransferenciaInput,
  type DefinirStockMinimoInput,
  type RegistrarEntradaInput,
} from "./schemas";
import { INVENTARIO_EVENTS } from "./events";
import type {
  AlertaBajoStock,
  AlertaCaducidad,
  MovimientoListado,
  StockPorUbicacion,
  StockProductoResumen,
  TransferenciaListado,
} from "./types";

export class StockInsuficienteError extends Error {
  constructor(public productoId: string, public ubicacionId: string, public faltante: number) {
    super(`Stock insuficiente del producto ${productoId} en la ubicación ${ubicacionId} (faltan ${faltante})`);
    this.name = "StockInsuficienteError";
  }
}

export class InventarioNoEncontradoError extends Error {
  constructor() {
    super("No existe registro de inventario para el producto y ubicación indicados");
    this.name = "InventarioNoEncontradoError";
  }
}

const D = Prisma.Decimal;

function toNumber(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : Number(d.toString());
}

async function obtenerOCrearInventario(
  tx: Prisma.TransactionClient,
  productoId: string,
  ubicacionId: string,
) {
  const existente = await tx.inventario.findUnique({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
  });
  if (existente) return existente;
  return tx.inventario.create({
    data: { productoId, ubicacionId, stock: 0, stockMinimo: 0 },
  });
}

export const inventarioService = {
  async listarStock(opts: { ubicacionId?: string; q?: string } = {}): Promise<StockPorUbicacion[]> {
    const filas = await inventarioRepository.listarStock(opts);
    return filas.map((f) => ({
      productoId: f.productoId,
      productoNombre: f.producto.nombre,
      sku: f.producto.sku,
      unidadMedida: f.producto.unidadMedida,
      ubicacionId: f.ubicacionId,
      ubicacionNombre: f.ubicacion.nombre,
      stock: toNumber(f.stock),
      stockMinimo: toNumber(f.stockMinimo),
      stockMaximo: f.stockMaximo ? toNumber(f.stockMaximo) : null,
    }));
  },

  async stockDeProducto(productoId: string): Promise<StockProductoResumen | null> {
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true, sku: true, nombre: true, unidadMedida: true },
    });
    if (!producto) return null;
    const filas = await inventarioRepository.listarStockPorProducto(productoId);
    const porUbicacion = filas.map((f) => ({
      ubicacionId: f.ubicacionId,
      ubicacionNombre: f.ubicacion.nombre,
      stock: toNumber(f.stock),
      stockMinimo: toNumber(f.stockMinimo),
    }));
    return {
      productoId: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      unidadMedida: producto.unidadMedida,
      porUbicacion,
      stockTotal: porUbicacion.reduce((acc, x) => acc + x.stock, 0),
    };
  },

  async definirStockMinimo(input: DefinirStockMinimoInput, ctx: { usuarioId: string }) {
    const data = definirStockMinimoSchema.parse(input);
    const inv = await prisma.inventario.upsert({
      where: { productoId_ubicacionId: { productoId: data.productoId, ubicacionId: data.ubicacionId } },
      update: { stockMinimo: data.stockMinimo, stockMaximo: data.stockMaximo ?? null },
      create: {
        productoId: data.productoId,
        ubicacionId: data.ubicacionId,
        stock: 0,
        stockMinimo: data.stockMinimo,
        stockMaximo: data.stockMaximo ?? null,
      },
    });
    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "inventario",
      accion: "definir_minimo",
      entidad: "inventario",
      entidadId: inv.id,
      despues: { stockMinimo: data.stockMinimo, stockMaximo: data.stockMaximo },
    });
    return inv;
  },

  async ajustarStock(input: AjustarStockInput, ctx: { usuarioId: string; ip?: string | null }) {
    const data = ajustarStockSchema.parse(input);
    const cantidad = Math.abs(data.delta);
    const tipo = data.delta > 0 ? "ENTRADA" : "SALIDA";

    const resultado = await prisma.$transaction(async (tx) => {
      const inv = await obtenerOCrearInventario(tx, data.productoId, data.ubicacionId);

      // Aplicación atómica del ajuste: increment para entradas; para salidas,
      // UPDATE ... WHERE stock >= cantidad, que bajo concurrencia evita dejar el
      // stock negativo (el read-check-write previo no era seguro). Ver issue #20.
      if (data.delta > 0) {
        await tx.inventario.update({
          where: { id: inv.id },
          data: { stock: { increment: cantidad } },
        });
      } else {
        const descuento = await tx.inventario.updateMany({
          where: { id: inv.id, stock: { gte: cantidad } },
          data: { stock: { decrement: cantidad } },
        });
        if (descuento.count === 0) {
          const actual = await tx.inventario.findUniqueOrThrow({ where: { id: inv.id } });
          throw new StockInsuficienteError(
            data.productoId,
            data.ubicacionId,
            Number(new D(cantidad).minus(actual.stock.toString()).toString()),
          );
        }
      }

      const invActualizado = await tx.inventario.findUniqueOrThrow({ where: { id: inv.id } });
      const nuevoStock = new D(invActualizado.stock.toString());

      const mov = await tx.inventarioMovimiento.create({
        data: {
          productoId: data.productoId,
          ubicacionId: data.ubicacionId,
          loteId: data.loteId ?? null,
          tipo,
          motivo: data.motivo,
          cantidad,
          stockResultante: nuevoStock,
          usuarioId: ctx.usuarioId,
          observaciones: data.observaciones,
          referenciaTipo: "ajuste",
        },
      });

      return { inv: invActualizado, mov, stock: Number(nuevoStock.toString()) };
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "inventario",
      accion: "ajuste",
      entidad: "inventario",
      entidadId: resultado.inv.id,
      despues: { delta: data.delta, motivo: data.motivo, stock: resultado.stock },
      ip: ctx.ip,
    });

    await eventBus.emit(INVENTARIO_EVENTS.MOVIMIENTO, {
      movimientoId: resultado.mov.id,
      productoId: data.productoId,
      ubicacionId: data.ubicacionId,
      tipo,
      motivo: data.motivo,
      cantidad,
      stockResultante: resultado.stock,
      usuarioId: ctx.usuarioId,
    });

    const minimo = toNumber(resultado.inv.stockMinimo);
    if (minimo > 0 && resultado.stock <= minimo) {
      await eventBus.emit(INVENTARIO_EVENTS.BAJO_STOCK, {
        productoId: data.productoId,
        ubicacionId: data.ubicacionId,
        stock: resultado.stock,
        stockMinimo: minimo,
      });
    }

    return resultado;
  },

  async registrarEntrada(input: RegistrarEntradaInput, ctx: { usuarioId: string; ip?: string | null }) {
    const data = registrarEntradaSchema.parse(input);

    const resultado = await prisma.$transaction(async (tx) => {
      const inv = await obtenerOCrearInventario(tx, data.productoId, data.ubicacionId);
      const stockActual = new D(inv.stock.toString());
      const nuevoStock = stockActual.plus(data.cantidad);

      const invActualizado = await tx.inventario.update({
        where: { id: inv.id },
        data: { stock: nuevoStock },
      });

      // Costo promedio ponderado
      const prod = await tx.producto.findUniqueOrThrow({
        where: { id: data.productoId },
        select: { costoPromedio: true },
      });
      const stockPrevio = stockActual;
      const promedioPrevio = new D(prod.costoPromedio.toString());
      const nuevoPromedio = stockPrevio.plus(data.cantidad).gt(0)
        ? stockPrevio
            .times(promedioPrevio)
            .plus(new D(data.cantidad).times(data.costoUnitario))
            .div(stockPrevio.plus(data.cantidad))
        : new D(data.costoUnitario);
      await tx.producto.update({
        where: { id: data.productoId },
        data: { ultimoCosto: data.costoUnitario, costoPromedio: nuevoPromedio },
      });

      const mov = await tx.inventarioMovimiento.create({
        data: {
          productoId: data.productoId,
          ubicacionId: data.ubicacionId,
          loteId: data.loteId ?? null,
          tipo: "ENTRADA",
          motivo: "COMPRA",
          cantidad: data.cantidad,
          costoUnitario: data.costoUnitario,
          stockResultante: nuevoStock,
          usuarioId: ctx.usuarioId,
          observaciones: data.observaciones,
          referenciaTipo: "entrada",
        },
      });

      return { inv: invActualizado, mov, stock: Number(nuevoStock.toString()) };
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "inventario",
      accion: "entrada",
      entidad: "inventario",
      entidadId: resultado.inv.id,
      despues: { cantidad: data.cantidad, costoUnitario: data.costoUnitario },
      ip: ctx.ip,
    });

    await eventBus.emit(INVENTARIO_EVENTS.MOVIMIENTO, {
      movimientoId: resultado.mov.id,
      productoId: data.productoId,
      ubicacionId: data.ubicacionId,
      tipo: "ENTRADA",
      motivo: "COMPRA",
      cantidad: data.cantidad,
      stockResultante: resultado.stock,
      usuarioId: ctx.usuarioId,
    });

    return resultado;
  },

  async crearTransferencia(input: CrearTransferenciaInput, ctx: { usuarioId: string; ip?: string | null }) {
    const data = crearTransferenciaSchema.parse(input);

    const transferencia = await prisma.$transaction(async (tx) => {
      // Validar stock disponible en origen
      for (const linea of data.lineas) {
        const inv = await tx.inventario.findUnique({
          where: { productoId_ubicacionId: { productoId: linea.productoId, ubicacionId: data.origenId } },
        });
        const disponible = inv ? new D(inv.stock.toString()) : new D(0);
        if (disponible.lt(linea.cantidad)) {
          throw new StockInsuficienteError(
            linea.productoId,
            data.origenId,
            Number(new D(linea.cantidad).minus(disponible).toString()),
          );
        }
      }

      // Generar folio T-YYYY-NNNNN
      const año = new Date().getFullYear();
      const count = await tx.transferencia.count({
        where: { folio: { startsWith: `T-${año}-` } },
      });
      const folio = `T-${año}-${String(count + 1).padStart(5, "0")}`;

      const transferencia = await tx.transferencia.create({
        data: {
          folio,
          origenId: data.origenId,
          destinoId: data.destinoId,
          usuarioId: ctx.usuarioId,
          estado: "COMPLETADA",
          observaciones: data.observaciones,
          completadaEn: new Date(),
          lineas: {
            create: data.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
          },
        },
      });

      // Mover stock línea por línea
      for (const linea of data.lineas) {
        // SALIDA del origen — descuento atómico con guarda de stock (ver issue #20).
        const descuentoOrigen = await tx.inventario.updateMany({
          where: {
            productoId: linea.productoId,
            ubicacionId: data.origenId,
            stock: { gte: linea.cantidad },
          },
          data: { stock: { decrement: linea.cantidad } },
        });
        if (descuentoOrigen.count === 0) {
          const actual = await tx.inventario.findUnique({
            where: { productoId_ubicacionId: { productoId: linea.productoId, ubicacionId: data.origenId } },
          });
          const disponible = actual ? new D(actual.stock.toString()) : new D(0);
          throw new StockInsuficienteError(
            linea.productoId,
            data.origenId,
            Number(new D(linea.cantidad).minus(disponible).toString()),
          );
        }
        const invOrigen = await tx.inventario.findUniqueOrThrow({
          where: { productoId_ubicacionId: { productoId: linea.productoId, ubicacionId: data.origenId } },
        });
        const stockOrigen = new D(invOrigen.stock.toString());
        await tx.inventarioMovimiento.create({
          data: {
            productoId: linea.productoId,
            ubicacionId: data.origenId,
            tipo: "TRANSFERENCIA",
            motivo: "TRANSFERENCIA_SALIDA",
            cantidad: linea.cantidad,
            stockResultante: stockOrigen,
            usuarioId: ctx.usuarioId,
            referenciaTipo: "transferencia",
            referenciaId: transferencia.id,
            observaciones: `Transferencia ${folio} → ${data.destinoId}`,
          },
        });

        // ENTRADA al destino — incremento atómico (evita lost updates concurrentes).
        const invDestino = await obtenerOCrearInventario(tx, linea.productoId, data.destinoId);
        await tx.inventario.update({
          where: { id: invDestino.id },
          data: { stock: { increment: linea.cantidad } },
        });
        const invDestinoActualizado = await tx.inventario.findUniqueOrThrow({ where: { id: invDestino.id } });
        const stockDestino = new D(invDestinoActualizado.stock.toString());
        await tx.inventarioMovimiento.create({
          data: {
            productoId: linea.productoId,
            ubicacionId: data.destinoId,
            tipo: "TRANSFERENCIA",
            motivo: "TRANSFERENCIA_ENTRADA",
            cantidad: linea.cantidad,
            stockResultante: stockDestino,
            usuarioId: ctx.usuarioId,
            referenciaTipo: "transferencia",
            referenciaId: transferencia.id,
            observaciones: `Transferencia ${folio} ← ${data.origenId}`,
          },
        });
      }

      return transferencia;
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "inventario",
      accion: "transferencia",
      entidad: "transferencia",
      entidadId: transferencia.id,
      despues: { folio: transferencia.folio, lineas: data.lineas.length },
      ip: ctx.ip,
    });

    await eventBus.emit(INVENTARIO_EVENTS.TRANSFERENCIA_CREADA, {
      transferenciaId: transferencia.id,
      folio: transferencia.folio,
      origenId: data.origenId,
      destinoId: data.destinoId,
      usuarioId: ctx.usuarioId,
    });
    await eventBus.emit(INVENTARIO_EVENTS.TRANSFERENCIA_COMPLETADA, {
      transferenciaId: transferencia.id,
      folio: transferencia.folio,
      usuarioId: ctx.usuarioId,
    });

    return transferencia;
  },

  async listarTransferencias(opts: { limit?: number } = {}): Promise<TransferenciaListado[]> {
    const filas = await inventarioRepository.listarTransferencias(opts);
    return filas.map((t) => ({
      id: t.id,
      folio: t.folio,
      fecha: t.createdAt,
      origenNombre: t.origen.nombre,
      destinoNombre: t.destino.nombre,
      estado: t.estado,
      totalLineas: t._count.lineas,
      usuarioNombre: t.usuario.nombre,
    }));
  },

  obtenerTransferencia(id: string) {
    return inventarioRepository.obtenerTransferencia(id);
  },

  async listarMovimientos(opts: { productoId?: string; ubicacionId?: string; limit?: number } = {}): Promise<MovimientoListado[]> {
    const filas = await inventarioRepository.listarMovimientos(opts);
    return filas.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      motivo: m.motivo,
      productoId: m.productoId,
      productoSku: m.producto.sku,
      productoNombre: m.producto.nombre,
      ubicacionNombre: m.ubicacion.nombre,
      loteNumero: m.lote?.lote ?? null,
      cantidad: toNumber(m.cantidad),
      stockResultante: toNumber(m.stockResultante),
      costoUnitario: m.costoUnitario ? toNumber(m.costoUnitario) : null,
      observaciones: m.observaciones,
      usuarioNombre: m.usuario.nombre,
    }));
  },

  /**
   * Descuenta stock como SALIDA por venta dentro de una transacción provista por el
   * caller. Devuelve los datos necesarios para que el caller dispare alertas de
   * bajo stock DESPUÉS del commit. No emite eventos por sí misma (la atomicidad
   * de la venta requiere que el caller controle el commit).
   *
   * Lanza StockInsuficienteError si la cantidad excede el stock disponible.
   */
  async aplicarSalidaPorVenta(
    tx: Prisma.TransactionClient,
    params: {
      productoId: string;
      ubicacionId: string;
      loteId?: string | null;
      cantidad: number;
      ventaId: string;
      usuarioId: string;
      folioVenta: string;
    },
  ) {
    // Descuento atómico con guarda de stock: UPDATE ... WHERE stock >= cantidad.
    // Bajo concurrencia (READ COMMITTED) el segundo UPDATE espera el lock de fila y al
    // reevaluar el WHERE contra el stock ya comprometido no afecta filas, evitando la
    // sobreventa. El read-check-write previo no era seguro. Ver issue #20.
    const descuento = await tx.inventario.updateMany({
      where: {
        productoId: params.productoId,
        ubicacionId: params.ubicacionId,
        stock: { gte: params.cantidad },
      },
      data: { stock: { decrement: params.cantidad } },
    });
    if (descuento.count === 0) {
      const actual = await tx.inventario.findUnique({
        where: { productoId_ubicacionId: { productoId: params.productoId, ubicacionId: params.ubicacionId } },
      });
      const disponible = actual ? new D(actual.stock.toString()) : new D(0);
      throw new StockInsuficienteError(
        params.productoId,
        params.ubicacionId,
        Number(new D(params.cantidad).minus(disponible).toString()),
      );
    }
    const invActualizado = await tx.inventario.findUniqueOrThrow({
      where: { productoId_ubicacionId: { productoId: params.productoId, ubicacionId: params.ubicacionId } },
    });
    const nuevoStock = new D(invActualizado.stock.toString());

    const mov = await tx.inventarioMovimiento.create({
      data: {
        productoId: params.productoId,
        ubicacionId: params.ubicacionId,
        loteId: params.loteId ?? null,
        tipo: "SALIDA",
        motivo: "VENTA",
        cantidad: params.cantidad,
        stockResultante: nuevoStock,
        usuarioId: params.usuarioId,
        referenciaTipo: "venta",
        referenciaId: params.ventaId,
        observaciones: `Venta ${params.folioVenta}`,
      },
    });

    const stockResultante = Number(nuevoStock.toString());
    const minimo = toNumber(invActualizado.stockMinimo);
    return {
      movimientoId: mov.id,
      stockResultante,
      bajoMinimo: minimo > 0 && stockResultante <= minimo,
      stockMinimo: minimo,
    };
  },

  /**
   * Aplica una entrada de inventario por recepción de compra dentro de una
   * transacción provista por el caller. Crea el InventarioMovimiento, actualiza
   * el stock por ubicación y recalcula ultimoCosto/costoPromedio del producto.
   *
   * Devuelve `bajoMinimo` para que el caller emita alertas DESPUÉS del commit.
   */
  async aplicarEntradaPorCompra(
    tx: Prisma.TransactionClient,
    params: {
      productoId: string;
      ubicacionId: string;
      loteId?: string | null;
      cantidad: number;
      costoUnitario: number;
      usuarioId: string;
      recepcionId: string;
      folioRecepcion: string;
    },
  ) {
    const inv = await obtenerOCrearInventario(tx, params.productoId, params.ubicacionId);
    const stockPrevio = new D(inv.stock.toString());
    const nuevoStock = stockPrevio.plus(params.cantidad);

    const invActualizado = await tx.inventario.update({
      where: { id: inv.id },
      data: { stock: nuevoStock },
    });

    // Costo promedio ponderado por el stock total del producto (no por ubicación)
    const prod = await tx.producto.findUniqueOrThrow({
      where: { id: params.productoId },
      select: { costoPromedio: true },
    });
    const stockTotalAgg = await tx.inventario.aggregate({
      where: { productoId: params.productoId },
      _sum: { stock: true },
    });
    // El stock devuelto por el aggregate ya incluye el update anterior dentro de la tx.
    const stockTotalDespues = new D(stockTotalAgg._sum.stock?.toString() ?? "0");
    const stockTotalAntes = stockTotalDespues.minus(params.cantidad);
    const promedioPrevio = new D(prod.costoPromedio.toString());
    const nuevoPromedio = stockTotalDespues.gt(0)
      ? stockTotalAntes
          .times(promedioPrevio)
          .plus(new D(params.cantidad).times(params.costoUnitario))
          .div(stockTotalDespues)
      : new D(params.costoUnitario);
    await tx.producto.update({
      where: { id: params.productoId },
      data: { ultimoCosto: params.costoUnitario, costoPromedio: nuevoPromedio },
    });

    const mov = await tx.inventarioMovimiento.create({
      data: {
        productoId: params.productoId,
        ubicacionId: params.ubicacionId,
        loteId: params.loteId ?? null,
        tipo: "ENTRADA",
        motivo: "COMPRA",
        cantidad: params.cantidad,
        costoUnitario: params.costoUnitario,
        stockResultante: nuevoStock,
        usuarioId: params.usuarioId,
        referenciaTipo: "recepcion",
        referenciaId: params.recepcionId,
        observaciones: `Recepción ${params.folioRecepcion}`,
      },
    });

    const stockResultante = Number(nuevoStock.toString());
    const minimo = toNumber(invActualizado.stockMinimo);
    return {
      movimientoId: mov.id,
      stockResultante,
      bajoMinimo: minimo > 0 && stockResultante <= minimo,
      stockMinimo: minimo,
    };
  },

  /**
   * Restaura stock por cancelación de venta. Misma convención que aplicarSalidaPorVenta.
   */
  async aplicarEntradaPorCancelacionVenta(
    tx: Prisma.TransactionClient,
    params: {
      productoId: string;
      ubicacionId: string;
      loteId?: string | null;
      cantidad: number;
      ventaId: string;
      usuarioId: string;
      folioVenta: string;
    },
  ) {
    const inv = await obtenerOCrearInventario(tx, params.productoId, params.ubicacionId);
    const nuevoStock = new D(inv.stock.toString()).plus(params.cantidad);
    await tx.inventario.update({ where: { id: inv.id }, data: { stock: nuevoStock } });
    const mov = await tx.inventarioMovimiento.create({
      data: {
        productoId: params.productoId,
        ubicacionId: params.ubicacionId,
        loteId: params.loteId ?? null,
        tipo: "ENTRADA",
        motivo: "DEVOLUCION_CLIENTE",
        cantidad: params.cantidad,
        stockResultante: nuevoStock,
        usuarioId: params.usuarioId,
        referenciaTipo: "venta_cancelada",
        referenciaId: params.ventaId,
        observaciones: `Cancelación venta ${params.folioVenta}`,
      },
    });
    return { movimientoId: mov.id, stockResultante: Number(nuevoStock.toString()) };
  },

  // Emite las notificaciones de bajo stock detectadas durante una operación
  // transaccional ya commiteada. Pensado para usarse después de aplicarSalidaPorVenta.
  async notificarBajoStock(items: Array<{ productoId: string; ubicacionId: string; stock: number; stockMinimo: number }>) {
    for (const it of items) {
      await eventBus.emit(INVENTARIO_EVENTS.BAJO_STOCK, it);
    }
  },

  async alertasBajoStock(): Promise<AlertaBajoStock[]> {
    const filas = await inventarioRepository.listarBajoStock();
    return filas.map((f) => ({
      productoId: f.productoId,
      sku: f.sku,
      nombre: f.nombre,
      ubicacionId: f.ubicacionId,
      ubicacionNombre: f.ubicacionNombre,
      stock: Number(f.stock),
      stockMinimo: Number(f.stockMinimo),
    }));
  },

  async alertasPorCaducar(dias: number): Promise<AlertaCaducidad[]> {
    const filas = await inventarioRepository.listarPorCaducar(dias);
    const ahora = new Date();
    return filas
      .filter((l) => l.producto.activo)
      .map((l) => {
        const diff = Math.ceil((l.caducidad.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
        return {
          loteId: l.id,
          productoId: l.productoId,
          sku: l.producto.sku,
          productoNombre: l.producto.nombre,
          lote: l.lote,
          caducidad: l.caducidad,
          diasRestantes: diff,
          cantidad: toNumber(l.cantidad),
        };
      });
  },
};
