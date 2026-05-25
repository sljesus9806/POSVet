import { z } from "zod";

// RFC mexicano: 12 (persona moral) o 13 (persona física) caracteres.
const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const idSchema = z.string().min(1, "ID requerido");

export const crearProveedorSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(150),
  rfc: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(rfcRegex, "RFC inválido"))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  regimenFiscal: opt(10),
  codigoPostal: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Debe ser 5 dígitos")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telefono: opt(20),
  contacto: opt(150),
  direccion: opt(300),
  notas: opt(500),
  diasCredito: z.number().int().nonnegative().max(365).default(0),
});

export const actualizarProveedorSchema = crearProveedorSchema.partial().extend({
  id: idSchema,
  activo: z.boolean().optional(),
});

// Catálogo: alta/edición/baja de líneas (productos que vende el proveedor).
export const agregarLineaCatalogoSchema = z.object({
  proveedorId: idSchema,
  productoId: idSchema,
  codigoProveedor: opt(80),
  costoUnitario: z.number().nonnegative().default(0),
  esPreferido: z.boolean().default(false),
  notas: opt(300),
});

export const actualizarLineaCatalogoSchema = z.object({
  lineaId: idSchema,
  codigoProveedor: opt(80),
  costoUnitario: z.number().nonnegative().optional(),
  esPreferido: z.boolean().optional(),
  notas: opt(300),
});

export const eliminarLineaCatalogoSchema = z.object({
  lineaId: idSchema,
});

export type CrearProveedorInput = z.input<typeof crearProveedorSchema>;
export type ActualizarProveedorInput = z.input<typeof actualizarProveedorSchema>;
export type AgregarLineaCatalogoInput = z.input<typeof agregarLineaCatalogoSchema>;
export type ActualizarLineaCatalogoInput = z.input<typeof actualizarLineaCatalogoSchema>;
export type EliminarLineaCatalogoInput = z.input<typeof eliminarLineaCatalogoSchema>;
