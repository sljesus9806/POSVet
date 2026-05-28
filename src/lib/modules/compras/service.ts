import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { inventarioService } from "../inventario";
import { comprasRepository } from "./repository";
import {
  cancelarOrdenCompraSchema,
  crearOrdenCompraSchema,
  enviarOrdenCompraSchema,
  registrarRecepcionSchema,
  type CancelarOrdenCompraInput,
  type CrearOrdenCompraInput,
  type EnviarOrdenCompraInput,
  type RegistrarRecepcionInput,
} from "./schemas";
import { COMPRA_EVENTS } from "./events";
import type {
  CatalogoSugerencia,
  OrdenCompraDetalle,
  OrdenCompraLinea,
  OrdenCompraListado,
  RecepcionDetalle,
} from "./types";

export class OrdenCompraNoEncontradaError extends Error {
  constructor(id: string) {
    super(`Orden de compra ${id} no encontrada`);
    this.name = "OrdenCompraNoEncontradaError";
  }
}

export class TransicionOcInvalidaError extends Error {
  constructor(actual: string, intentada: string) {
    super(`No se puede ${intentada} una OC en estado ${actual}`);
    this.name = "TransicionOcInvalidaError";
  }
}

export class RecepcionExcedeOcError extends Error {
  constructor(public productoNombre: string, public pendiente: number) {
    super(
      `La cantidad supera lo pendiente para ${productoNombre} (pendiente: ${pendiente})`,
    );
    this.name = "RecepcionExcedeOcError";
  }
}

export class RecepcionVaciaError extends Error {
  constructor() {
    super("Debe registrar al menos una línea con cantidad mayor a 0");
    this.name = "RecepcionVaciaError";
  }
}

const D = Prisma.Decimal;

const toNumber = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === "number" ? d : Number(d.toString());

function mapearLinea(
  l: NonNullable<
    Awaited<ReturnType<typeof comprasRepository.obtenerOrden>>
  >["lineas"][number],
): OrdenCompraLinea {
  const solicitada = toNumber(l.cantidadSolicitada);
  const recibida = toNumber(l.cantidadRecibida);
  return {
    id: l.id,
    productoId: l.productoId,
    productoSku: l.productoSku,
    productoNombre: l.productoNombre,
    unidadMedida: l.unidadMedida,
    codigoProveedor: l.codigoProveedor,
    cantidadSolicitada: solicitada,
    cantidadRecibida: recibida,
    cantidadPendiente: Math.max(0, solicitada - recibida),
    costoUnitario: toNumber(l.costoUnitario),
    ivaTasa: toNumber(l.ivaTasa),
    subtotal: toNumber(l.subtotal),
    ivaImporte: toNumber(l.ivaImporte),
    total: toNumber(l.total),
  };
}

function mapearDetalle(
  oc: NonNullable<Awaited<ReturnType<typeof comprasRepository.obtenerOrden>>>,
): OrdenCompraDetalle {
  return {
    id: oc.id,
    folio: oc.folio,
    proveedorId: oc.proveedorId,
    proveedorNombre: oc.proveedor.nombre,
    ubicacionDestinoId: oc.ubicacionDestinoId,
    ubicacionDestinoNombre: oc.ubicacionDestino.nombre,
    estado: oc.estado,
    subtotal: toNumber(oc.subtotal),
    iva: toNumber(oc.iva),
    total: toNumber(oc.total),
    observaciones: oc.observaciones,
    fechaEsperada: oc.fechaEsperada,
    enviadaEn: oc.enviadaEn,
    cerradaEn: oc.cerradaEn,
    motivoCancelacion: oc.motivoCancelacion,
    canceladaEn: oc.canceladaEn,
    usuarioNombre: oc.usuario.nombre,
    lineas: oc.lineas.map(mapearLinea),
    recepciones: oc.recepciones.map((r) => ({
      id: r.id,
      folio: r.folio,
      fecha: r.fechaRecepcion,
      usuarioNombre: r.usuario.nombre,
      totalLineas: r._count.lineas,
      observaciones: r.observaciones,
    })),
    createdAt: oc.createdAt,
    updatedAt: oc.updatedAt,
  };
}

export const comprasService = {
  async listarOrdenes(opts: {
    estado?: string;
    proveedorId?: string;
    limit?: number;
  } = {}): Promise<OrdenCompraListado[]> {
    const filas = await comprasRepository.listarOrdenes(opts);
    return filas.map((o) => {
      const totalLineas = o.lineas.length;
      const completas = o.lineas.filter(
        (l) => new D(l.cantidadRecibida.toString()).gte(l.cantidadSolicitada.toString()),
      ).length;
      return {
        id: o.id,
        folio: o.folio,
        fecha: o.createdAt,
        proveedorId: o.proveedor.id,
        proveedorNombre: o.proveedor.nombre,
        ubicacionDestinoNombre: o.ubicacionDestino.nombre,
        estado: o.estado,
        total: toNumber(o.total),
        totalLineas,
        lineasCompletas: completas,
      };
    });
  },

  async obtenerOrden(id: string): Promise<OrdenCompraDetalle | null> {
    const oc = await comprasRepository.obtenerOrden(id);
    return oc ? mapearDetalle(oc) : null;
  },

  async sugerenciasDeProveedor(proveedorId: string): Promise<CatalogoSugerencia[]> {
    const filas = await comprasRepository.sugerenciasDeProveedor(proveedorId);
    return filas.map((l) => ({
      productoId: l.productoId,
      sku: l.producto.sku,
      nombre: l.producto.nombre,
      unidadMedida: l.producto.unidadMedida,
      codigoProveedor: l.codigoProveedor,
      costoUnitario: toNumber(l.costoUnitario),
      ivaAplicable: toNumber(l.producto.ivaAplicable),
    }));
  },

  async crearOrden(
    input: CrearOrdenCompraInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<OrdenCompraDetalle> {
    const data = crearOrdenCompraSchema.parse(input);

    // Snapshot de productos (sku, nombre, unidad) al momento de crear
    const productosIds = data.lineas.map((l) => l.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds } },
      select: { id: true, sku: true, nombre: true, unidadMedida: true, ivaAplicable: true },
    });
    const porId = new Map(productos.map((p) => [p.id, p]));
    for (const l of data.lineas) {
      if (!porId.has(l.productoId)) {
        throw new Error(`Producto ${l.productoId} no existe`);
      }
    }

    // Totales calculados
    let subtotal = new D(0);
    let iva = new D(0);
    const lineasData = data.lineas.map((l) => {
      const prod = porId.get(l.productoId)!;
      const lineaSubtotal = new D(l.cantidad).times(l.costoUnitario);
      const lineaIva = lineaSubtotal.times(l.ivaTasa ?? 0);
      const lineaTotal = lineaSubtotal.plus(lineaIva);
      subtotal = subtotal.plus(lineaSubtotal);
      iva = iva.plus(lineaIva);
      return {
        productoId: l.productoId,
        productoSku: prod.sku,
        productoNombre: prod.nombre,
        unidadMedida: prod.unidadMedida,
        codigoProveedor: l.codigoProveedor,
        cantidadSolicitada: l.cantidad,
        costoUnitario: l.costoUnitario,
        ivaTasa: l.ivaTasa ?? 0,
        subtotal: lineaSubtotal,
        ivaImporte: lineaIva,
        total: lineaTotal,
      };
    });
    const total = subtotal.plus(iva);

    // Reintentar hasta 3 veces si el folio colisiona
    let creada: Awaited<ReturnType<typeof comprasRepository.obtenerOrden>> = null;
    let lastError: unknown;
    for (let intento = 0; intento < 3; intento++) {
      try {
        creada = await prisma.$transaction(async (tx) => {
          const folio = await comprasRepository.proximoFolioOC(tx);
          const oc = await tx.ordenCompra.create({
            data: {
              folio,
              proveedorId: data.proveedorId,
              ubicacionDestinoId: data.ubicacionDestinoId,
              usuarioId: ctx.usuarioId,
              estado: "BORRADOR",
              subtotal,
              iva,
              total,
              fechaEsperada: data.fechaEsperada,
              observaciones: data.observaciones,
              lineas: { create: lineasData },
            },
          });
          return tx.ordenCompra.findUnique({
            where: { id: oc.id },
            include: {
              proveedor: { select: { id: true, nombre: true } },
              ubicacionDestino: { select: { id: true, nombre: true } },
              usuario: { select: { nombre: true } },
              lineas: { orderBy: { productoNombre: "asc" } },
              recepciones: {
                orderBy: { fechaRecepcion: "desc" },
                include: {
                  usuario: { select: { nombre: true } },
                  _count: { select: { lineas: true } },
                },
              },
            },
          });
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as string[] | undefined)?.includes("folio")
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    if (!creada) throw lastError ?? new Error("No se pudo generar folio único");

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "compras",
      accion: "oc.crear",
      entidad: "orden_compra",
      entidadId: creada.id,
      despues: { folio: creada.folio, proveedorId: creada.proveedorId, total: toNumber(creada.total) },
      ip: ctx.ip,
    });
    await eventBus.emit(COMPRA_EVENTS.OC_CREADA, {
      ordenCompraId: creada.id,
      folio: creada.folio,
      proveedorId: creada.proveedorId,
      total: toNumber(creada.total),
      usuarioId: ctx.usuarioId,
    });

    return mapearDetalle(creada);
  },

  async enviarOrden(
    input: EnviarOrdenCompraInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<OrdenCompraDetalle> {
    const data = enviarOrdenCompraSchema.parse(input);
    const oc = await comprasRepository.obtenerOrden(data.ordenCompraId);
    if (!oc) throw new OrdenCompraNoEncontradaError(data.ordenCompraId);
    if (oc.estado !== "BORRADOR") throw new TransicionOcInvalidaError(oc.estado, "enviar");

    await prisma.ordenCompra.update({
      where: { id: oc.id },
      data: { estado: "ENVIADA", enviadaEn: new Date() },
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "compras",
      accion: "oc.enviar",
      entidad: "orden_compra",
      entidadId: oc.id,
      despues: { folio: oc.folio },
      ip: ctx.ip,
    });
    await eventBus.emit(COMPRA_EVENTS.OC_ENVIADA, {
      ordenCompraId: oc.id,
      folio: oc.folio,
      usuarioId: ctx.usuarioId,
    });

    const refetch = await comprasRepository.obtenerOrden(oc.id);
    return mapearDetalle(refetch!);
  },

  async cancelarOrden(
    input: CancelarOrdenCompraInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<OrdenCompraDetalle> {
    const data = cancelarOrdenCompraSchema.parse(input);
    const oc = await comprasRepository.obtenerOrden(data.ordenCompraId);
    if (!oc) throw new OrdenCompraNoEncontradaError(data.ordenCompraId);
    if (oc.estado === "RECIBIDA_PARCIAL" || oc.estado === "RECIBIDA_TOTAL") {
      throw new TransicionOcInvalidaError(oc.estado, "cancelar");
    }
    if (oc.estado === "CANCELADA") return mapearDetalle(oc);

    await prisma.ordenCompra.update({
      where: { id: oc.id },
      data: {
        estado: "CANCELADA",
        motivoCancelacion: data.motivo,
        canceladaPorId: ctx.usuarioId,
        canceladaEn: new Date(),
      },
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "compras",
      accion: "oc.cancelar",
      entidad: "orden_compra",
      entidadId: oc.id,
      despues: { folio: oc.folio, motivo: data.motivo },
      ip: ctx.ip,
    });
    await eventBus.emit(COMPRA_EVENTS.OC_CANCELADA, {
      ordenCompraId: oc.id,
      folio: oc.folio,
      motivo: data.motivo,
      usuarioId: ctx.usuarioId,
    });

    const refetch = await comprasRepository.obtenerOrden(oc.id);
    return mapearDetalle(refetch!);
  },

  async registrarRecepcion(
    input: RegistrarRecepcionInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<RecepcionDetalle> {
    const data = registrarRecepcionSchema.parse(input);
    const oc = await comprasRepository.obtenerOrden(data.ordenCompraId);
    if (!oc) throw new OrdenCompraNoEncontradaError(data.ordenCompraId);
    if (oc.estado !== "ENVIADA" && oc.estado !== "RECIBIDA_PARCIAL") {
      throw new TransicionOcInvalidaError(oc.estado, "recibir");
    }
    if (data.lineas.length === 0) throw new RecepcionVaciaError();

    // Validar cantidades pendientes
    const pendientesPorLinea = new Map<string, { pendiente: number; productoNombre: string; productoId: string }>();
    for (const l of oc.lineas) {
      const pendiente = new D(l.cantidadSolicitada.toString()).minus(l.cantidadRecibida.toString());
      pendientesPorLinea.set(l.id, {
        pendiente: Number(pendiente.toString()),
        productoNombre: l.productoNombre,
        productoId: l.productoId,
      });
    }
    for (const l of data.lineas) {
      const ref = pendientesPorLinea.get(l.ocLineaId);
      if (!ref) throw new Error(`Línea ${l.ocLineaId} no pertenece a la OC ${oc.folio}`);
      if (l.cantidad > ref.pendiente + 0.0001) {
        throw new RecepcionExcedeOcError(ref.productoNombre, ref.pendiente);
      }
    }

    type ResultadoLinea = {
      recepcionLineaId: string;
      productoId: string;
      cantidad: number;
      costoUnitario: number;
      loteId: string | null;
      bajoMinimo: boolean;
      stockMinimo: number;
      stockResultante: number;
      ubicacionId: string;
    };

    const resultado = await prisma.$transaction(async (tx) => {
      const folio = await comprasRepository.proximoFolioRecepcion(tx);

      const recepcion = await tx.recepcionMercancia.create({
        data: {
          folio,
          ordenCompraId: oc.id,
          ubicacionId: oc.ubicacionDestinoId,
          usuarioId: ctx.usuarioId,
          observaciones: data.observaciones,
        },
      });

      const lineasCreadas: ResultadoLinea[] = [];

      for (const l of data.lineas) {
        const refOc = pendientesPorLinea.get(l.ocLineaId)!;

        // Lote: si la línea trae lote y caducidad, upsert ProductoLote y sumar cantidad
        let loteId: string | null = null;
        if (l.lote && l.caducidad) {
          const lote = await tx.productoLote.upsert({
            where: { productoId_lote: { productoId: refOc.productoId, lote: l.lote } },
            update: {
              caducidad: l.caducidad,
              cantidad: { increment: l.cantidad },
              costoUnitario: l.costoUnitario,
            },
            create: {
              productoId: refOc.productoId,
              lote: l.lote,
              caducidad: l.caducidad,
              cantidad: l.cantidad,
              costoUnitario: l.costoUnitario,
            },
          });
          loteId = lote.id;
        }

        const lineaRecepcion = await tx.recepcionLinea.create({
          data: {
            recepcionId: recepcion.id,
            ocLineaId: l.ocLineaId,
            productoId: refOc.productoId,
            cantidad: l.cantidad,
            costoUnitario: l.costoUnitario,
            lote: l.lote,
            caducidad: l.caducidad,
            loteId,
          },
        });

        // Actualiza cantidadRecibida en la línea de la OC
        await tx.ocLinea.update({
          where: { id: l.ocLineaId },
          data: { cantidadRecibida: { increment: l.cantidad } },
        });

        // Aplica entrada al inventario (mismo tx → atomicidad)
        const entrada = await inventarioService.aplicarEntradaPorCompra(tx, {
          productoId: refOc.productoId,
          ubicacionId: oc.ubicacionDestinoId,
          loteId,
          cantidad: l.cantidad,
          costoUnitario: l.costoUnitario,
          usuarioId: ctx.usuarioId,
          recepcionId: recepcion.id,
          folioRecepcion: folio,
        });

        lineasCreadas.push({
          recepcionLineaId: lineaRecepcion.id,
          productoId: refOc.productoId,
          cantidad: l.cantidad,
          costoUnitario: l.costoUnitario,
          loteId,
          bajoMinimo: entrada.bajoMinimo,
          stockMinimo: entrada.stockMinimo,
          stockResultante: entrada.stockResultante,
          ubicacionId: oc.ubicacionDestinoId,
        });
      }

      // Recalcular estado de la OC en función de cantidades recibidas tras esta tx
      const lineasOcActualizadas = await tx.ocLinea.findMany({
        where: { ordenCompraId: oc.id },
        select: { cantidadSolicitada: true, cantidadRecibida: true },
      });
      const todasCompletas = lineasOcActualizadas.every((ln) =>
        new D(ln.cantidadRecibida.toString()).gte(ln.cantidadSolicitada.toString()),
      );
      const algunaConRecibido = lineasOcActualizadas.some((ln) =>
        new D(ln.cantidadRecibida.toString()).gt(0),
      );
      const nuevoEstado = todasCompletas
        ? "RECIBIDA_TOTAL"
        : algunaConRecibido
          ? "RECIBIDA_PARCIAL"
          : oc.estado;
      await tx.ordenCompra.update({
        where: { id: oc.id },
        data: {
          estado: nuevoEstado,
          cerradaEn: todasCompletas ? new Date() : null,
        },
      });

      return { recepcion, folio, lineasCreadas };
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "compras",
      accion: "oc.recibir",
      entidad: "recepcion_mercancia",
      entidadId: resultado.recepcion.id,
      despues: {
        folio: resultado.folio,
        ordenCompraFolio: oc.folio,
        totalLineas: resultado.lineasCreadas.length,
      },
      ip: ctx.ip,
    });

    // Emit compra.recibida (con líneas + costos) para suscriptores externos
    await eventBus.emit(COMPRA_EVENTS.RECIBIDA, {
      recepcionId: resultado.recepcion.id,
      folio: resultado.folio,
      ordenCompraId: oc.id,
      ordenCompraFolio: oc.folio,
      ubicacionId: oc.ubicacionDestinoId,
      usuarioId: ctx.usuarioId,
      lineas: resultado.lineasCreadas.map((l) => ({
        recepcionLineaId: l.recepcionLineaId,
        productoId: l.productoId,
        cantidad: l.cantidad,
        costoUnitario: l.costoUnitario,
        loteId: l.loteId,
      })),
    });

    // Notificar bajo stock por las líneas que quedaron en/bajo mínimo (raro tras una entrada, pero posible si el mínimo se acerca)
    const bajoStock = resultado.lineasCreadas
      .filter((l) => l.bajoMinimo)
      .map((l) => ({
        productoId: l.productoId,
        ubicacionId: l.ubicacionId,
        stock: l.stockResultante,
        stockMinimo: l.stockMinimo,
      }));
    if (bajoStock.length > 0) await inventarioService.notificarBajoStock(bajoStock);

    const detalle = await comprasRepository.obtenerRecepcion(resultado.recepcion.id);
    if (!detalle) throw new Error("Recepción recién creada no encontrada");
    return {
      id: detalle.id,
      folio: detalle.folio,
      fecha: detalle.fechaRecepcion,
      ordenCompraId: detalle.ordenCompraId,
      ordenCompraFolio: detalle.ordenCompra.folio,
      proveedorNombre: detalle.ordenCompra.proveedor.nombre,
      ubicacionId: detalle.ubicacion.id,
      ubicacionNombre: detalle.ubicacion.nombre,
      usuarioNombre: detalle.usuario.nombre,
      observaciones: detalle.observaciones,
      lineas: detalle.lineas.map((l) => ({
        id: l.id,
        ocLineaId: l.ocLineaId,
        productoId: l.productoId,
        productoSku: l.producto.sku,
        productoNombre: l.producto.nombre,
        unidadMedida: l.producto.unidadMedida,
        cantidad: toNumber(l.cantidad),
        costoUnitario: toNumber(l.costoUnitario),
        lote: l.lote,
        caducidad: l.caducidad,
        loteId: l.loteId,
      })),
    };
  },

  async listarRecepciones(opts: { ordenCompraId?: string; limit?: number } = {}) {
    const filas = await comprasRepository.listarRecepciones(opts);
    return filas.map((r) => ({
      id: r.id,
      folio: r.folio,
      fecha: r.fechaRecepcion,
      ordenCompraFolio: r.ordenCompra.folio,
      proveedorNombre: r.ordenCompra.proveedor.nombre,
      ubicacionNombre: r.ubicacion.nombre,
      usuarioNombre: r.usuario.nombre,
      totalLineas: r._count.lineas,
    }));
  },

  async obtenerRecepcion(id: string): Promise<RecepcionDetalle | null> {
    const r = await comprasRepository.obtenerRecepcion(id);
    if (!r) return null;
    return {
      id: r.id,
      folio: r.folio,
      fecha: r.fechaRecepcion,
      ordenCompraId: r.ordenCompraId,
      ordenCompraFolio: r.ordenCompra.folio,
      proveedorNombre: r.ordenCompra.proveedor.nombre,
      ubicacionId: r.ubicacion.id,
      ubicacionNombre: r.ubicacion.nombre,
      usuarioNombre: r.usuario.nombre,
      observaciones: r.observaciones,
      lineas: r.lineas.map((l) => ({
        id: l.id,
        ocLineaId: l.ocLineaId,
        productoId: l.productoId,
        productoSku: l.producto.sku,
        productoNombre: l.producto.nombre,
        unidadMedida: l.producto.unidadMedida,
        cantidad: toNumber(l.cantidad),
        costoUnitario: toNumber(l.costoUnitario),
        lote: l.lote,
        caducidad: l.caducidad,
        loteId: l.loteId,
      })),
    };
  },
};
