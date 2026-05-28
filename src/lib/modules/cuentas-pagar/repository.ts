import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

const facturaListadoSelect = {
  id: true,
  folio: true,
  folioProveedor: true,
  proveedorId: true,
  fechaEmision: true,
  fechaVencimiento: true,
  total: true,
  saldo: true,
  estado: true,
  proveedor: { select: { nombre: true } },
  ordenCompra: { select: { folio: true } },
} satisfies Prisma.FacturaProveedorSelect;

export const cuentasPagarRepository = {
  listarFacturas(opts: {
    estado?: string;
    proveedorId?: string;
    soloVencidas?: boolean;
    limit?: number;
  } = {}) {
    const where: Prisma.FacturaProveedorWhereInput = {};
    if (opts.estado) where.estado = opts.estado as Prisma.EnumEstadoFacturaProveedorFilter["equals"];
    if (opts.proveedorId) where.proveedorId = opts.proveedorId;
    if (opts.soloVencidas) {
      where.estado = { in: ["PENDIENTE", "PAGADA_PARCIAL"] };
      where.fechaVencimiento = { lt: new Date() };
    }
    return prisma.facturaProveedor.findMany({
      where,
      orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "desc" }],
      take: opts.limit ?? 200,
      select: facturaListadoSelect,
    });
  },

  obtenerFactura(id: string) {
    return prisma.facturaProveedor.findUnique({
      where: { id },
      include: {
        proveedor: { select: { id: true, codigo: true, nombre: true } },
        ordenCompra: { select: { id: true, folio: true } },
        usuario: { select: { nombre: true } },
        canceladaPor: { select: { nombre: true } },
        aplicaciones: {
          include: {
            pago: {
              select: {
                id: true,
                folio: true,
                fecha: true,
                formaPago: true,
                estado: true,
              },
            },
          },
        },
      },
    });
  },

  obtenerFacturaParaActualizarSaldo(tx: Prisma.TransactionClient, id: string) {
    return tx.facturaProveedor.findUniqueOrThrow({
      where: { id },
      select: { id: true, total: true, saldo: true, estado: true },
    });
  },

  listarPagos(opts: { proveedorId?: string; estado?: string; limit?: number } = {}) {
    const where: Prisma.ProveedorPagoWhereInput = {};
    if (opts.proveedorId) where.proveedorId = opts.proveedorId;
    if (opts.estado) where.estado = opts.estado as Prisma.EnumEstadoProveedorPagoFilter["equals"];
    return prisma.proveedorPago.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: opts.limit ?? 100,
      include: {
        proveedor: { select: { nombre: true } },
        _count: { select: { aplicaciones: true } },
      },
    });
  },

  obtenerPago(id: string) {
    return prisma.proveedorPago.findUnique({
      where: { id },
      include: {
        proveedor: { select: { id: true, codigo: true, nombre: true } },
        usuario: { select: { nombre: true } },
        canceladoPor: { select: { nombre: true } },
        aplicaciones: {
          include: {
            factura: { select: { folio: true, folioProveedor: true } },
          },
        },
      },
    });
  },

  proximoFolioFactura(tx: Prisma.TransactionClient) {
    const año = new Date().getFullYear();
    return tx.facturaProveedor
      .count({ where: { folio: { startsWith: `FCP-${año}-` } } })
      .then((n) => `FCP-${año}-${String(n + 1).padStart(5, "0")}`);
  },

  proximoFolioPago(tx: Prisma.TransactionClient) {
    const año = new Date().getFullYear();
    return tx.proveedorPago
      .count({ where: { folio: { startsWith: `PAG-${año}-` } } })
      .then((n) => `PAG-${año}-${String(n + 1).padStart(5, "0")}`);
  },

  // Resumen para el dashboard de CxP
  async resumen() {
    const ahora = new Date();
    const en30dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totales, vencidas, porVencer] = await Promise.all([
      prisma.facturaProveedor.aggregate({
        where: { estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] } },
        _sum: { saldo: true },
      }),
      prisma.facturaProveedor.aggregate({
        where: {
          estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] },
          fechaVencimiento: { lt: ahora },
        },
        _sum: { saldo: true },
        _count: true,
      }),
      prisma.facturaProveedor.aggregate({
        where: {
          estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] },
          fechaVencimiento: { gte: ahora, lt: en30dias },
        },
        _sum: { saldo: true },
        _count: true,
      }),
    ]);

    return { totales, vencidas, porVencer };
  },

  async estadoCuenta(proveedorId: string) {
    const [proveedor, totalFacturado, totalPagado, pendientes, pagosRecientes] = await Promise.all([
      prisma.proveedor.findUnique({
        where: { id: proveedorId },
        select: { id: true, codigo: true, nombre: true, saldoActual: true },
      }),
      prisma.facturaProveedor.aggregate({
        where: { proveedorId, estado: { not: "CANCELADA" } },
        _sum: { total: true },
      }),
      prisma.proveedorPago.aggregate({
        where: { proveedorId, estado: "REGISTRADO" },
        _sum: { monto: true },
      }),
      prisma.facturaProveedor.findMany({
        where: { proveedorId, estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] } },
        orderBy: { fechaVencimiento: "asc" },
        take: 50,
        select: facturaListadoSelect,
      }),
      prisma.proveedorPago.findMany({
        where: { proveedorId },
        orderBy: { fecha: "desc" },
        take: 20,
        include: {
          proveedor: { select: { nombre: true } },
          _count: { select: { aplicaciones: true } },
        },
      }),
    ]);

    return { proveedor, totalFacturado, totalPagado, pendientes, pagosRecientes };
  },
};
