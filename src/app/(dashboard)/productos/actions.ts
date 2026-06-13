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
import { inventarioService } from "@/lib/modules/inventario";
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

  // Precio público = precio final de venta. SAT/IVA usan el default de la BD.
  const precioPublico = parseNumber(formData.get("precio_PUBLICO"));
  const precios = precioPublico !== undefined && precioPublico > 0
    ? [{ tipo: "PUBLICO" as const, precio: precioPublico }]
    : [];

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

  // Stock inicial opcional: el form manda un campo `stock_<ubicacionId>` por
  // ubicación. Registra una entrada por cada una con cantidad > 0.
  // El costo unitario de la entrada es el "precio unitario" del producto.
  const costoUnitario = parseNumber(formData.get("ultimoCosto"), 0)!;
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("stock_")) continue;
    const ubicacionId = key.slice("stock_".length);
    const cantidad = parseNumber(value);
    if (!ubicacionId || !cantidad || cantidad <= 0) continue;
    try {
      await inventarioService.registrarEntrada(
        { productoId, ubicacionId, cantidad, costoUnitario },
        { usuarioId: user.id },
      );
    } catch {
      // El producto ya quedó creado; si una entrada falla, puede agregarla
      // después desde la pantalla de productos. No abortamos el alta.
    }
  }

  // Venta a granel opcional: si lo activó en el alta, crea+liga el producto granel.
  if (formData.get("granelActivo") === "on") {
    try {
      await productosService.configurarGranel(
        {
          empaqueId: productoId,
          activo: true,
          contenido: parseNumber(formData.get("contenidoGranel"), 0),
          unidadGranel: String(formData.get("unidadGranel") ?? "G"),
        },
        { usuarioId: user.id },
      );
    } catch {
      // No abortamos el alta; el granel se puede configurar después al editar.
    }
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

  const precioPublico = parseNumber(formData.get("precio_PUBLICO"));
  const precios = precioPublico !== undefined
    ? [{ tipo: "PUBLICO" as const, precio: precioPublico }]
    : undefined;

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
    ultimoCosto: parseNumber(formData.get("ultimoCosto"), 0)!,
    activo: formData.get("activo") === "on",
    precios,
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

  // Venta a granel: activa/desactiva y (si hace falta) crea+liga el producto granel.
  const granelActivo = formData.get("granelActivo") === "on";
  try {
    await productosService.configurarGranel(
      {
        empaqueId: id,
        activo: granelActivo,
        contenido: parseNumber(formData.get("contenidoGranel"), 0),
        unidadGranel: String(formData.get("unidadGranel") ?? "G"),
      },
      { usuarioId: user.id },
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo configurar el granel" };
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
