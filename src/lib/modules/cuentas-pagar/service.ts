import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { cuentasPagarRepository } from "./repository";
import {
  cancelarFacturaSchema,
  cancelarPagoSchema,
  registrarFacturaSchema,
  registrarPagoSchema,
  type CancelarFacturaInput,
  type CancelarPagoInput,
  type RegistrarFacturaInput,
  type RegistrarPagoInput,
} from "./schemas";
import { CUENTAS_PAGAR_EVENTS } from "./events";
import type {
  EstadoCuentaProveedor,
  FacturaDetalle,
  FacturaListado,
  PagoDetalle,
  PagoListado,
  ResumenCxP,
} from "./types";

export class FacturaNoEncontradaError extends Error {
  constructor(id: string) {
    super(`Factura ${id} no encontrada`);
    this.name = "FacturaNoEncontradaError";
  }
}

export class FacturaDuplicadaError extends Error {
  constructor(folio: string) {
    super(`Ya existe una factura del proveedor con folio ${folio}`);
    this.name = "FacturaDuplicadaError";
  }
}

export class FacturaCanceladaError extends Error {
  constructor() {
    super("La factura está cancelada y no admite operaciones");
    this.name = "FacturaCanceladaError";
  }
}

export class FacturaConPagosError extends Error {
  constructor() {
    super("La factura tiene pagos aplicados; cancela primero los pagos");
    this.name = "FacturaConPagosError";
  }
}

export class PagoNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Pago ${id} no encontrado`);
    this.name = "PagoNoEncontradoError";
  }
}

export class PagoCanceladoError extends Error {
  constructor() {
    super("El pago ya fue cancelado");
    this.name = "PagoCanceladoError";
  }
}

export class DistribucionInvalidaError extends Error {
  constructor(esperado: number, recibido: number) {
    super(
      `La suma de aplicaciones (${recibido.toFixed(2)}) debe igualar al monto del pago (${esperado.toFixed(2)})`,
    );
    this.name = "DistribucionInvalidaError";
  }
}

export class AplicacionExcedeSaldoError extends Error {
  constructor(public folioFactura: string, public saldo: number) {
    super(`La aplicación a la factura ${folioFactura} supera su saldo (${saldo.toFixed(2)})`);
    this.name = "AplicacionExcedeSaldoError";
  }
}

export class FacturaDistintoProveedorError extends Error {
  constructor() {
    super("Todas las facturas del pago deben pertenecer al mismo proveedor");
    this.name = "FacturaDistintoProveedorError";
  }
}

const D = Prisma.Decimal;
const CENT_TOL = new D("0.005");

const toNumber = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === "number" ? d : Number(d.toString());

function diasParaVencer(vencimiento: Date) {
  const ahora = Date.now();
  return Math.ceil((vencimiento.getTime() - ahora) / (1000 * 60 * 60 * 24));
}

function mapearListado(
  f: Awaited<ReturnType<typeof cuentasPagarRepository.listarFacturas>>[number],
): FacturaListado {
  return {
    id: f.id,
    folio: f.folio,
    folioProveedor: f.folioProveedor,
    proveedorId: f.proveedorId,
    proveedorNombre: f.proveedor.nombre,
    fechaEmision: f.fechaEmision,
    fechaVencimiento: f.fechaVencimiento,
    diasParaVencer: diasParaVencer(f.fechaVencimiento),
    total: toNumber(f.total),
    saldo: toNumber(f.saldo),
    estado: f.estado,
    ordenCompraFolio: f.ordenCompra?.folio ?? null,
  };
}

function mapearPagoListado(
  p: Awaited<ReturnType<typeof cuentasPagarRepository.listarPagos>>[number],
): PagoListado {
  return {
    id: p.id,
    folio: p.folio,
    proveedorId: p.proveedorId,
    proveedorNombre: p.proveedor.nombre,
    fecha: p.fecha,
    formaPago: p.formaPago,
    monto: toNumber(p.monto),
    estado: p.estado,
    totalAplicaciones: p._count.aplicaciones,
  };
}

export const cuentasPagarService = {
  async listarFacturas(opts: {
    estado?: string;
    proveedorId?: string;
    soloVencidas?: boolean;
    limit?: number;
  } = {}): Promise<FacturaListado[]> {
    const filas = await cuentasPagarRepository.listarFacturas(opts);
    return filas.map(mapearListado);
  },

  async obtenerFactura(id: string): Promise<FacturaDetalle | null> {
    const f = await cuentasPagarRepository.obtenerFactura(id);
    if (!f) return null;
    return {
      id: f.id,
      folio: f.folio,
      folioProveedor: f.folioProveedor,
      proveedorId: f.proveedorId,
      proveedorNombre: f.proveedor.nombre,
      ordenCompraId: f.ordenCompraId,
      ordenCompraFolio: f.ordenCompra?.folio ?? null,
      fechaEmision: f.fechaEmision,
      fechaVencimiento: f.fechaVencimiento,
      subtotal: toNumber(f.subtotal),
      iva: toNumber(f.iva),
      total: toNumber(f.total),
      saldo: toNumber(f.saldo),
      estado: f.estado,
      observaciones: f.observaciones,
      motivoCancelacion: f.motivoCancelacion,
      canceladaEn: f.canceladaEn,
      usuarioNombre: f.usuario.nombre,
      aplicaciones: f.aplicaciones.map((a) => ({
        id: a.id,
        pagoId: a.pago.id,
        pagoFolio: a.pago.folio,
        pagoFecha: a.pago.fecha,
        pagoEstado: a.pago.estado,
        formaPago: a.pago.formaPago,
        monto: toNumber(a.monto),
      })),
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    };
  },

  async resumen(): Promise<ResumenCxP> {
    const r = await cuentasPagarRepository.resumen();
    return {
      totalPorPagar: toNumber(r.totales._sum.saldo),
      vencidasMonto: toNumber(r.vencidas._sum.saldo),
      vencidasCount: r.vencidas._count,
      porVencer30dMonto: toNumber(r.porVencer._sum.saldo),
      porVencer30dCount: r.porVencer._count,
    };
  },

  async estadoCuenta(proveedorId: string): Promise<EstadoCuentaProveedor | null> {
    const r = await cuentasPagarRepository.estadoCuenta(proveedorId);
    if (!r.proveedor) return null;
    return {
      proveedorId: r.proveedor.id,
      proveedorCodigo: r.proveedor.codigo,
      proveedorNombre: r.proveedor.nombre,
      saldoActual: toNumber(r.proveedor.saldoActual),
      totalFacturado: toNumber(r.totalFacturado._sum.total),
      totalPagado: toNumber(r.totalPagado._sum.monto),
      facturasPendientes: r.pendientes.map(mapearListado),
      pagosRecientes: r.pagosRecientes.map(mapearPagoListado),
    };
  },

  async registrarFactura(
    input: RegistrarFacturaInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<FacturaDetalle> {
    const data = registrarFacturaSchema.parse(input);

    let creada: { id: string } | null = null;
    let lastError: unknown;
    for (let intento = 0; intento < 3; intento++) {
      try {
        creada = await prisma.$transaction(async (tx) => {
          const folio = await cuentasPagarRepository.proximoFolioFactura(tx);
          const factura = await tx.facturaProveedor.create({
            data: {
              folio,
              folioProveedor: data.folioProveedor,
              proveedorId: data.proveedorId,
              ordenCompraId: data.ordenCompraId,
              fechaEmision: data.fechaEmision,
              fechaVencimiento: data.fechaVencimiento,
              subtotal: data.subtotal,
              iva: data.iva,
              total: data.total,
              saldo: data.total,
              estado: "PENDIENTE",
              observaciones: data.observaciones,
              usuarioId: ctx.usuarioId,
            },
            select: { id: true },
          });

          // Actualiza saldo del proveedor
          await tx.proveedor.update({
            where: { id: data.proveedorId },
            data: { saldoActual: { increment: data.total } },
          });

          return factura;
        });
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          const target = err.meta?.target as string[] | undefined;
          if (target?.includes("folio")) {
            lastError = err;
            continue;
          }
          if (target?.includes("folioProveedor")) {
            throw new FacturaDuplicadaError(data.folioProveedor);
          }
        }
        throw err;
      }
    }
    if (!creada) throw lastError ?? new Error("No se pudo generar folio interno único");

    const detalle = await this.obtenerFactura(creada.id);
    if (!detalle) throw new Error("Factura recién creada no encontrada");

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "cuentas-pagar",
      accion: "factura.capturar",
      entidad: "factura_proveedor",
      entidadId: detalle.id,
      despues: {
        folio: detalle.folio,
        folioProveedor: detalle.folioProveedor,
        proveedorId: detalle.proveedorId,
        total: detalle.total,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(CUENTAS_PAGAR_EVENTS.FACTURA_CAPTURADA, {
      facturaId: detalle.id,
      folio: detalle.folio,
      proveedorId: detalle.proveedorId,
      total: detalle.total,
      ordenCompraId: detalle.ordenCompraId,
      usuarioId: ctx.usuarioId,
    });

    return detalle;
  },

  async cancelarFactura(
    input: CancelarFacturaInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<FacturaDetalle> {
    const data = cancelarFacturaSchema.parse(input);
    const f = await cuentasPagarRepository.obtenerFactura(data.facturaId);
    if (!f) throw new FacturaNoEncontradaError(data.facturaId);
    if (f.estado === "CANCELADA") return (await this.obtenerFactura(f.id))!;
    const tienePagosActivos = f.aplicaciones.some((a) => a.pago.estado === "REGISTRADO");
    if (tienePagosActivos) throw new FacturaConPagosError();

    await prisma.$transaction(async (tx) => {
      await tx.facturaProveedor.update({
        where: { id: f.id },
        data: {
          estado: "CANCELADA",
          motivoCancelacion: data.motivo,
          canceladaPorId: ctx.usuarioId,
          canceladaEn: new Date(),
        },
      });
      // Restar saldo del proveedor (el saldo de la factura ya estaba sin aplicaciones)
      await tx.proveedor.update({
        where: { id: f.proveedorId },
        data: { saldoActual: { decrement: f.saldo } },
      });
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "cuentas-pagar",
      accion: "factura.cancelar",
      entidad: "factura_proveedor",
      entidadId: f.id,
      despues: { folio: f.folio, motivo: data.motivo },
      ip: ctx.ip,
    });
    await eventBus.emit(CUENTAS_PAGAR_EVENTS.FACTURA_CANCELADA, {
      facturaId: f.id,
      folio: f.folio,
      proveedorId: f.proveedorId,
      motivo: data.motivo,
      usuarioId: ctx.usuarioId,
    });

    return (await this.obtenerFactura(f.id))!;
  },

  async listarPagos(opts: { proveedorId?: string; estado?: string; limit?: number } = {}): Promise<PagoListado[]> {
    const filas = await cuentasPagarRepository.listarPagos(opts);
    return filas.map(mapearPagoListado);
  },

  async obtenerPago(id: string): Promise<PagoDetalle | null> {
    const p = await cuentasPagarRepository.obtenerPago(id);
    if (!p) return null;
    return {
      id: p.id,
      folio: p.folio,
      proveedorId: p.proveedorId,
      proveedorNombre: p.proveedor.nombre,
      fecha: p.fecha,
      formaPago: p.formaPago,
      monto: toNumber(p.monto),
      referencia: p.referencia,
      observaciones: p.observaciones,
      estado: p.estado,
      motivoCancelacion: p.motivoCancelacion,
      canceladoEn: p.canceladoEn,
      usuarioNombre: p.usuario.nombre,
      aplicaciones: p.aplicaciones.map((a) => ({
        id: a.id,
        facturaId: a.facturaId,
        facturaFolio: a.factura.folio,
        folioProveedor: a.factura.folioProveedor,
        monto: toNumber(a.monto),
      })),
    };
  },

  async registrarPago(
    input: RegistrarPagoInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<PagoDetalle> {
    const data = registrarPagoSchema.parse(input);

    // Suma de aplicaciones debe igualar al monto del pago
    const sumaAplic = data.aplicaciones.reduce((acc, a) => acc + a.monto, 0);
    if (Math.abs(sumaAplic - data.monto) > 0.01) {
      throw new DistribucionInvalidaError(data.monto, sumaAplic);
    }

    // Verifica que todas las facturas existan, pertenezcan al mismo proveedor,
    // no estén canceladas y los montos no excedan los saldos.
    const facturasIds = data.aplicaciones.map((a) => a.facturaId);
    const facturas = await prisma.facturaProveedor.findMany({
      where: { id: { in: facturasIds } },
      select: {
        id: true,
        folio: true,
        proveedorId: true,
        saldo: true,
        estado: true,
      },
    });
    if (facturas.length !== facturasIds.length) {
      throw new FacturaNoEncontradaError(facturasIds.find((id) => !facturas.some((f) => f.id === id))!);
    }
    for (const f of facturas) {
      if (f.proveedorId !== data.proveedorId) throw new FacturaDistintoProveedorError();
      if (f.estado === "CANCELADA") throw new FacturaCanceladaError();
    }
    for (const a of data.aplicaciones) {
      const fact = facturas.find((f) => f.id === a.facturaId)!;
      const saldo = new D(fact.saldo.toString());
      if (saldo.lt(new D(a.monto).minus(CENT_TOL))) {
        throw new AplicacionExcedeSaldoError(fact.folio, Number(saldo.toString()));
      }
    }

    let pagoId: string | null = null;
    let lastError: unknown;
    const facturasParaEvento: { facturaId: string; monto: number; nuevoSaldo: number; folio: string }[] = [];

    for (let intento = 0; intento < 3; intento++) {
      try {
        pagoId = await prisma.$transaction(async (tx) => {
          const folio = await cuentasPagarRepository.proximoFolioPago(tx);
          const pago = await tx.proveedorPago.create({
            data: {
              folio,
              proveedorId: data.proveedorId,
              fecha: data.fecha ?? new Date(),
              formaPago: data.formaPago,
              monto: data.monto,
              referencia: data.referencia,
              observaciones: data.observaciones,
              estado: "REGISTRADO",
              usuarioId: ctx.usuarioId,
              aplicaciones: {
                create: data.aplicaciones.map((a) => ({
                  facturaId: a.facturaId,
                  monto: a.monto,
                })),
              },
            },
            select: { id: true, folio: true },
          });

          // Actualizar saldo y estado de cada factura
          for (const a of data.aplicaciones) {
            const fact = await tx.facturaProveedor.findUniqueOrThrow({
              where: { id: a.facturaId },
              select: { id: true, folio: true, total: true, saldo: true },
            });
            const nuevoSaldo = new D(fact.saldo.toString()).minus(a.monto);
            const total = new D(fact.total.toString());
            const pagada = nuevoSaldo.lte(CENT_TOL);
            const nuevoEstado = pagada
              ? "PAGADA"
              : nuevoSaldo.lt(total)
                ? "PAGADA_PARCIAL"
                : "PENDIENTE";
            await tx.facturaProveedor.update({
              where: { id: fact.id },
              data: { saldo: nuevoSaldo, estado: nuevoEstado },
            });
            facturasParaEvento.push({
              facturaId: fact.id,
              monto: a.monto,
              nuevoSaldo: Number(nuevoSaldo.toString()),
              folio: fact.folio,
            });
          }

          // Restar del saldo del proveedor
          await tx.proveedor.update({
            where: { id: data.proveedorId },
            data: { saldoActual: { decrement: data.monto } },
          });

          return pago.id;
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as string[] | undefined)?.includes("folio")
        ) {
          lastError = err;
          facturasParaEvento.length = 0;
          continue;
        }
        throw err;
      }
    }
    if (!pagoId) throw lastError ?? new Error("No se pudo generar folio único");

    const detalle = await this.obtenerPago(pagoId);
    if (!detalle) throw new Error("Pago recién creado no encontrado");

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "cuentas-pagar",
      accion: "pago.registrar",
      entidad: "proveedor_pago",
      entidadId: detalle.id,
      despues: {
        folio: detalle.folio,
        proveedorId: detalle.proveedorId,
        monto: detalle.monto,
        aplicaciones: detalle.aplicaciones.length,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(CUENTAS_PAGAR_EVENTS.PAGO_REGISTRADO, {
      pagoId: detalle.id,
      folio: detalle.folio,
      proveedorId: detalle.proveedorId,
      monto: detalle.monto,
      aplicaciones: detalle.aplicaciones.map((a) => ({ facturaId: a.facturaId, monto: a.monto })),
      usuarioId: ctx.usuarioId,
    });

    // Emitir factura.pagada por cada factura que quedó saldada
    for (const fa of facturasParaEvento) {
      if (fa.nuevoSaldo <= 0.005) {
        await eventBus.emit(CUENTAS_PAGAR_EVENTS.FACTURA_PAGADA, {
          facturaId: fa.facturaId,
          folio: fa.folio,
          proveedorId: data.proveedorId,
          total: fa.monto,
        });
      }
    }

    return detalle;
  },

  async cancelarPago(
    input: CancelarPagoInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<PagoDetalle> {
    const data = cancelarPagoSchema.parse(input);
    const p = await cuentasPagarRepository.obtenerPago(data.pagoId);
    if (!p) throw new PagoNoEncontradoError(data.pagoId);
    if (p.estado === "CANCELADO") throw new PagoCanceladoError();

    await prisma.$transaction(async (tx) => {
      await tx.proveedorPago.update({
        where: { id: p.id },
        data: {
          estado: "CANCELADO",
          motivoCancelacion: data.motivo,
          canceladoPorId: ctx.usuarioId,
          canceladoEn: new Date(),
        },
      });

      // Revertir cada aplicación: sumar al saldo de la factura, recalcular estado
      for (const a of p.aplicaciones) {
        const fact = await tx.facturaProveedor.findUniqueOrThrow({
          where: { id: a.facturaId },
          select: { id: true, total: true, saldo: true, estado: true },
        });
        // No reactivamos saldo si la factura está cancelada (saldo ya estaba decrementado del proveedor en su momento).
        if (fact.estado === "CANCELADA") continue;
        const nuevoSaldo = new D(fact.saldo.toString()).plus(a.monto);
        const total = new D(fact.total.toString());
        const nuevoEstado = nuevoSaldo.gte(total)
          ? "PENDIENTE"
          : nuevoSaldo.gt(CENT_TOL)
            ? "PAGADA_PARCIAL"
            : "PAGADA";
        await tx.facturaProveedor.update({
          where: { id: fact.id },
          data: { saldo: nuevoSaldo, estado: nuevoEstado },
        });
      }

      // Devolver el monto al saldo del proveedor
      await tx.proveedor.update({
        where: { id: p.proveedorId },
        data: { saldoActual: { increment: p.monto } },
      });
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "cuentas-pagar",
      accion: "pago.cancelar",
      entidad: "proveedor_pago",
      entidadId: p.id,
      despues: { folio: p.folio, motivo: data.motivo },
      ip: ctx.ip,
    });
    await eventBus.emit(CUENTAS_PAGAR_EVENTS.PAGO_CANCELADO, {
      pagoId: p.id,
      folio: p.folio,
      proveedorId: p.proveedorId,
      motivo: data.motivo,
      usuarioId: ctx.usuarioId,
    });

    return (await this.obtenerPago(p.id))!;
  },
};
