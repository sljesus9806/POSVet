"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  LineaCatalogoNoEncontradaError,
  ProductoYaEnCatalogoError,
  ProveedorNoEncontradoError,
  actualizarLineaCatalogoSchema,
  actualizarProveedorSchema,
  agregarLineaCatalogoSchema,
  crearProveedorSchema,
  eliminarLineaCatalogoSchema,
  proveedoresService,
} from "@/lib/modules/proveedores";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

function pickProveedor(formData: FormData): Record<string, unknown> {
  const keys = [
    "nombre",
    "rfc",
    "regimenFiscal",
    "codigoPostal",
    "email",
    "telefono",
    "contacto",
    "direccion",
    "notas",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = String(formData.get(k) ?? "");
  const dias = formData.get("diasCredito");
  if (dias != null && String(dias).length > 0) out.diasCredito = Number(dias);
  return out;
}

// ----------------- Proveedor -----------------

export async function crearProveedorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("proveedores:crear");
  const parsed = crearProveedorSchema.safeParse(pickProveedor(formData));
  if (!parsed.success) return formatZod(parsed.error);

  const prov = await proveedoresService.crear(parsed.data, { usuarioId: user.id });
  revalidatePath("/proveedores");
  redirect(`/proveedores/${prov.id}?ok=creado`);
}

export async function actualizarProveedorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("proveedores:editar");
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta el id" };

  const input = {
    id,
    ...pickProveedor(formData),
    activo: formData.get("activo") === "on",
  };
  const parsed = actualizarProveedorSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await proveedoresService.actualizar(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof ProveedorNoEncontradoError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${id}`);
  return { ok: true };
}

// ----------------- Catálogo -----------------

export async function agregarLineaCatalogoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("proveedores:editar");
  const input = {
    proveedorId: String(formData.get("proveedorId") ?? ""),
    productoId: String(formData.get("productoId") ?? ""),
    codigoProveedor: String(formData.get("codigoProveedor") ?? ""),
    costoUnitario: Number(formData.get("costoUnitario") ?? 0),
    esPreferido: formData.get("esPreferido") === "on",
    notas: String(formData.get("notas") ?? ""),
  };
  const parsed = agregarLineaCatalogoSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await proveedoresService.agregarLineaCatalogo(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof ProductoYaEnCatalogoError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath(`/proveedores/${parsed.data.proveedorId}`);
  return { ok: true };
}

export async function actualizarLineaCatalogoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("proveedores:editar");
  const input = {
    lineaId: String(formData.get("lineaId") ?? ""),
    codigoProveedor: String(formData.get("codigoProveedor") ?? ""),
    costoUnitario: Number(formData.get("costoUnitario") ?? 0),
    esPreferido: formData.get("esPreferido") === "on",
    notas: String(formData.get("notas") ?? ""),
  };
  const parsed = actualizarLineaCatalogoSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  const proveedorId = String(formData.get("proveedorId") ?? "");
  try {
    await proveedoresService.actualizarLineaCatalogo(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof LineaCatalogoNoEncontradaError) return { ok: false, error: err.message };
    throw err;
  }

  if (proveedorId) revalidatePath(`/proveedores/${proveedorId}`);
  return { ok: true };
}

export async function eliminarLineaCatalogoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("proveedores:editar");
  const parsed = eliminarLineaCatalogoSchema.safeParse({
    lineaId: String(formData.get("lineaId") ?? ""),
  });
  if (!parsed.success) return formatZod(parsed.error);

  const proveedorId = String(formData.get("proveedorId") ?? "");
  try {
    await proveedoresService.eliminarLineaCatalogo(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof LineaCatalogoNoEncontradaError) return { ok: false, error: err.message };
    throw err;
  }

  if (proveedorId) revalidatePath(`/proveedores/${proveedorId}`);
  return { ok: true };
}
