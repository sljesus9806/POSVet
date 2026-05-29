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

export const actualizarEmpresaSchema = z.object({
  id: idSchema,
  rfc: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(rfcRegex, "RFC inválido")),
  razonSocial: z.string().trim().min(2, "Mínimo 2 caracteres").max(200),
  regimenFiscal: z
    .string()
    .trim()
    .regex(/^\d{3}$/, "Debe ser 3 dígitos (clave SAT)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  codigoPostal: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Debe ser 5 dígitos")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  direccion: opt(300),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telefono: opt(20),
  logoUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const tipoUbicacionSchema = z.enum(["TIENDA", "BODEGA", "SUCURSAL"]);

export const crearUbicacionSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  tipo: tipoUbicacionSchema,
  direccion: opt(300),
});

export const actualizarUbicacionSchema = z.object({
  id: idSchema,
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  tipo: tipoUbicacionSchema,
  direccion: opt(300),
  activa: z.boolean(),
});

export type ActualizarEmpresaInput = z.input<typeof actualizarEmpresaSchema>;
export type CrearUbicacionInput = z.input<typeof crearUbicacionSchema>;
export type ActualizarUbicacionInput = z.input<typeof actualizarUbicacionSchema>;
