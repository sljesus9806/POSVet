"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  OrdenCompraNoEncontradaError,
  RecepcionExcedeOcError,
  RecepcionVaciaError,
  TransicionOcInvalidaError,
  comprasService,
} from "@/lib/modules/compras";
import { productosService } from "@/lib/modules/productos";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

type LineaPayload = {
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  ivaTasa: number;
  codigoProveedor?: string;
};

function parseLineasOC(formData: FormData): LineaPayload[] {
  const productoIds = formData.getAll("productoId").map(String);
  const cantidades = formData.getAll("cantidad").map((v) => Number(v));
  const costos = formData.getAll("costoUnitario").map((v) => Number(v));
  const ivas = formData.getAll("ivaTasa").map((v) => Number(v));
  const codigos = formData.getAll("codigoProveedor").map(String);

  const lineas: LineaPayload[] = [];
  for (let i = 0; i < productoIds.length; i++) {
    if (!productoIds[i] || !cantidades[i] || cantidades[i] <= 0) continue;
    lineas.push({
      productoId: productoIds[i],
      cantidad: cantidades[i],
      costoUnitario: costos[i] ?? 0,
      ivaTasa: ivas[i] ?? 0,
      codigoProveedor: codigos[i] || undefined,
    });
  }
  return lineas;
}

export async function crearOrdenCompraAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("compras:crear");

  const input = {
    proveedorId: String(formData.get("proveedorId") ?? ""),
    ubicacionDestinoId: String(formData.get("ubicacionDestinoId") ?? ""),
    // Checkbox marcado por defecto: los precios capturados YA incluyen IVA.
    preciosIncluyenIva: formData.get("preciosIncluyenIva") === "on",
    fechaEsperada: String(formData.get("fechaEsperada") ?? ""),
    observaciones: String(formData.get("observaciones") ?? ""),
    lineas: parseLineasOC(formData),
  };

  if (input.lineas.length === 0) {
    return { ok: false, error: "Agrega al menos una línea con cantidad mayor a 0" };
  }

  try {
    const oc = await comprasService.crearOrden(input, { usuarioId: user.id });
    revalidatePath("/compras");
    redirect(`/compras/${oc.id}?ok=creada`);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }
}

// Crear un producto nuevo desde la OC (cuando no existe en el catálogo).
export type ProductoRapido = {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  codigoProveedor: string | null;
  costoUnitario: number;
  ivaAplicable: number;
};

export async function crearProductoRapidoAction(
  input: { nombre: string; precioVenta?: number; unidadMedida?: string },
): Promise<{ ok: boolean; error?: string; producto?: ProductoRapido }> {
  const user = await requirePermission("productos:crear");
  const nombre = input.nombre?.trim();
  if (!nombre) return { ok: false, error: "Escribe un nombre" };
  try {
    const det = await productosService.crear(
      {
        nombre,
        unidadMedida: input.unidadMedida || "PZA",
        precios: [{ tipo: "PUBLICO", precio: input.precioVenta && input.precioVenta > 0 ? input.precioVenta : 0 }],
      } as never,
      { usuarioId: user.id },
    );
    revalidatePath("/productos");
    return {
      ok: true,
      producto: {
        productoId: det.id,
        sku: det.sku,
        nombre: det.nombre,
        unidadMedida: det.unidadMedida,
        codigoProveedor: null,
        costoUnitario: det.ultimoCosto,
        ivaAplicable: det.ivaAplicable,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear el producto" };
  }
}

export async function enviarOrdenCompraAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("compras:editar");
  const ordenCompraId = String(formData.get("ordenCompraId") ?? "");
  try {
    await comprasService.enviarOrden({ ordenCompraId }, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof OrdenCompraNoEncontradaError) return { ok: false, error: err.message };
    if (err instanceof TransicionOcInvalidaError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/compras");
  revalidatePath(`/compras/${ordenCompraId}`);
  return { ok: true };
}

export async function cancelarOrdenCompraAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("compras:editar");
  const ordenCompraId = String(formData.get("ordenCompraId") ?? "");
  const motivo = String(formData.get("motivo") ?? "");
  try {
    await comprasService.cancelarOrden({ ordenCompraId, motivo }, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof OrdenCompraNoEncontradaError) return { ok: false, error: err.message };
    if (err instanceof TransicionOcInvalidaError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }
  revalidatePath("/compras");
  revalidatePath(`/compras/${ordenCompraId}`);
  return { ok: true };
}

type LineaRecepcionPayload = {
  ocLineaId: string;
  cantidad: number;
  costoUnitario: number;
  lote?: string;
  caducidad?: string;
};

function parseLineasRecepcion(formData: FormData): LineaRecepcionPayload[] {
  const lineaIds = formData.getAll("ocLineaId").map(String);
  const cantidades = formData.getAll("recCantidad").map((v) => Number(v));
  const costos = formData.getAll("recCostoUnitario").map((v) => Number(v));
  const lotes = formData.getAll("recLote").map(String);
  const caducidades = formData.getAll("recCaducidad").map(String);

  const out: LineaRecepcionPayload[] = [];
  for (let i = 0; i < lineaIds.length; i++) {
    const cant = cantidades[i];
    if (!lineaIds[i] || !cant || cant <= 0) continue;
    out.push({
      ocLineaId: lineaIds[i],
      cantidad: cant,
      costoUnitario: costos[i] ?? 0,
      lote: lotes[i] || undefined,
      caducidad: caducidades[i] || undefined,
    });
  }
  return out;
}

export async function registrarRecepcionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("compras:editar");
  const ordenCompraId = String(formData.get("ordenCompraId") ?? "");
  const observaciones = String(formData.get("observaciones") ?? "");
  const lineas = parseLineasRecepcion(formData);

  if (lineas.length === 0) {
    return { ok: false, error: "Captura cantidad recibida en al menos una línea" };
  }

  try {
    await comprasService.registrarRecepcion(
      { ordenCompraId, observaciones, lineas },
      { usuarioId: user.id },
    );
  } catch (err) {
    if (err instanceof OrdenCompraNoEncontradaError) return { ok: false, error: err.message };
    if (err instanceof TransicionOcInvalidaError) return { ok: false, error: err.message };
    if (err instanceof RecepcionExcedeOcError) return { ok: false, error: err.message };
    if (err instanceof RecepcionVaciaError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }

  revalidatePath("/compras");
  revalidatePath(`/compras/${ordenCompraId}`);
  revalidatePath("/productos");
  return { ok: true };
}
