import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { cobranzaRepository } from "./repository";
import {
  cancelarAbonoSchema,
  registrarAbonoSchema,
  type CancelarAbonoInput,
  type RegistrarAbonoInput,
} from "./schemas";
import { COBRANZA_EVENTS } from "./events";
import type {
  AbonoDetalle,
  AbonoListado,
  EstadoCuentaCliente,
  ResumenCobranza,
  VentaCreditoListado,
} from "./types";

export class AbonoNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Abono ${id} no encontrado`);
    this.name = "AbonoNoEncontradoError";
  }
}

export class AbonoCanceladoError extends Error {
  constructor() {
    super("El abono ya fue cancelado");
    this.name = "AbonoCanceladoError";
  }
}

export class VentaNoCreditoError extends Error {
  constructor(public folioVenta: string) {
    super(`La venta ${folioVenta} no tiene saldo a crédito.`);
    this.name = "VentaNoCreditoError";
  }
}

export class VentaDistintoClienteError extends Error {
  constructor() {
    super("Todas las ventas del abono deben pertenecer al mismo cliente");
    this.name = "VentaDistintoClienteError";
  }
}

export class AplicacionExcedeSaldoVentaError extends Error {
  constructor(public folioVenta: string, public saldo: number) {
    super(
      `La aplicación a la venta ${folioVenta} supera su saldo (${saldo.toFixed(2)})`,
    );
    this.name = "AplicacionExcedeSaldoVentaError";
  }
}

export class DistribucionInvalidaError extends Error {
  constructor(esperado: number, recibido: number) {
    super(
      `La suma de aplicaciones (${recibido.toFixed(2)}) debe igualar al monto del abono (${esperado.toFixed(2)})`,
    );
    this.name = "DistribucionInvalidaError";
  }
}

const D = Prisma.Decimal;
const CENT_TOL = new D("0.005");

const toNumber = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === "number" ? d : Number(d.toString());

function diasDesde(fecha: Date) {
  return Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24));
}

function mapearVentaCredito(
  v: Awaited<ReturnType<typeof cobranzaRepository.listarVentasCredito>>[number],
): VentaCreditoListado {
  return {
    ventaId: v.id,
    folio: v.folio,
    fechaVenta: v.fechaVenta,
    total: toNumber(v.total),
    montoCredito: toNumber(v.montoCredito),
    saldoCredito: toNumber(v.saldoCredito),
    diasDesdeVenta: diasDesde(v.fechaVenta),
    clienteId: v.clienteId ?? "",
    clienteNombre: v.cliente?.nombre ?? "—",
  };
}

function mapearAbonoListado(
  a: Awaited<ReturnType<typeof cobranzaRepository.listarAbonos>>[number],
): AbonoListado {
  return {
    id: a.id,
    folio: a.folio,
    clienteId: a.clienteId,
    clienteNombre: a.cliente.nombre,
    fecha: a.fecha,
    formaPago: a.formaPago,
    monto: toNumber(a.monto),
    estado: a.estado,
    totalAplicaciones: a._count.aplicaciones,
  };
}

export const cobranzaService = {
  async resumen(): Promise<ResumenCobranza> {
    const r = await cobranzaRepository.resumen();
    return {
      totalPorCobrar: toNumber(r.totales._sum.saldoCredito),
      clientesConSaldo: r.clientes,
    };
  },

  async listarVentasCredito(opts: { clienteId?: string; soloPendientes?: boolean; limit?: number } = {}): Promise<VentaCreditoListado[]> {
    const filas = await cobranzaRepository.listarVentasCredito(opts);
    return filas.map(mapearVentaCredito);
  },

  async listarAbonos(opts: { clienteId?: string; estado?: string; limit?: number } = {}): Promise<AbonoListado[]> {
    const filas = await cobranzaRepository.listarAbonos(opts);
    return filas.map(mapearAbonoListado);
  },

  async obtenerAbono(id: string): Promise<AbonoDetalle | null> {
    const a = await cobranzaRepository.obtenerAbono(id);
    if (!a) return null;
    return {
      id: a.id,
      folio: a.folio,
      clienteId: a.clienteId,
      clienteNombre: a.cliente.nombre,
      fecha: a.fecha,
      formaPago: a.formaPago,
      monto: toNumber(a.monto),
      referencia: a.referencia,
      observaciones: a.observaciones,
      estado: a.estado,
      motivoCancelacion: a.motivoCancelacion,
      canceladoEn: a.canceladoEn,
      usuarioNombre: a.usuario.nombre,
      aplicaciones: a.aplicaciones.map((x) => ({
        id: x.id,
        ventaId: x.ventaId,
        ventaFolio: x.venta.folio,
        monto: toNumber(x.monto),
      })),
    };
  },

  async estadoCuenta(clienteId: string): Promise<EstadoCuentaCliente | null> {
    const r = await cobranzaRepository.estadoCuenta(clienteId);
    if (!r) return null;
    const lineaCredito = toNumber(r.cliente.lineaCredito);
    const saldoActual = toNumber(r.cliente.saldoActual);
    return {
      clienteId: r.cliente.id,
      clienteCodigo: r.cliente.codigo,
      clienteNombre: r.cliente.nombre,
      lineaCredito,
      saldoActual,
      disponible: Math.max(0, lineaCredito - saldoActual),
      diasCredito: r.cliente.diasCredito,
      ventasCredito: r.ventas.map((v) => ({
        ventaId: v.id,
        folio: v.folio,
        fechaVenta: v.fechaVenta,
        total: toNumber(v.total),
        montoCredito: toNumber(v.montoCredito),
        saldoCredito: toNumber(v.saldoCredito),
        diasDesdeVenta: diasDesde(v.fechaVenta),
        clienteId: r.cliente.id,
        clienteNombre: r.cliente.nombre,
      })),
      abonosRecientes: r.abonos.map(mapearAbonoListado),
    };
  },

  async registrarAbono(
    input: RegistrarAbonoInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<AbonoDetalle> {
    const data = registrarAbonoSchema.parse(input);

    // Suma de aplicaciones debe igualar al monto del abono
    const sumaAplic = data.aplicaciones.reduce((acc, a) => acc + a.monto, 0);
    if (Math.abs(sumaAplic - data.monto) > 0.01) {
      throw new DistribucionInvalidaError(data.monto, sumaAplic);
    }

    // Verifica ventas: mismo cliente, con saldo de crédito, montos no excedidos
    const ventasIds = data.aplicaciones.map((a) => a.ventaId);
    const ventas = await prisma.venta.findMany({
      where: { id: { in: ventasIds } },
      select: {
        id: true,
        folio: true,
        clienteId: true,
        saldoCredito: true,
        estado: true,
      },
    });
    if (ventas.length !== ventasIds.length) {
      throw new Error("Una o más ventas no existen");
    }
    for (const v of ventas) {
      if (v.estado !== "COMPLETADA") throw new VentaNoCreditoError(v.folio);
      if (v.clienteId !== data.clienteId) throw new VentaDistintoClienteError();
      const saldo = new D(v.saldoCredito.toString());
      if (saldo.lte(0)) throw new VentaNoCreditoError(v.folio);
    }
    for (const a of data.aplicaciones) {
      const v = ventas.find((x) => x.id === a.ventaId)!;
      const saldo = new D(v.saldoCredito.toString());
      if (saldo.lt(new D(a.monto).minus(CENT_TOL))) {
        throw new AplicacionExcedeSaldoVentaError(v.folio, Number(saldo.toString()));
      }
    }

    let abonoId: string | null = null;
    let lastError: unknown;
    const ventasSaldadas: { ventaId: string; folio: string; montoCredito: number }[] = [];

    for (let intento = 0; intento < 3; intento++) {
      try {
        abonoId = await prisma.$transaction(async (tx) => {
          const folio = await cobranzaRepository.proximoFolioAbono(tx);
          const abono = await tx.clienteAbono.create({
            data: {
              folio,
              clienteId: data.clienteId,
              fecha: data.fecha ?? new Date(),
              formaPago: data.formaPago,
              monto: data.monto,
              referencia: data.referencia,
              observaciones: data.observaciones,
              estado: "REGISTRADO",
              usuarioId: ctx.usuarioId,
              aplicaciones: {
                create: data.aplicaciones.map((a) => ({
                  ventaId: a.ventaId,
                  monto: a.monto,
                })),
              },
            },
            select: { id: true, folio: true },
          });

          // Decrementar saldoCredito de cada venta; identificar las que quedan saldadas
          for (const a of data.aplicaciones) {
            const v = await tx.venta.findUniqueOrThrow({
              where: { id: a.ventaId },
              select: { id: true, folio: true, saldoCredito: true, montoCredito: true },
            });
            const nuevoSaldo = new D(v.saldoCredito.toString()).minus(a.monto);
            await tx.venta.update({
              where: { id: v.id },
              data: { saldoCredito: nuevoSaldo },
            });
            if (nuevoSaldo.lte(CENT_TOL)) {
              ventasSaldadas.push({
                ventaId: v.id,
                folio: v.folio,
                montoCredito: toNumber(v.montoCredito),
              });
            }
          }

          // Restar saldoActual del cliente por el total del abono
          await tx.cliente.update({
            where: { id: data.clienteId },
            data: { saldoActual: { decrement: data.monto } },
          });

          return abono.id;
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as string[] | undefined)?.includes("folio")
        ) {
          lastError = err;
          ventasSaldadas.length = 0;
          continue;
        }
        throw err;
      }
    }
    if (!abonoId) throw lastError ?? new Error("No se pudo generar folio único");

    const detalle = await this.obtenerAbono(abonoId);
    if (!detalle) throw new Error("Abono recién creado no encontrado");

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "cobranza",
      accion: "abono.registrar",
      entidad: "cliente_abono",
      entidadId: detalle.id,
      despues: {
        folio: detalle.folio,
        clienteId: detalle.clienteId,
        monto: detalle.monto,
        aplicaciones: detalle.aplicaciones.length,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(COBRANZA_EVENTS.ABONO_REGISTRADO, {
      abonoId: detalle.id,
      folio: detalle.folio,
      clienteId: detalle.clienteId,
      monto: detalle.monto,
      aplicaciones: detalle.aplicaciones.map((a) => ({ ventaId: a.ventaId, monto: a.monto })),
      usuarioId: ctx.usuarioId,
    });
    for (const vs of ventasSaldadas) {
      await eventBus.emit(COBRANZA_EVENTS.VENTA_SALDADA, {
        ventaId: vs.ventaId,
        folio: vs.folio,
        clienteId: data.clienteId,
        montoCredito: vs.montoCredito,
      });
    }

    return detalle;
  },

  async cancelarAbono(
    input: CancelarAbonoInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<AbonoDetalle> {
    const data = cancelarAbonoSchema.parse(input);
    const a = await cobranzaRepository.obtenerAbono(data.abonoId);
    if (!a) throw new AbonoNoEncontradoError(data.abonoId);
    if (a.estado === "CANCELADO") throw new AbonoCanceladoError();

    await prisma.$transaction(async (tx) => {
      await tx.clienteAbono.update({
        where: { id: a.id },
        data: {
          estado: "CANCELADO",
          motivoCancelacion: data.motivo,
          canceladoPorId: ctx.usuarioId,
          canceladoEn: new Date(),
        },
      });

      // Restaurar saldoCredito de cada venta aplicada (si la venta no está cancelada)
      for (const apl of a.aplicaciones) {
        const v = await tx.venta.findUniqueOrThrow({
          where: { id: apl.ventaId },
          select: { id: true, estado: true, saldoCredito: true, montoCredito: true },
        });
        if (v.estado === "CANCELADA") continue;
        const nuevoSaldo = new D(v.saldoCredito.toString()).plus(apl.monto);
        await tx.venta.update({
          where: { id: v.id },
          data: { saldoCredito: nuevoSaldo },
        });
      }

      // Devolver al saldoActual del cliente el monto del abono
      await tx.cliente.update({
        where: { id: a.clienteId },
        data: { saldoActual: { increment: a.monto } },
      });
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "cobranza",
      accion: "abono.cancelar",
      entidad: "cliente_abono",
      entidadId: a.id,
      despues: { folio: a.folio, motivo: data.motivo },
      ip: ctx.ip,
    });
    await eventBus.emit(COBRANZA_EVENTS.ABONO_CANCELADO, {
      abonoId: a.id,
      folio: a.folio,
      clienteId: a.clienteId,
      motivo: data.motivo,
      usuarioId: ctx.usuarioId,
    });

    return (await this.obtenerAbono(a.id))!;
  },
};
