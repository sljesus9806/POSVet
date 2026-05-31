import { z } from "zod";

// Filtros opcionales: cadena vacía o ausente → undefined (sin filtro).
const texto = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const fecha = z
  .string()
  .optional()
  .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : undefined));

export const filtroAuditoriaSchema = z.object({
  modulo: texto,
  accion: texto,
  entidad: texto,
  usuarioId: texto,
  desde: fecha, // yyyy-mm-dd
  hasta: fecha, // yyyy-mm-dd
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).catch(50).default(50),
});

export type FiltroAuditoriaInput = z.input<typeof filtroAuditoriaSchema>;
export type FiltroAuditoriaData = z.output<typeof filtroAuditoriaSchema>;
