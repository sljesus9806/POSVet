import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

export const proveedoresRepository = {
  listar(opts: { q?: string; soloActivos?: boolean } = {}) {
    const where: Prisma.ProveedorWhereInput = {};
    if (opts.soloActivos !== false) where.activo = true;
    if (opts.q && opts.q.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { codigo: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
        { rfc: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { telefono: { contains: q, mode: "insensitive" } },
        { contacto: { contains: q, mode: "insensitive" } },
      ];
    }
    return prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" },
      take: 200,
      include: { _count: { select: { productos: true } } },
    });
  },

  buscarPorId(id: string) {
    return prisma.proveedor.findUnique({ where: { id } });
  },

  actualizar(id: string, data: Prisma.ProveedorUpdateInput) {
    return prisma.proveedor.update({ where: { id }, data });
  },

  // Folio PRV-NNNNN. Generado por count() + reintento en colisión.
  proximoCodigo(tx: Prisma.TransactionClient) {
    return tx.proveedor.count().then((n) => `PRV-${String(n + 1).padStart(5, "0")}`);
  },

  // ---- Catálogo ----
  listarCatalogo(proveedorId: string) {
    return prisma.proveedorProducto.findMany({
      where: { proveedorId },
      orderBy: [{ esPreferido: "desc" }, { producto: { nombre: "asc" } }],
      include: {
        producto: { select: { sku: true, nombre: true, unidadMedida: true } },
      },
    });
  },

  buscarLineaCatalogo(lineaId: string) {
    return prisma.proveedorProducto.findUnique({
      where: { id: lineaId },
      include: { producto: { select: { sku: true, nombre: true } } },
    });
  },

  crearLineaCatalogo(data: Prisma.ProveedorProductoCreateInput) {
    return prisma.proveedorProducto.create({
      data,
      include: { producto: { select: { sku: true, nombre: true, unidadMedida: true } } },
    });
  },

  actualizarLineaCatalogo(id: string, data: Prisma.ProveedorProductoUpdateInput) {
    return prisma.proveedorProducto.update({
      where: { id },
      data,
      include: { producto: { select: { sku: true, nombre: true, unidadMedida: true } } },
    });
  },

  eliminarLineaCatalogo(id: string) {
    return prisma.proveedorProducto.delete({ where: { id } });
  },
};
