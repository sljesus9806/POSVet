import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

const incluirUsuario = {
  usuario: { select: { id: true, nombre: true, email: true } },
} satisfies Prisma.AuditLogInclude;

export const auditoriaRepository = {
  async listar(opts: { where: Prisma.AuditLogWhereInput; skip: number; take: number }) {
    const [filas, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: opts.where,
        include: incluirUsuario,
        orderBy: { fecha: "desc" },
        skip: opts.skip,
        take: opts.take,
      }),
      prisma.auditLog.count({ where: opts.where }),
    ]);
    return { filas, total };
  },

  obtener(id: string) {
    return prisma.auditLog.findUnique({ where: { id }, include: incluirUsuario });
  },

  // Valores distintos ya presentes en el log + usuarios con al menos una entrada,
  // para poblar los selects de filtro sin listar catálogos completos.
  async opciones() {
    const [modulos, acciones, entidades, usuarios] = await Promise.all([
      prisma.auditLog.findMany({ distinct: ["modulo"], select: { modulo: true }, orderBy: { modulo: "asc" } }),
      prisma.auditLog.findMany({ distinct: ["accion"], select: { accion: true }, orderBy: { accion: "asc" } }),
      prisma.auditLog.findMany({ distinct: ["entidad"], select: { entidad: true }, orderBy: { entidad: "asc" } }),
      prisma.usuario.findMany({
        where: { auditLogs: { some: {} } },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
    ]);
    return {
      modulos: modulos.map((m) => m.modulo),
      acciones: acciones.map((a) => a.accion),
      entidades: entidades.map((e) => e.entidad),
      usuarios,
    };
  },
};
