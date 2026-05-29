import { z } from "zod";

const rolCodigoSchema = z.enum([
  "ADMIN",
  "SUPERVISOR",
  "CAJERO",
  "ALMACENISTA",
  "READONLY",
]);

const idSchema = z.string().min(1, "ID requerido");

const passwordSchema = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(72, "Máximo 72 caracteres"); // bcrypt limita a 72 bytes

export const loginSchema = z.object({
  email: z.string().email("Correo inválido").toLowerCase().trim(),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const crearUsuarioSchema = z.object({
  empresaId: idSchema,
  email: z.string().email("Correo inválido").toLowerCase().trim(),
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  password: passwordSchema,
  roles: z.array(rolCodigoSchema).min(1, "Asigna al menos un rol"),
});

export const actualizarUsuarioSchema = z.object({
  id: idSchema,
  email: z.string().email("Correo inválido").toLowerCase().trim(),
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  activo: z.boolean(),
  roles: z.array(rolCodigoSchema).min(1, "Asigna al menos un rol"),
});

export const cambiarPasswordSchema = z.object({
  id: idSchema,
  nuevaPassword: passwordSchema,
});

export const desbloquearUsuarioSchema = z.object({
  id: idSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;
export type DesbloquearUsuarioInput = z.infer<typeof desbloquearUsuarioSchema>;
