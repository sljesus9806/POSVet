import { z } from "zod";

const idSchema = z.string().min(1, "ID requerido");

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

// Una línea al crear/agregar a la OC
export const lineaOcSchema = z.object({
  productoId: idSchema,
  cantidad: z.number().positive("Cantidad debe ser mayor a 0"),
  costoUnitario: z.number().nonnegative(),
  ivaTasa: z.number().min(0).max(1).default(0),
  codigoProveedor: opt(80),
});

export const crearOrdenCompraSchema = z.object({
  proveedorId: idSchema.optional().or(z.literal("").transform(() => undefined)),
  ubicacionDestinoId: idSchema,
  preciosIncluyenIva: z.boolean().default(true),
  fechaEsperada: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => (v ? new Date(v) : undefined)),
  observaciones: opt(500),
  lineas: z.array(lineaOcSchema).min(1, "Debe incluir al menos una línea"),
});

export const enviarOrdenCompraSchema = z.object({
  ordenCompraId: idSchema,
});

export const cancelarOrdenCompraSchema = z.object({
  ordenCompraId: idSchema,
  motivo: z.string().trim().min(3, "Mínimo 3 caracteres").max(300),
});

// Una línea al registrar una recepción
export const lineaRecepcionSchema = z.object({
  ocLineaId: idSchema,
  cantidad: z.number().positive("Cantidad debe ser mayor a 0"),
  costoUnitario: z.number().nonnegative(),
  lote: opt(80),
  caducidad: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const registrarRecepcionSchema = z.object({
  ordenCompraId: idSchema,
  observaciones: opt(500),
  lineas: z.array(lineaRecepcionSchema).min(1, "Debe incluir al menos una línea"),
});

export type LineaOcInput = z.input<typeof lineaOcSchema>;
export type CrearOrdenCompraInput = z.input<typeof crearOrdenCompraSchema>;
export type EnviarOrdenCompraInput = z.input<typeof enviarOrdenCompraSchema>;
export type CancelarOrdenCompraInput = z.input<typeof cancelarOrdenCompraSchema>;
export type LineaRecepcionInput = z.input<typeof lineaRecepcionSchema>;
export type RegistrarRecepcionInput = z.input<typeof registrarRecepcionSchema>;
