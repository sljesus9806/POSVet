import { z } from "zod";

// RFC mexicano: 12 (persona moral) o 13 (persona física) caracteres alfanuméricos.
const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export const tipoClienteSchema = z.enum(["PUBLICO", "MAYOREO", "DISTRIBUIDOR"]);
export const tipoPrecioSchema = z.enum(["PUBLICO", "MAYOREO", "DISTRIBUIDOR"]);

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const crearClienteSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(150),
  rfc: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(rfcRegex, "RFC inválido"))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  regimenFiscal: opt(10),
  usoCFDI: opt(10),
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
  notas: opt(500),
  tipoCliente: tipoClienteSchema.default("PUBLICO"),
  tipoPrecio: tipoPrecioSchema.optional().or(z.literal("").transform(() => undefined)),
  lineaCredito: z.number().nonnegative().default(0),
  diasCredito: z.number().int().nonnegative().max(365).default(0),
});

export const actualizarClienteSchema = crearClienteSchema.partial().extend({
  id: z.string().cuid(),
  activo: z.boolean().optional(),
});

export type CrearClienteInput = z.input<typeof crearClienteSchema>;
export type CrearClienteData = z.output<typeof crearClienteSchema>;
export type ActualizarClienteInput = z.input<typeof actualizarClienteSchema>;
