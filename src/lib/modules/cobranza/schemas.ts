import { z } from "zod";

const idSchema = z.string().min(1, "ID requerido");

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const fechaSchema = z
  .string()
  .min(1, "Fecha requerida")
  .transform((v) => new Date(v));

export const formaPagoAbonoSchema = z.enum([
  "EFECTIVO",
  "TRANSFERENCIA",
  "CHEQUE",
  "TARJETA",
  "OTRO",
]);

export const aplicacionAbonoSchema = z.object({
  ventaId: idSchema,
  monto: z.number().positive("Monto debe ser mayor a 0"),
});

export const registrarAbonoSchema = z.object({
  clienteId: idSchema,
  fecha: fechaSchema.optional(),
  formaPago: formaPagoAbonoSchema,
  monto: z.number().positive("Monto debe ser mayor a 0"),
  referencia: opt(80),
  observaciones: opt(500),
  aplicaciones: z.array(aplicacionAbonoSchema).min(1, "Debe distribuirse en al menos una venta"),
});

export const cancelarAbonoSchema = z.object({
  abonoId: idSchema,
  motivo: z.string().trim().min(3, "Mínimo 3 caracteres").max(300),
});

export type RegistrarAbonoInput = z.input<typeof registrarAbonoSchema>;
export type CancelarAbonoInput = z.input<typeof cancelarAbonoSchema>;
export type AplicacionAbonoInput = z.input<typeof aplicacionAbonoSchema>;
export type FormaPagoAbonoInput = z.input<typeof formaPagoAbonoSchema>;
