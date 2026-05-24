import { prisma } from "./db";

export type AuditEntry = {
  usuarioId?: string | null;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  antes?: unknown;
  despues?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId: entry.usuarioId ?? null,
        modulo: entry.modulo,
        accion: entry.accion,
        entidad: entry.entidad,
        entidadId: entry.entidadId ?? null,
        antes: entry.antes as never,
        despues: entry.despues as never,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write entry:", err);
  }
}
