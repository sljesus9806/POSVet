import { Prisma } from "@prisma/client";
import { auditoriaRepository } from "./repository";
import { filtroAuditoriaSchema, type FiltroAuditoriaInput } from "./schemas";
import type {
  AuditoriaDetalle,
  AuditoriaListado,
  AuditoriaPagina,
  OpcionesFiltroAuditoria,
} from "./types";

type FilaRaw = NonNullable<Awaited<ReturnType<typeof auditoriaRepository.obtener>>>;

function aListado(r: FilaRaw): AuditoriaListado {
  return {
    id: r.id,
    fecha: r.fecha,
    usuarioId: r.usuarioId,
    usuarioNombre: r.usuario?.nombre ?? null,
    usuarioEmail: r.usuario?.email ?? null,
    modulo: r.modulo,
    accion: r.accion,
    entidad: r.entidad,
    entidadId: r.entidadId,
    ip: r.ip,
  };
}

export const auditoriaService = {
  async listar(input: FiltroAuditoriaInput): Promise<AuditoriaPagina> {
    const f = filtroAuditoriaSchema.parse(input);

    const where: Prisma.AuditLogWhereInput = {};
    if (f.modulo) where.modulo = f.modulo;
    if (f.accion) where.accion = f.accion;
    if (f.entidad) where.entidad = f.entidad;
    if (f.usuarioId) where.usuarioId = f.usuarioId;
    if (f.desde || f.hasta) {
      where.fecha = {};
      if (f.desde) where.fecha.gte = new Date(`${f.desde}T00:00:00`);
      if (f.hasta) where.fecha.lte = new Date(`${f.hasta}T23:59:59.999`);
    }

    const { filas, total } = await auditoriaRepository.listar({
      where,
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    });

    return {
      filas: filas.map(aListado),
      total,
      page: f.page,
      pageSize: f.pageSize,
      totalPaginas: Math.max(1, Math.ceil(total / f.pageSize)),
    };
  },

  async obtener(id: string): Promise<AuditoriaDetalle | null> {
    const r = await auditoriaRepository.obtener(id);
    if (!r) return null;
    return { ...aListado(r), antes: r.antes, despues: r.despues, userAgent: r.userAgent };
  },

  async opcionesFiltro(): Promise<OpcionesFiltroAuditoria> {
    return auditoriaRepository.opciones();
  },
};
