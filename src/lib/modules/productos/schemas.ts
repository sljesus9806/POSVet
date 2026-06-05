import { z } from "zod";

const skuRegex = /^[A-Z0-9-]{2,40}$/;

export const tipoProductoSchema = z.enum([
  "MEDICAMENTO",
  "ALIMENTO",
  "ACCESORIO",
  "SERVICIO",
]);

export const tipoPrecioSchema = z.enum(["PUBLICO", "MAYOREO", "DISTRIBUIDOR"]);

export const precioInputSchema = z.object({
  tipo: tipoPrecioSchema,
  precio: z.number().nonnegative().max(9_999_999),
});

export const crearProductoSchema = z.object({
  sku: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(skuRegex, "SKU debe ser A-Z, 0-9 o guión (2-40 chars)")),
  codigoBarras: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  nombre: z.string().trim().min(2).max(200),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  marca: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
  categoriaId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
  unidadMedida: z.string().trim().min(1).max(10),
  tipo: tipoProductoSchema,
  especie: z.string().trim().max(50).optional().or(z.literal("").transform(() => undefined)),
  requiereReceta: z.boolean().default(false),
  sustanciaControlada: z.boolean().default(false),
  laboratorio: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
  viaAdministracion: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  claveSAT: z.string().trim().min(6).max(20).default("01010101"),
  ivaAplicable: z.number().min(0).max(1).default(0.16),
  ultimoCosto: z.number().nonnegative().default(0),
  precios: z.array(precioInputSchema).min(1, "Al menos un precio (PUBLICO recomendado)"),
});

export const actualizarProductoSchema = crearProductoSchema.partial().extend({
  id: z.string().cuid(),
  activo: z.boolean().optional(),
});

export const crearCategoriaSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  descripcion: z.string().trim().max(500).optional(),
});

export const actualizarCategoriaSchema = crearCategoriaSchema.partial().extend({
  id: z.string().cuid(),
  activa: z.boolean().optional(),
});

export const crearLoteSchema = z.object({
  productoId: z.string().cuid(),
  lote: z.string().trim().min(1).max(60),
  caducidad: z.coerce.date().refine((d) => d > new Date(), {
    message: "La caducidad debe ser futura",
  }),
  cantidad: z.number().nonnegative(),
  costoUnitario: z.number().nonnegative(),
});

export type CrearProductoInput = z.input<typeof crearProductoSchema>;
export type CrearProductoData = z.output<typeof crearProductoSchema>;
export type ActualizarProductoInput = z.input<typeof actualizarProductoSchema>;
export type CrearCategoriaInput = z.input<typeof crearCategoriaSchema>;
export type ActualizarCategoriaInput = z.input<typeof actualizarCategoriaSchema>;
export type CrearLoteInput = z.input<typeof crearLoteSchema>;
