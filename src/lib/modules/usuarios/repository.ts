import { prisma } from "../shared/db";

export const usuariosRepository = {
  buscarPorEmail(email: string) {
    return prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                permisos: { include: { permiso: true } },
              },
            },
          },
        },
      },
    });
  },

  buscarPorId(id: string) {
    return prisma.usuario.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                permisos: { include: { permiso: true } },
              },
            },
          },
        },
      },
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
