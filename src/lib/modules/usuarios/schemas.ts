import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo inválido").toLowerCase().trim(),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const crearUsuarioSchema = z.object({
  empresaId: z.string().min(1),
  email: z.string().email().toLowerCase().trim(),
  nombre: z.string().min(2).max(120),
  password: z.string().min(10, "Mínimo 10 caracteres"),
  roles: z
    .array(z.enum(["ADMIN", "SUPERVISOR", "CAJERO", "ALMACENISTA", "READONLY"]))
    .min(1, "Asigna al menos un rol"),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
