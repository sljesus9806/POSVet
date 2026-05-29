import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

export const configuracionRepository = {
  obtenerEmpresa(id: string) {
    return prisma.empresa.findUnique({ where: { id } });
  },

  primeraEmpresa() {
    return prisma.empresa.findFirst({ orderBy: { createdAt: "asc" } });
  },

  actualizarEmpresa(id: string, data: Prisma.EmpresaUpdateInput) {
    return prisma.empresa.update({ where: { id }, data });
  },

  listarUbicaciones(empresaId: string, opts: { soloActivas?: boolean } = {}) {
    const where: Prisma.UbicacionWhereInput = { empresaId };
    if (opts.soloActivas !== false) where.activa = true;
    return prisma.ubicacion.findMany({
      where,
      orderBy: [{ activa: "desc" }, { tipo: "asc" }, { nombre: "asc" }],
      include: { _count: { select: { inventarios: true } } },
    });
  },

  obtenerUbicacion(id: string) {
    return prisma.ubicacion.findUnique({ where: { id } });
  },

  crearUbicacion(data: Prisma.UbicacionCreateInput) {
    return prisma.ubicacion.create({ data });
  },

  actualizarUbicacion(id: string, data: Prisma.UbicacionUpdateInput) {
    return prisma.ubicacion.update({ where: { id }, data });
  },

  tieneStockActivo(ubicacionId: string) {
    return prisma.inventario.findFirst({
      where: { ubicacionId, stock: { gt: 0 } },
      select: { id: true },
    });
  },
};
