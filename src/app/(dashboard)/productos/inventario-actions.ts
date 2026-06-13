"use server";

// Acciones rápidas para la pantalla unificada de Productos. A diferencia de las de
// actions.ts (que redirigen), estas devuelven { ok, error } para que el modal se
// cierre y la lista se refresque SIN cambiar de página.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { inventarioService } from "@/lib/modules/inventario";
import { productosService } from "@/lib/modules/productos";
import { requirePermission } from "@/lib/auth-helpers";

export type ActionResult = { ok: boolean; error?: string };

function mensaje(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

const agregarStockSchema = z.object({
  productoId: z.string().min(1),
  ubicacionId: z.string().min(1, "Elige una ubicación"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  costoUnitario: z.number().nonnegative(),
});

export async function agregarStockAction(input: z.input<typeof agregarStockSchema>): Promise<ActionResult> {
  const user = await requirePermission("inventario:editar");
  const parsed = agregarStockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    await inventarioService.registrarEntrada(parsed.data, { usuarioId: user.id });
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo agregar el stock") };
  }
  revalidatePath("/productos");
  return { ok: true };
}

const ajustarStockSchema = z.object({
  productoId: z.string().min(1),
  ubicacionId: z.string().min(1, "Elige una ubicación"),
  delta: z.number().refine((v) => v !== 0, "El ajuste no puede ser 0"),
  motivo: z.enum(["AJUSTE_MERMA", "AJUSTE_CADUCIDAD", "AJUSTE_ROBO", "AJUSTE_CONTEO"]),
  observaciones: z.string().trim().max(500).optional(),
});

export async function ajustarStockAction(input: z.input<typeof ajustarStockSchema>): Promise<ActionResult> {
  const user = await requirePermission("inventario:editar");
  const parsed = ajustarStockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    await inventarioService.ajustarStock(parsed.data, { usuarioId: user.id });
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo ajustar el stock") };
  }
  revalidatePath("/productos");
  return { ok: true };
}

export async function eliminarProductoAction(
  input: { id: string },
): Promise<ActionResult & { eliminado?: boolean }> {
  const user = await requirePermission("productos:eliminar");
  if (!input.id) return { ok: false, error: "Falta el producto" };
  try {
    const res = await productosService.eliminar(input.id, { usuarioId: user.id });
    revalidatePath("/productos");
    return { ok: true, eliminado: res.eliminado };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo eliminar el producto") };
  }
}

export async function abrirEmpaqueAction(
  // `contenido` = cuántas unidades de granel trae cada costal. Se captura al abrir
  // (no al dar de alta el producto). Si no llega, se usa el guardado del costal.
  input: { productoId: string; ubicacionId: string; cantidadEmpaques: number; contenido?: number },
): Promise<ActionResult & { empaquesRestantes?: number; granelResultante?: number }> {
  const user = await requirePermission("inventario:editar");
  const prod = await productosService.obtener(input.productoId);
  if (!prod) return { ok: false, error: "Producto no encontrado" };
  if (!prod.productoGranelId) {
    return { ok: false, error: "Este producto no está ligado a un producto a granel" };
  }
  if (!input.ubicacionId) return { ok: false, error: "Elige una ubicación" };
  if (!(input.cantidadEmpaques > 0)) return { ok: false, error: "Indica cuántos costales abrir" };
  const contenido = input.contenido && input.contenido > 0 ? input.contenido : prod.contenidoGranel ?? 0;
  if (!(contenido > 0)) {
    return { ok: false, error: "Indica cuánto granel trae cada costal" };
  }
  try {
    const res = await inventarioService.abrirEmpaque(
      {
        productoEmpaqueId: prod.id,
        productoGranelId: prod.productoGranelId,
        ubicacionId: input.ubicacionId,
        cantidadEmpaques: input.cantidadEmpaques,
        contenido,
        costoUnitarioEmpaque: prod.costoPromedio || prod.ultimoCosto,
      },
      { usuarioId: user.id },
    );
    // Recuerda el contenido en el costal para próximas aperturas.
    if (contenido !== prod.contenidoGranel) {
      await productosService.fijarContenidoGranel(prod.id, contenido);
    }
    revalidatePath("/productos");
    return { ok: true, empaquesRestantes: res.empaquesRestantes, granelResultante: res.granelResultante };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo abrir el empaque") };
  }
}

export async function cambiarActivoProductoAction(input: { id: string; activo: boolean }): Promise<ActionResult> {
  const user = await requirePermission("productos:editar");
  if (!input.id) return { ok: false, error: "Falta el producto" };
  try {
    await productosService.actualizar({ id: input.id, activo: input.activo }, { usuarioId: user.id });
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo cambiar el estado del producto") };
  }
  revalidatePath("/productos");
  return { ok: true };
}
