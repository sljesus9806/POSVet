import { prisma } from "@/lib/modules/shared/db";
import type { Prisma } from "@prisma/client";

// Decimal de Prisma -> number.
const toNum = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === "number" ? d : Number(d.toString());

export type WindowVentas = {
  desde: Date;
  hasta: Date;
  ubicacionId?: string;
};

export const reportesRepository = {
  async ventasEnRango(w: WindowVentas) {
    return prisma.venta.findMany({
      where: {
        fechaVenta: { gte: w.desde, lte: w.hasta },
        estado: { not: "CANCELADA" },
        ...(w.ubicacionId ? { ubicacionId: w.ubicacionId } : {}),
      },
      select: {
        id: true,
        fechaVenta: true,
        total: true,
        usuarioId: true,
        usuario: { select: { nombre: true } },
      },
    });
  },

  async ventasCanceladasEnRango(w: WindowVentas) {
    return prisma.venta.findMany({
      where: {
        canceladaEn: { gte: w.desde, lte: w.hasta },
        estado: "CANCELADA",
        ...(w.ubicacionId ? { ubicacionId: w.ubicacionId } : {}),
      },
      select: { id: true, total: true },
    });
  },

  async pagosDeVentas(ventaIds: string[]) {
    if (ventaIds.length === 0) return [];
    return prisma.ventaPago.findMany({
      where: { ventaId: { in: ventaIds } },
      select: { forma: true, monto: true },
    });
  },

  async lineasEnRango(w: WindowVentas) {
    return prisma.ventaLinea.findMany({
      where: {
        venta: {
          fechaVenta: { gte: w.desde, lte: w.hasta },
          estado: { not: "CANCELADA" },
          ...(w.ubicacionId ? { ubicacionId: w.ubicacionId } : {}),
        },
      },
      select: {
        productoId: true,
        cantidad: true,
        total: true,
        producto: {
          select: {
            sku: true,
            nombre: true,
            unidadMedida: true,
            categoria: { select: { nombre: true } },
          },
        },
      },
    });
  },

  async ubicacionPorId(id: string) {
    return prisma.ubicacion.findUnique({
      where: { id },
      select: { id: true, nombre: true },
    });
  },

  async categoriaPorId(id: string) {
    return prisma.categoria.findUnique({
      where: { id },
      select: { id: true, nombre: true },
    });
  },

  // ===== Inventario actual =====
  async inventarioActual(opts: {
    ubicacionId?: string;
    categoriaId?: string;
    soloConStock?: boolean;
  }) {
    const where: Prisma.InventarioWhereInput = {};
    if (opts.ubicacionId) where.ubicacionId = opts.ubicacionId;
    if (opts.soloConStock) where.stock = { gt: 0 };
    if (opts.categoriaId) where.producto = { categoriaId: opts.categoriaId };

    return prisma.inventario.findMany({
      where,
      orderBy: [{ ubicacion: { nombre: "asc" } }, { producto: { nombre: "asc" } }],
      select: {
        stock: true,
        productoId: true,
        ubicacionId: true,
        ubicacion: { select: { nombre: true } },
        producto: {
          select: {
            sku: true,
            nombre: true,
            unidadMedida: true,
            costoPromedio: true,
            ultimoCosto: true,
            categoria: { select: { nombre: true } },
            precios: {
              where: { tipo: "PUBLICO" },
              select: { precio: true },
              take: 1,
            },
          },
        },
      },
    });
  },

  // ===== Lotes por caducar =====
  async lotesPorCaducar(opts: { dias: number }) {
    const limite = new Date();
    limite.setDate(limite.getDate() + opts.dias);
    return prisma.productoLote.findMany({
      where: {
        caducidad: { lte: limite },
        cantidad: { gt: 0 },
      },
      orderBy: { caducidad: "asc" },
      select: {
        id: true,
        productoId: true,
        lote: true,
        caducidad: true,
        cantidad: true,
        costoUnitario: true,
        producto: {
          select: { sku: true, nombre: true, unidadMedida: true },
        },
      },
    });
  },

  // ===== CxC: ventas con saldo abierto =====
  async ventasConSaldoCredito() {
    return prisma.venta.findMany({
      where: {
        saldoCredito: { gt: 0 },
        estado: { not: "CANCELADA" },
      },
      orderBy: { fechaVenta: "asc" },
      select: {
        id: true,
        fechaVenta: true,
        saldoCredito: true,
        clienteId: true,
        cliente: {
          select: { codigo: true, nombre: true },
        },
      },
    });
  },

  // ===== CxP: facturas proveedor con saldo abierto =====
  async facturasProveedorConSaldo() {
    return prisma.facturaProveedor.findMany({
      where: {
        saldo: { gt: 0 },
        estado: { not: "CANCELADA" },
      },
      orderBy: { fechaEmision: "asc" },
      select: {
        id: true,
        fechaEmision: true,
        saldo: true,
        proveedorId: true,
        proveedor: {
          select: { codigo: true, nombre: true },
        },
      },
    });
  },

  // ===== Productos sin movimiento =====
  // Devuelve para cada productoId la fecha de la última venta (CONFIRMADA)
  async ultimasVentasPorProducto(opts: { categoriaId?: string }) {
    // groupBy en ventaLinea con join a venta.fechaVenta y venta.estado != CANCELADA
    // Prisma no soporta groupBy con join directo; usamos query raw.
    const cat = opts.categoriaId
      ? `AND p."categoriaId" = '${opts.categoriaId.replace(/'/g, "''")}'`
      : "";
    type Row = { productoId: string; ultimaVenta: Date | null };
    const rows = await prisma.$queryRawUnsafe<Row[]>(`
      SELECT
        p."id" AS "productoId",
        MAX(v."fechaVenta") AS "ultimaVenta"
      FROM "Producto" p
      LEFT JOIN "VentaLinea" vl ON vl."productoId" = p."id"
      LEFT JOIN "Venta" v ON v."id" = vl."ventaId" AND v."estado" != 'CANCELADA'
      WHERE p."activo" = true
        ${cat}
      GROUP BY p."id"
    `);
    return rows;
  },

  async productosPorIds(productoIds: string[]) {
    if (productoIds.length === 0) return [];
    return prisma.producto.findMany({
      where: { id: { in: productoIds } },
      select: {
        id: true,
        sku: true,
        nombre: true,
        unidadMedida: true,
        ultimoCosto: true,
        costoPromedio: true,
        categoria: { select: { nombre: true } },
      },
    });
  },

  async stockTotalPorProducto(productoIds: string[]) {
    if (productoIds.length === 0) return new Map<string, number>();
    const rows = await prisma.inventario.groupBy({
      by: ["productoId"],
      where: { productoId: { in: productoIds } },
      _sum: { stock: true },
    });
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.productoId, toNum(r._sum.stock));
    return m;
  },

  // ===== Corte de caja: cajas (sesiones) abiertas dentro del rango =====
  async cajasEnRango(w: { desde: Date; hasta: Date; ubicacionId?: string }) {
    return prisma.caja.findMany({
      where: {
        abiertaEn: { gte: w.desde, lte: w.hasta },
        ...(w.ubicacionId ? { ubicacionId: w.ubicacionId } : {}),
      },
      orderBy: { abiertaEn: "desc" },
      select: {
        id: true,
        folio: true,
        estado: true,
        fondoInicial: true,
        totalVendido: true,
        montoEsperadoEfectivo: true,
        montoContadoEfectivo: true,
        diferenciaEfectivo: true,
        abiertaEn: true,
        cerradaEn: true,
        ubicacion: { select: { nombre: true } },
        abiertaPor: { select: { nombre: true } },
        cerradaPor: { select: { nombre: true } },
        _count: { select: { ventas: { where: { estado: "COMPLETADA" } } } },
      },
    });
  },

  helpers: { toNum },
};
