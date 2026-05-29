"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AutoDesactivacionError,
  EmailEnUsoError,
  RolNoEncontradoError,
  UsuarioNoEncontradoError,
  actualizarUsuarioSchema,
  cambiarPasswordSchema,
  crearUsuarioSchema,
  desbloquearUsuarioSchema,
  usuariosService,
  type RolCodigo,
} from "@/lib/modules/usuarios";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const ROLES_VALIDOS: RolCodigo[] = [
  "ADMIN",
  "SUPERVISOR",
  "CAJERO",
  "ALMACENISTA",
  "READONLY",
];

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

function rolesDelForm(formData: FormData): RolCodigo[] {
  return formData
    .getAll("roles")
    .map((v) => String(v))
    .filter((v): v is RolCodigo => ROLES_VALIDOS.includes(v as RolCodigo));
}

// ----------------- Crear -----------------

export async function crearUsuarioAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("usuarios:crear");
  const input = {
    empresaId: user.empresaId,
    email: String(formData.get("email") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    password: String(formData.get("password") ?? ""),
    roles: rolesDelForm(formData),
  };
  const parsed = crearUsuarioSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  let nuevo;
  try {
    nuevo = await usuariosService.crear(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof EmailEnUsoError) return { ok: false, error: err.message };
    if (err instanceof RolNoEncontradoError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath("/usuarios");
  redirect(`/usuarios/${nuevo.id}?ok=creado`);
}

// ----------------- Actualizar -----------------

export async function actualizarUsuarioAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("usuarios:editar");
  const input = {
    id: String(formData.get("id") ?? ""),
    email: String(formData.get("email") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    activo: formData.get("activo") === "on",
    roles: rolesDelForm(formData),
  };
  const parsed = actualizarUsuarioSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await usuariosService.actualizar(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof UsuarioNoEncontradoError) return { ok: false, error: err.message };
    if (err instanceof EmailEnUsoError) return { ok: false, error: err.message };
    if (err instanceof RolNoEncontradoError) return { ok: false, error: err.message };
    if (err instanceof AutoDesactivacionError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${parsed.data.id}`);
  return { ok: true };
}

// ----------------- Cambiar password -----------------

export async function cambiarPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("usuarios:editar");
  const input = {
    id: String(formData.get("id") ?? ""),
    nuevaPassword: String(formData.get("nuevaPassword") ?? ""),
  };
  const parsed = cambiarPasswordSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await usuariosService.cambiarPassword(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof UsuarioNoEncontradoError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath(`/usuarios/${parsed.data.id}`);
  return { ok: true };
}

// ----------------- Desbloquear -----------------

export async function desbloquearUsuarioAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("usuarios:editar");
  const parsed = desbloquearUsuarioSchema.safeParse({
    id: String(formData.get("id") ?? ""),
  });
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await usuariosService.desbloquear(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof UsuarioNoEncontradoError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath(`/usuarios/${parsed.data.id}`);
  revalidatePath("/usuarios");
  return { ok: true };
}
