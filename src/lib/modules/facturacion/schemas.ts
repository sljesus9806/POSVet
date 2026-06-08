import { z } from "zod";
import {
  FORMAS_PAGO_CLAVES,
  METODOS_PAGO_CLAVES,
  MOTIVOS_CANCELACION_CLAVES,
} from "./catalogos";

// RFC mexicano: 12 (persona moral) o 13 (persona física) caracteres.
const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const cpRegex = /^\d{5}$/;

export const emitirFacturaSchema = z.object({
  ventaId: z.string().min(1, "Falta la venta"),
  receptorRfc: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(rfcRegex, "RFC inválido")),
  receptorNombre: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(254)
    // El SAT exige la razón social SIN régimen societario y en mayúsculas.
    .transform((s) => s.toUpperCase()),
  receptorRegimen: z.string().trim().min(3, "Selecciona el régimen fiscal"),
  receptorUsoCfdi: z.string().trim().min(2, "Selecciona el uso de CFDI"),
  receptorCp: z
    .string()
    .trim()
    .regex(cpRegex, "Código postal de 5 dígitos"),
  formaPago: z.enum(FORMAS_PAGO_CLAVES as [string, ...string[]]),
  metodoPago: z.enum(METODOS_PAGO_CLAVES as [string, ...string[]]),
});

export type EmitirFacturaInput = z.infer<typeof emitirFacturaSchema>;

export const cancelarFacturaSchema = z
  .object({
    facturaId: z.string().min(1),
    motivo: z.enum(MOTIVOS_CANCELACION_CLAVES as [string, ...string[]]),
    // Requerido solo cuando el motivo es "01" (sustitución).
    folioSustitucion: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined)),
  })
  .refine((d) => d.motivo !== "01" || !!d.folioSustitucion, {
    message: "El motivo 01 requiere el UUID de la factura que sustituye",
    path: ["folioSustitucion"],
  });

export type CancelarFacturaInput = z.infer<typeof cancelarFacturaSchema>;
