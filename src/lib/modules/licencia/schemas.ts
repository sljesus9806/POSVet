import { z } from "zod";

// Payload de una licencia firmada. `v` permite versionar el formato a futuro.
export const licenciaPayloadSchema = z.object({
  v: z.literal(1),
  licenseId: z.string().min(1),
  cliente: z.string().min(1), // negocio licenciado, visible en la UI
  modo: z.enum(["online", "offline"]),
  plan: z.string().min(1), // ej. "mensual", "anual"
  emitida: z.string().datetime(),
  expira: z.string().datetime(),
  gracia: z.number().int().min(0).max(90), // días de tolerancia tras expirar
  features: z.array(z.string()).default([]),
  fingerprint: z.string().optional(), // amarre a hardware (apagado por ahora)
});

export type LicenciaPayload = z.infer<typeof licenciaPayloadSchema>;
