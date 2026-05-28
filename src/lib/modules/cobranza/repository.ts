import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

export const cobranzaRepository = {
  listarVentasCredito(opts: { clienteId?: string; soloPendientes?: boolean; limit?: number } = {}) {
    const where: Prisma.VentaWhereInput = {
      estado: "COMPLETADA",
      montoCredito: { gt: 0 },
    };
    if (opts.clienteId) where.clienteId = opts.clienteId;
    if (opts.soloPendientes !== false) {
      where.saldoCredito = { gt: 0 };
    }
    return prisma.venta.findMany({
      where,
      orderBy: { fechaVenta: "desc" },
      take: opts.limit ?? 200,
      select: {
        id: true,
        folio: true,
        fechaVenta: true,
        total: true,
        montoCredito: true,
        saldoCredito: true,
        clienteId: true,
        cliente: { select: { nombre: true } },
      },
    });
  },

  listarAbonos(opts: { clienteId?: string; estado?: string; limit?: number } = {}) {
    const where: Prisma.ClienteAbonoWhereInput = {};
    if (opts.clienteId) where.clienteId = opts.clienteId;
    if (opts.estado) where.estado = opts.estado as Prisma.EnumEstadoClienteAbonoFilter["equals"];
    return prisma.clienteAbono.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: opts.limit ?? 100,
      include: {
        cliente: { select: { nombre: true } },
        _count: { select: { aplicaciones: true } },
      },
    });
  },

  obtenerAbono(id: string) {
    return prisma.clienteAbono.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, codigo: true, nombre: true } },
        usuario: { select: { nombre: true } },
        canceladoPor: { select: { nombre: true } },
        aplicaciones: {
          include: {
            venta: { select: { id: true, folio: true } },
          },
        },
      },
    });
  },

  proximoFolioAbono(tx: Prisma.TransactionClient) {
    const año = new Date().getFullYear();
    return tx.clienteAbono
      .count({ where: { folio: { startsWith: `ABO-${año}-` } } })
      .then((n) => `ABO-${año}-${String(n + 1).padStart(5, "0")}`);
  },

  async resumen() {
    const [totales, clientes] = await Promise.all([
      prisma.venta.aggregate({
        where: {
          estado: "COMPLETADA",
          montoCredito: { gt: 0 },
          saldoCredito: { gt: 0 },
        },
        _sum: { saldoCredito: true },
      }),
      prisma.cliente.count({ where: { saldoActual: { gt: 0 } } }),
    ]);
    return { totales, clientes };
  },

  async estadoCuenta(clienteId: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        lineaCredito: true,
        saldoActual: true,
        diasCredito: true,
      },
    });
    if (!cliente) return null;
    const [ventas, abonos] = await Promise.all([
      prisma.venta.findMany({
        where: {
          clienteId,
          estado: "COMPLETADA",
          montoCredito: { gt: 0 },
          saldoCredito: { gt: 0 },
        },
        orderBy: { fechaVenta: "asc" },
        select: {
          id: true,
          folio: true,
          fechaVenta: true,
          total: true,
          montoCredito: true,
          saldoCredito: true,
        },
      }),
      prisma.clienteAbono.findMany({
        where: { clienteId },
        orderBy: { fecha: "desc" },
        take: 20,
        include: {
          cliente: { select: { nombre: true } },
          _count: { select: { aplicaciones: true } },
        },
      }),
    ]);
    return { cliente, ventas, abonos };
  },
};
