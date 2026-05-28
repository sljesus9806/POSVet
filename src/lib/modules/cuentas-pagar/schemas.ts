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

export const registrarFacturaSchema = z
  .object({
    proveedorId: idSchema,
    folioProveedor: z.string().trim().min(1, "Folio del proveedor requerido").max(80),
    ordenCompraId: z
      .string()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    fechaEmision: fechaSchema,
    fechaVencimiento: fechaSchema,
    subtotal: z.number().nonnegative().default(0),
    iva: z.number().nonnegative().default(0),
    total: z.number().positive("Total debe ser mayor a 0"),
    observaciones: opt(500),
  })
  .refine((d) => d.fechaVencimiento >= d.fechaEmision, {
    message: "La fecha de vencimiento no puede ser anterior a la emisión",
    path: ["fechaVencimiento"],
  });

export const cancelarFacturaSchema = z.object({
  facturaId: idSchema,
  motivo: z.string().trim().min(3, "Mínimo 3 caracteres").max(300),
});

export const aplicacionPagoSchema = z.object({
  facturaId: idSchema,
  monto: z.number().positive("Monto debe ser mayor a 0"),
});

export const formaPagoSchema = z.enum([
  "EFECTIVO",
  "TRANSFERENCIA",
  "CHEQUE",
  "TARJETA",
  "OTRO",
]);

export const registrarPagoSchema = z.object({
  proveedorId: idSchema,
  fecha: fechaSchema.optional(),
  formaPago: formaPagoSchema,
  monto: z.number().positive("Monto debe ser mayor a 0"),
  referencia: opt(80),
  observaciones: opt(500),
  aplicaciones: z.array(aplicacionPagoSchema).min(1, "Debe distribuirse en al menos una factura"),
});

export const cancelarPagoSchema = z.object({
  pagoId: idSchema,
  motivo: z.string().trim().min(3, "Mínimo 3 caracteres").max(300),
});

export type RegistrarFacturaInput = z.input<typeof registrarFacturaSchema>;
export type CancelarFacturaInput = z.input<typeof cancelarFacturaSchema>;
export type RegistrarPagoInput = z.input<typeof registrarPagoSchema>;
export type CancelarPagoInput = z.input<typeof cancelarPagoSchema>;
export type AplicacionPagoInput = z.input<typeof aplicacionPagoSchema>;
export type FormaPagoInput = z.input<typeof formaPagoSchema>;
