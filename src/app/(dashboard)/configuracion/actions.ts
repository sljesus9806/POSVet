"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  EmpresaNoEncontradaError,
  UbicacionConInventarioError,
  UbicacionNoEncontradaError,
  actualizarEmpresaSchema,
  actualizarUbicacionSchema,
  configuracionService,
  crearUbicacionSchema,
} from "@/lib/modules/configuracion";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

// ----------------- Empresa -----------------

export async function actualizarEmpresaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("configuracion:editar");
  const input = {
    id: String(formData.get("id") ?? ""),
    rfc: String(formData.get("rfc") ?? ""),
    razonSocial: String(formData.get("razonSocial") ?? ""),
    regimenFiscal: String(formData.get("regimenFiscal") ?? ""),
    codigoPostal: String(formData.get("codigoPostal") ?? ""),
    direccion: String(formData.get("direccion") ?? ""),
    email: String(formData.get("email") ?? ""),
    telefono: String(formData.get("telefono") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
  };
  const parsed = actualizarEmpresaSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await configuracionService.actualizarEmpresa(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof EmpresaNoEncontradaError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath("/configuracion");
  return { ok: true };
}

// ----------------- Ubicaciones -----------------

export async function crearUbicacionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("configuracion:crear");
  const input = {
    nombre: String(formData.get("nombre") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    direccion: String(formData.get("direccion") ?? ""),
  };
  const parsed = crearUbicacionSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  await configuracionService.crearUbicacion(parsed.data, {
    usuarioId: user.id,
    empresaId: user.empresaId,
  });

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function actualizarUbicacionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("configuracion:editar");
  const input = {
    id: String(formData.get("id") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    direccion: String(formData.get("direccion") ?? ""),
    activa: formData.get("activa") === "on",
  };
  const parsed = actualizarUbicacionSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await configuracionService.actualizarUbicacion(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof UbicacionNoEncontradaError) return { ok: false, error: err.message };
    if (err instanceof UbicacionConInventarioError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath("/configuracion");
  return { ok: true };
}
