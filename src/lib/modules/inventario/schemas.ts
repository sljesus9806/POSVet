import { z } from "zod";

export const motivoAjusteSchema = z.enum([
  "AJUSTE_MERMA",
  "AJUSTE_CADUCIDAD",
  "AJUSTE_ROBO",
  "AJUSTE_CONTEO",
]);

export const ajustarStockSchema = z
  .object({
    productoId: z.string().cuid(),
    ubicacionId: z.string().cuid(),
    loteId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
    delta: z.number().refine((v) => v !== 0, "El delta no puede ser cero"),
    motivo: motivoAjusteSchema,
    observaciones: z.string().trim().max(500).optional(),
  })
  .strict();

export const definirStockMinimoSchema = z.object({
  productoId: z.string().cuid(),
  ubicacionId: z.string().cuid(),
  stockMinimo: z.number().nonnegative(),
  stockMaximo: z.number().nonnegative().nullable().optional(),
});

export const transferenciaLineaSchema = z.object({
  productoId: z.string().cuid(),
  cantidad: z.number().positive(),
});

export const crearTransferenciaSchema = z
  .object({
    origenId: z.string().cuid(),
    destinoId: z.string().cuid(),
    observaciones: z.string().trim().max(500).optional(),
    lineas: z.array(transferenciaLineaSchema).min(1, "Debe incluir al menos una línea"),
  })
  .refine((data) => data.origenId !== data.destinoId, {
    message: "El origen y destino deben ser distintos",
    path: ["destinoId"],
  });

export const registrarEntradaSchema = z.object({
  productoId: z.string().cuid(),
  ubicacionId: z.string().cuid(),
  cantidad: z.number().positive(),
  costoUnitario: z.number().nonnegative(),
  loteId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
  observaciones: z.string().trim().max(500).optional(),
});

export type AjustarStockInput = z.input<typeof ajustarStockSchema>;
export type AjustarStockData = z.output<typeof ajustarStockSchema>;
export type DefinirStockMinimoInput = z.input<typeof definirStockMinimoSchema>;
export type CrearTransferenciaInput = z.input<typeof crearTransferenciaSchema>;
export type CrearTransferenciaData = z.output<typeof crearTransferenciaSchema>;
export type RegistrarEntradaInput = z.input<typeof registrarEntradaSchema>;
