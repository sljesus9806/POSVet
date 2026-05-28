"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ClienteNoEncontradoError,
  actualizarClienteSchema,
  clientesService,
  crearClienteSchema,
} from "@/lib/modules/clientes";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

function pick(formData: FormData): Record<string, unknown> {
  const keys = [
    "nombre",
    "rfc",
    "regimenFiscal",
    "usoCFDI",
    "codigoPostal",
    "email",
    "telefono",
    "notas",
    "tipoCliente",
    "tipoPrecio",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = String(formData.get(k) ?? "");
  const linea = formData.get("lineaCredito");
  if (linea != null && String(linea).length > 0) out.lineaCredito = Number(linea);
  const dias = formData.get("diasCredito");
  if (dias != null && String(dias).length > 0) out.diasCredito = Number(dias);
  return out;
}

export async function crearClienteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("clientes:crear");
  const parsed = crearClienteSchema.safeParse(pick(formData));
  if (!parsed.success) return formatZod(parsed.error);

  const cliente = await clientesService.crear(parsed.data, { usuarioId: user.id });
  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}?ok=creado`);
}

export async function actualizarClienteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("clientes:editar");
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta el id" };

  const input = {
    id,
    ...pick(formData),
    activo: formData.get("activo") === "on",
  };
  const parsed = actualizarClienteSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await clientesService.actualizar(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof ClienteNoEncontradoError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}
