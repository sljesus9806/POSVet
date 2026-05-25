"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CajaNoAbiertaError,
  CajaNoEncontradaError,
  CajaYaAbiertaError,
  CambioSoloEfectivoError,
  PagoInsuficienteError,
  ProductoSinPrecioError,
  StockInsuficienteError,
  VentaNoEncontradaError,
  VentaYaCanceladaError,
  abrirCajaSchema,
  cancelarVentaSchema,
  cerrarCajaSchema,
  crearVentaSchema,
  ventasService,
  type CrearVentaInput,
} from "@/lib/modules/ventas";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

function mapError(err: unknown): FormState {
  if (err instanceof CajaYaAbiertaError) return { ok: false, error: err.message };
  if (err instanceof CajaNoAbiertaError) return { ok: false, error: err.message };
  if (err instanceof CajaNoEncontradaError) return { ok: false, error: err.message };
  if (err instanceof VentaNoEncontradaError) return { ok: false, error: err.message };
  if (err instanceof VentaYaCanceladaError) return { ok: false, error: err.message };
  if (err instanceof PagoInsuficienteError) return { ok: false, error: err.message };
  if (err instanceof CambioSoloEfectivoError) return { ok: false, error: err.message };
  if (err instanceof ProductoSinPrecioError) return { ok: false, error: err.message };
  if (err instanceof StockInsuficienteError) return { ok: false, error: err.message };
  throw err;
}

// ------------- Cajas -------------
export async function abrirCajaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("cajas:crear");
  const parsed = abrirCajaSchema.safeParse({
    ubicacionId: String(formData.get("ubicacionId") ?? ""),
    fondoInicial: Number(formData.get("fondoInicial") ?? 0),
    observaciones: String(formData.get("observaciones") ?? "") || undefined,
  });
  if (!parsed.success) return formatZod(parsed.error);

  try {
    const caja = await ventasService.abrirCaja(parsed.data, { usuarioId: user.id });
    revalidatePath("/ventas");
    revalidatePath("/ventas/cajas");
    redirect(`/ventas?caja=${caja.id}`);
  } catch (err) {
    return mapError(err);
  }
}

export async function cerrarCajaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("cajas:crear");
  const parsed = cerrarCajaSchema.safeParse({
    cajaId: String(formData.get("cajaId") ?? ""),
    montoContadoEfectivo: Number(formData.get("montoContadoEfectivo") ?? 0),
    observaciones: String(formData.get("observaciones") ?? "") || undefined,
  });
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await ventasService.cerrarCaja(parsed.data, { usuarioId: user.id });
    revalidatePath("/ventas");
    revalidatePath("/ventas/cajas");
    revalidatePath(`/ventas/cajas/${parsed.data.cajaId}`);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

// ------------- Ventas -------------
// El POS es client-side y arma el payload tipado (CrearVentaInput); lo recibimos completo.
export type CrearVentaResult =
  | { ok: true; ventaId: string; folio: string }
  | { ok: false; error: string };

export async function crearVentaAction(input: CrearVentaInput): Promise<CrearVentaResult> {
  const user = await requirePermission("ventas:crear");
  const parsed = crearVentaSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }
  try {
    const venta = await ventasService.crearVenta(parsed.data, { usuarioId: user.id });
    revalidatePath("/ventas");
    revalidatePath("/ventas/historial");
    return { ok: true, ventaId: venta.id, folio: venta.folio };
  } catch (err) {
    const res = mapError(err);
    return { ok: false, error: res.error ?? "Error al guardar la venta" };
  }
}

export async function cancelarVentaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("ventas:autorizar");
  const parsed = cancelarVentaSchema.safeParse({
    ventaId: String(formData.get("ventaId") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
  });
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await ventasService.cancelarVenta(parsed.data, { usuarioId: user.id });
    revalidatePath("/ventas");
    revalidatePath("/ventas/historial");
    revalidatePath(`/ventas/historial/${parsed.data.ventaId}`);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

// Búsqueda de productos vendibles desde el POS (client).
export async function buscarProductosPOSAction(opts: {
  ubicacionId: string;
  q?: string;
}) {
  await requirePermission("ventas:crear");
  return ventasService.buscarProductosVendibles({
    ubicacionId: opts.ubicacionId,
    q: opts.q,
    limit: 30,
  });
}

