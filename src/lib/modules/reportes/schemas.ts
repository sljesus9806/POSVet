import { z } from "zod";

// Acepta Date o string ISO (yyyy-mm-dd o ISO completo). Normaliza a Date.
const fechaSchema = z.preprocess(
  (v) => (v instanceof Date ? v : typeof v === "string" && v.length > 0 ? new Date(v) : undefined),
  z.date({ message: "Fecha inválida" }),
);

const idOpcionalSchema = z
  .string()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const filtroReporteSchema = z
  .object({
    desde: fechaSchema,
    hasta: fechaSchema,
    ubicacionId: idOpcionalSchema,
  })
  .refine((d) => d.desde.getTime() <= d.hasta.getTime(), {
    message: "El rango es inválido (desde > hasta)",
    path: ["hasta"],
  });

export type FiltroReporteInput = z.input<typeof filtroReporteSchema>;
export type FiltroReporteData = z.output<typeof filtroReporteSchema>;
