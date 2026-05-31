// API pública del módulo Auditoría (solo lectura de la bitácora).
// La ESCRITURA de auditoría vive en shared/audit.ts; este módulo solo consulta.
export { auditoriaService } from "./service";

export { filtroAuditoriaSchema } from "./schemas";
export type { FiltroAuditoriaInput, FiltroAuditoriaData } from "./schemas";

export type {
  AuditoriaListado,
  AuditoriaDetalle,
  AuditoriaPagina,
  OpcionesFiltroAuditoria,
} from "./types";
