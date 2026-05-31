export type AuditoriaListado = {
  id: string;
  fecha: Date;
  usuarioId: string | null;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  ip: string | null;
};

export type AuditoriaDetalle = AuditoriaListado & {
  antes: unknown;
  despues: unknown;
  userAgent: string | null;
};

export type AuditoriaPagina = {
  filas: AuditoriaListado[];
  total: number;
  page: number;
  pageSize: number;
  totalPaginas: number;
};

// Opciones para poblar los selects de filtro (valores distintos ya presentes en el log).
export type OpcionesFiltroAuditoria = {
  modulos: string[];
  acciones: string[];
  entidades: string[];
  usuarios: Array<{ id: string; nombre: string }>;
};
