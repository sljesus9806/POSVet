"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  StockInsuficienteError,
  ajustarStockSchema,
  crearTransferenciaSchema,
  inventarioService,
  registrarEntradaSchema,
} from "@/lib/modules/inventario";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function parseNumber(v: FormDataEntryValue | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

export async function ajustarStockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("inventario:editar");
  const tipoMovimiento = String(formData.get("tipoMovimiento") ?? "SALIDA");
  const cantidad = parseNumber(formData.get("cantidad"));
  if (cantidad === undefined || cantidad <= 0) {
    return { ok: false, error: "La cantidad debe ser mayor a cero" };
  }
  const delta = tipoMovimiento === "ENTRADA" ? cantidad : -cantidad;

  const input = {
    productoId: String(formData.get("productoId") ?? ""),
    ubicacionId: String(formData.get("ubicacionId") ?? ""),
    loteId: String(formData.get("loteId") ?? ""),
    motivo: String(formData.get("motivo") ?? "AJUSTE_CONTEO"),
    delta,
    observaciones: String(formData.get("observaciones") ?? "") || undefined,
  };

  const parsed = ajustarStockSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await inventarioService.ajustarStock(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof StockInsuficienteError) {
      return { ok: false, error: `Stock insuficiente (faltan ${err.faltante} unidades)` };
    }
    throw err;
  }

  revalidatePath("/inventario");
  revalidatePath("/inventario/movimientos");
  revalidatePath(`/productos/${parsed.data.productoId}`);
  return { ok: true };
}

export async function registrarEntradaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("inventario:editar");

  const input = {
    productoId: String(formData.get("productoId") ?? ""),
    ubicacionId: String(formData.get("ubicacionId") ?? ""),
    cantidad: parseNumber(formData.get("cantidad")) ?? 0,
    costoUnitario: parseNumber(formData.get("costoUnitario")) ?? 0,
    loteId: String(formData.get("loteId") ?? ""),
    observaciones: String(formData.get("observaciones") ?? "") || undefined,
  };

  const parsed = registrarEntradaSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  await inventarioService.registrarEntrada(parsed.data, { usuarioId: user.id });
  revalidatePath("/inventario");
  revalidatePath("/inventario/movimientos");
  revalidatePath(`/productos/${parsed.data.productoId}`);
  return { ok: true };
}

export async function crearTransferenciaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("inventario:editar");

  const productoIds = formData.getAll("productoId[]").map(String);
  const cantidades = formData.getAll("cantidad[]").map(String);
  const lineas = productoIds
    .map((id, i) => ({
      productoId: id,
      cantidad: parseNumber(cantidades[i]) ?? 0,
    }))
    .filter((l) => l.productoId && l.cantidad > 0);

  const input = {
    origenId: String(formData.get("origenId") ?? ""),
    destinoId: String(formData.get("destinoId") ?? ""),
    observaciones: String(formData.get("observaciones") ?? "") || undefined,
    lineas,
  };

  const parsed = crearTransferenciaSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);

  let transferenciaId: string;
  try {
    const t = await inventarioService.crearTransferencia(parsed.data, { usuarioId: user.id });
    transferenciaId = t.id;
  } catch (err) {
    if (err instanceof StockInsuficienteError) {
      return { ok: false, error: `Stock insuficiente en origen (faltan ${err.faltante})` };
    }
    throw err;
  }

  revalidatePath("/inventario");
  revalidatePath("/inventario/transferencias");
  redirect(`/inventario/transferencias/${transferenciaId}?ok=1`);
}
