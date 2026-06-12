import { z } from "zod";

// IDs internos: vienen de selects poblados por el servidor o validados por FK de Postgres.
// No usamos .cuid() porque el seed de dev usa IDs legibles (ej. "ubicacion-tienda").
const idSchema = z.string().min(1, "ID requerido");
const idOpcionalSchema = idSchema.optional().or(z.literal("").transform(() => undefined));

export const motivoAjusteSchema = z.enum([
  "AJUSTE_MERMA",
  "AJUSTE_CADUCIDAD",
  "AJUSTE_ROBO",
  "AJUSTE_CONTEO",
]);

export const ajustarStockSchema = z
  .object({
    productoId: idSchema,
    ubicacionId: idSchema,
    loteId: idOpcionalSchema,
    delta: z.number().refine((v) => v !== 0, "El delta no puede ser cero"),
    motivo: motivoAjusteSchema,
    observaciones: z.string().trim().max(500).optional(),
  })
  .strict();

export const definirStockMinimoSchema = z.object({
  productoId: idSchema,
  ubicacionId: idSchema,
  stockMinimo: z.number().nonnegative(),
  stockMaximo: z.number().nonnegative().nullable().optional(),
});

export const transferenciaLineaSchema = z.object({
  productoId: idSchema,
  cantidad: z.number().positive(),
});

export const crearTransferenciaSchema = z
  .object({
    origenId: idSchema,
    destinoId: idSchema,
    observaciones: z.string().trim().max(500).optional(),
    lineas: z.array(transferenciaLineaSchema).min(1, "Debe incluir al menos una línea"),
  })
  .refine((data) => data.origenId !== data.destinoId, {
    message: "El origen y destino deben ser distintos",
    path: ["destinoId"],
  });

export const registrarEntradaSchema = z.object({
  productoId: idSchema,
  ubicacionId: idSchema,
  cantidad: z.number().positive(),
  costoUnitario: z.number().nonnegative(),
  loteId: idOpcionalSchema,
  observaciones: z.string().trim().max(500).optional(),
});

// Abrir empaque(s): convierte N empaques (costal) en N×contenido del producto granel.
export const abrirEmpaqueSchema = z.object({
  productoEmpaqueId: idSchema,
  productoGranelId: idSchema,
  ubicacionId: idSchema,
  cantidadEmpaques: z.number().positive("Indica cuántos empaques abrir"),
  contenido: z.number().positive("El contenido por empaque debe ser mayor a 0"),
  costoUnitarioEmpaque: z.number().nonnegative().default(0),
});

export type AbrirEmpaqueInput = z.input<typeof abrirEmpaqueSchema>;
export type AjustarStockInput = z.input<typeof ajustarStockSchema>;
export type AjustarStockData = z.output<typeof ajustarStockSchema>;
export type DefinirStockMinimoInput = z.input<typeof definirStockMinimoSchema>;
export type CrearTransferenciaInput = z.input<typeof crearTransferenciaSchema>;
export type CrearTransferenciaData = z.output<typeof crearTransferenciaSchema>;
export type RegistrarEntradaInput = z.input<typeof registrarEntradaSchema>;
