"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CategoriaDuplicadaError,
  CodigoBarrasDuplicadoError,
  ProductoNoEncontradoError,
  SkuDuplicadoError,
  categoriasService,
  crearLoteSchema,
  crearProductoSchema,
  productosService,
} from "@/lib/modules/productos";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function parseNumber(value: FormDataEntryValue | null, fallback?: number): number | undefined {
  if (value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatZod(err: z.ZodError): FormState {
  const flat = err.flatten();
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
  };
}

export async function crearProductoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("productos:crear");

  const precios: Array<{ tipo: "PUBLICO" | "MAYOREO" | "VETERINARIO"; precio: number }> = [];
  for (const tipo of ["PUBLICO", "MAYOREO", "VETERINARIO"] as const) {
    const p = parseNumber(formData.get(`precio_${tipo}`));
    if (p !== undefined && p > 0) precios.push({ tipo, precio: p });
  }

  const input = {
    sku: String(formData.get("sku") ?? ""),
    codigoBarras: String(formData.get("codigoBarras") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    descripcion: String(formData.get("descripcion") ?? ""),
    marca: String(formData.get("marca") ?? ""),
    categoriaId: String(formData.get("categoriaId") ?? ""),
    unidadMedida: String(formData.get("unidadMedida") ?? "PZA"),
    tipo: String(formData.get("tipo") ?? "ACCESORIO") as never,
    especie: String(formData.get("especie") ?? ""),
    requiereReceta: formData.get("requiereReceta") === "on",
    sustanciaControlada: formData.get("sustanciaControlada") === "on",
    laboratorio: String(formData.get("laboratorio") ?? ""),
    viaAdministracion: String(formData.get("viaAdministracion") ?? ""),
    claveSAT: String(formData.get("claveSAT") ?? "01010101"),
    ivaAplicable: parseNumber(formData.get("ivaAplicable"), 0.16)!,
    ultimoCosto: parseNumber(formData.get("ultimoCosto"), 0)!,
    precios,
  };

  const parsed = crearProductoSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  let productoId: string;
  try {
    const detalle = await productosService.crear(parsed.data, { usuarioId: user.id });
    productoId = detalle.id;
  } catch (err) {
    if (err instanceof SkuDuplicadoError || err instanceof CodigoBarrasDuplicadoError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  revalidatePath("/productos");
  revalidatePath(`/productos/${productoId}`);
  redirect(`/productos/${productoId}?ok=creado`);
}

const actualizarFormSchema = crearProductoSchema.partial().extend({
  id: z.string().cuid(),
  activo: z.boolean().optional(),
});

export async function actualizarProductoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("productos:editar");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta el id del producto" };

  const precios: Array<{ tipo: "PUBLICO" | "MAYOREO" | "VETERINARIO"; precio: number }> = [];
  for (const tipo of ["PUBLICO", "MAYOREO", "VETERINARIO"] as const) {
    const raw = formData.get(`precio_${tipo}`);
    if (raw !== null && raw !== "") {
      const p = parseNumber(raw);
      if (p !== undefined) precios.push({ tipo, precio: p });
    }
  }

  const input: Record<string, unknown> = {
    id,
    sku: String(formData.get("sku") ?? ""),
    codigoBarras: String(formData.get("codigoBarras") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    descripcion: String(formData.get("descripcion") ?? ""),
    marca: String(formData.get("marca") ?? ""),
    categoriaId: String(formData.get("categoriaId") ?? ""),
    unidadMedida: String(formData.get("unidadMedida") ?? "PZA"),
    tipo: String(formData.get("tipo") ?? "ACCESORIO"),
    especie: String(formData.get("especie") ?? ""),
    requiereReceta: formData.get("requiereReceta") === "on",
    sustanciaControlada: formData.get("sustanciaControlada") === "on",
    laboratorio: String(formData.get("laboratorio") ?? ""),
    viaAdministracion: String(formData.get("viaAdministracion") ?? ""),
    claveSAT: String(formData.get("claveSAT") ?? "01010101"),
    ivaAplicable: parseNumber(formData.get("ivaAplicable"), 0.16)!,
    ultimoCosto: parseNumber(formData.get("ultimoCosto"), 0)!,
    activo: formData.get("activo") === "on",
    precios: precios.length ? precios : undefined,
  };

  const parsed = actualizarFormSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await productosService.actualizar(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (
      err instanceof SkuDuplicadoError ||
      err instanceof CodigoBarrasDuplicadoError ||
      err instanceof ProductoNoEncontradoError
    ) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  return { ok: true };
}

export async function crearLoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("productos:editar");

  const input = {
    productoId: String(formData.get("productoId") ?? ""),
    lote: String(formData.get("lote") ?? ""),
    caducidad: String(formData.get("caducidad") ?? ""),
    cantidad: parseNumber(formData.get("cantidad"), 0)!,
    costoUnitario: parseNumber(formData.get("costoUnitario"), 0)!,
  };

  const parsed = crearLoteSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  await productosService.crearLote(parsed.data, { usuarioId: user.id });
  revalidatePath(`/productos/${parsed.data.productoId}`);
  return { ok: true };
}

export async function crearCategoriaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("productos:crear");
  const input = {
    nombre: String(formData.get("nombre") ?? "").trim(),
    descripcion: String(formData.get("descripcion") ?? "").trim() || undefined,
  };
  if (!input.nombre) return { ok: false, error: "El nombre es obligatorio" };
  try {
    await categoriasService.crear(input, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof CategoriaDuplicadaError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/productos/categorias");
  revalidatePath("/productos/nuevo");
  return { ok: true };
}
