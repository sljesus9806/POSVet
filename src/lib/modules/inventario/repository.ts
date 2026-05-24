import { prisma } from "../shared/db";

export const inventarioRepository = {
  listarStock(opts: { ubicacionId?: string; q?: string } = {}) {
    return prisma.inventario.findMany({
      where: {
        ubicacionId: opts.ubicacionId,
        producto: opts.q?.trim()
          ? {
              OR: [
                { sku: { contains: opts.q.trim(), mode: "insensitive" } },
                { nombre: { contains: opts.q.trim(), mode: "insensitive" } },
              ],
            }
          : undefined,
      },
      include: {
        producto: { select: { id: true, sku: true, nombre: true, unidadMedida: true } },
        ubicacion: { select: { id: true, nombre: true } },
      },
      orderBy: [{ producto: { nombre: "asc" } }, { ubicacion: { nombre: "asc" } }],
      take: 500,
    });
  },

  listarStockPorProducto(productoId: string) {
    return prisma.inventario.findMany({
      where: { productoId },
      include: {
        ubicacion: { select: { id: true, nombre: true } },
      },
    });
  },

  listarBajoStock() {
    // Postgres: filtrar stock < stockMinimo y stockMinimo > 0
    return prisma.$queryRaw<
      Array<{
        productoId: string;
        sku: string;
        nombre: string;
        ubicacionId: string;
        ubicacionNombre: string;
        stock: string;
        stockMinimo: string;
      }>
    >`
      SELECT
        p.id          AS "productoId",
        p.sku         AS "sku",
        p.nombre      AS "nombre",
        u.id          AS "ubicacionId",
        u.nombre      AS "ubicacionNombre",
        i.stock       AS "stock",
        i."stockMinimo" AS "stockMinimo"
      FROM "Inventario" i
      JOIN "Producto"  p ON p.id = i."productoId"
      JOIN "Ubicacion" u ON u.id = i."ubicacionId"
      WHERE p.activo = true
        AND i."stockMinimo" > 0
        AND i.stock <= i."stockMinimo"
      ORDER BY p.nombre ASC, u.nombre ASC
      LIMIT 200
    `;
  },

  listarPorCaducar(dias: number) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    return prisma.productoLote.findMany({
      where: {
        caducidad: { lte: limite },
        cantidad: { gt: 0 },
      },
      include: {
        producto: { select: { id: true, sku: true, nombre: true, activo: true } },
      },
      orderBy: { caducidad: "asc" },
      take: 200,
    });
  },

  listarMovimientos(opts: { productoId?: string; ubicacionId?: string; limit?: number } = {}) {
    return prisma.inventarioMovimiento.findMany({
      where: {
        productoId: opts.productoId,
        ubicacionId: opts.ubicacionId,
      },
      include: {
        producto: { select: { sku: true, nombre: true } },
        ubicacion: { select: { nombre: true } },
        lote: { select: { lote: true } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      take: opts.limit ?? 100,
    });
  },

  listarTransferencias(opts: { limit?: number } = {}) {
    return prisma.transferencia.findMany({
      include: {
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
        _count: { select: { lineas: true } },
      },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 50,
    });
  },

  obtenerTransferencia(id: string) {
    return prisma.transferencia.findUnique({
      where: { id },
      include: {
        origen: true,
        destino: true,
        usuario: { select: { nombre: true } },
        lineas: {
          include: { producto: { select: { sku: true, nombre: true, unidadMedida: true } } },
        },
      },
    });
  },
};
