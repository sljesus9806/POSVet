import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

const includeRoles = {
  roles: {
    include: {
      rol: {
        include: {
          permisos: { include: { permiso: true } },
        },
      },
    },
  },
} as const;

const includeRolesSimple = {
  roles: { include: { rol: { select: { codigo: true } } } },
} as const;

export const usuariosRepository = {
  buscarPorEmail(email: string) {
    return prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: includeRoles,
    });
  },

  buscarPorId(id: string) {
    return prisma.usuario.findUnique({
      where: { id },
      include: includeRoles,
    });
  },

  buscarDetalle(id: string) {
    return prisma.usuario.findUnique({
      where: { id },
      include: includeRolesSimple,
    });
  },

  listar(opts: { empresaId: string; q?: string; soloActivos?: boolean; rolCodigo?: string }) {
    const where: Prisma.UsuarioWhereInput = { empresaId: opts.empresaId };
    if (opts.soloActivos !== false) where.activo = true;
    if (opts.q && opts.q.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    if (opts.rolCodigo) {
      where.roles = { some: { rol: { codigo: opts.rolCodigo } } };
    }
    return prisma.usuario.findMany({
      where,
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      take: 200,
      include: includeRolesSimple,
    });
  },

  emailEnUso(email: string, excluirId?: string) {
    return prisma.usuario.findFirst({
      where: { email: email.toLowerCase().trim(), id: excluirId ? { not: excluirId } : undefined },
      select: { id: true },
    });
  },

  crear(data: Prisma.UsuarioCreateInput, rolIds: string[]) {
    return prisma.usuario.create({
      data: {
        ...data,
        roles: { create: rolIds.map((rolId) => ({ rolId })) },
      },
      include: includeRolesSimple,
    });
  },

  actualizar(id: string, data: Prisma.UsuarioUpdateInput) {
    return prisma.usuario.update({
      where: { id },
      data,
      include: includeRolesSimple,
    });
  },

  reasignarRoles(usuarioId: string, rolIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.usuarioRol.deleteMany({ where: { usuarioId } });
      if (rolIds.length > 0) {
        await tx.usuarioRol.createMany({
          data: rolIds.map((rolId) => ({ usuarioId, rolId })),
        });
      }
    });
  },

  cambiarPassword(id: string, passwordHash: string) {
    return prisma.usuario.update({
      where: { id },
      data: { passwordHash, intentosFallidos: 0, bloqueadoHasta: null },
    });
  },

  desbloquear(id: string) {
    return prisma.usuario.update({
      where: { id },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    });
  },

  listarRolesPorCodigos(codigos: string[]) {
    return prisma.rol.findMany({
      where: { codigo: { in: codigos } },
      select: { id: true, codigo: true, nombre: true, descripcion: true },
    });
  },

  listarRolesDisponibles() {
    return prisma.rol.findMany({
      where: { sistema: true },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, nombre: true, descripcion: true },
    });
  },

  registrarLogin(opts: {
    usuarioId: string | null;
    email: string;
    exitoso: boolean;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    return prisma.intentoLogin.create({
      data: {
        usuarioId: opts.usuarioId,
        email: opts.email,
        exitoso: opts.exitoso,
        ip: opts.ip,
        userAgent: opts.userAgent,
      },
    });
  },

  incrementarIntentosFallidos(usuarioId: string, bloquearHasta?: Date) {
    return prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        intentosFallidos: { increment: 1 },
        bloqueadoHasta: bloquearHasta ?? undefined,
      },
    });
  },

  resetIntentosYRegistrarLogin(usuarioId: string) {
    return prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimoLoginAt: new Date(),
      },
    });
  },
};
