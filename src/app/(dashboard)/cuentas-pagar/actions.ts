"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AplicacionExcedeSaldoError,
  DistribucionInvalidaError,
  FacturaCanceladaError,
  FacturaConPagosError,
  FacturaDistintoProveedorError,
  FacturaDuplicadaError,
  FacturaNoEncontradaError,
  PagoCanceladoError,
  PagoNoEncontradoError,
  cuentasPagarService,
} from "@/lib/modules/cuentas-pagar";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

export async function registrarFacturaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("cuentas-pagar:crear");

  const input = {
    proveedorId: String(formData.get("proveedorId") ?? ""),
    folioProveedor: String(formData.get("folioProveedor") ?? ""),
    ordenCompraId: String(formData.get("ordenCompraId") ?? ""),
    fechaEmision: String(formData.get("fechaEmision") ?? ""),
    fechaVencimiento: String(formData.get("fechaVencimiento") ?? ""),
    subtotal: Number(formData.get("subtotal") ?? 0),
    iva: Number(formData.get("iva") ?? 0),
    total: Number(formData.get("total") ?? 0),
    observaciones: String(formData.get("observaciones") ?? ""),
  };

  let id: string;
  try {
    const f = await cuentasPagarService.registrarFactura(input, { usuarioId: user.id });
    id = f.id;
  } catch (err) {
    if (err instanceof FacturaDuplicadaError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }

  revalidatePath("/cuentas-pagar");
  redirect(`/cuentas-pagar/facturas/${id}?ok=creada`);
}

export async function cancelarFacturaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("cuentas-pagar:editar");
  const facturaId = String(formData.get("facturaId") ?? "");
  const motivo = String(formData.get("motivo") ?? "");
  try {
    await cuentasPagarService.cancelarFactura({ facturaId, motivo }, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof FacturaNoEncontradaError) return { ok: false, error: err.message };
    if (err instanceof FacturaConPagosError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }
  revalidatePath("/cuentas-pagar");
  revalidatePath(`/cuentas-pagar/facturas/${facturaId}`);
  return { ok: true };
}

export async function registrarPagoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("cuentas-pagar:crear");

  const facturasIds = formData.getAll("aplFacturaId").map(String);
  const montos = formData.getAll("aplMonto").map((v) => Number(v));
  const aplicaciones: Array<{ facturaId: string; monto: number }> = [];
  for (let i = 0; i < facturasIds.length; i++) {
    if (!facturasIds[i] || !montos[i] || montos[i] <= 0) continue;
    aplicaciones.push({ facturaId: facturasIds[i], monto: montos[i] });
  }

  const input = {
    proveedorId: String(formData.get("proveedorId") ?? ""),
    fecha: String(formData.get("fecha") ?? ""),
    formaPago: String(formData.get("formaPago") ?? ""),
    monto: Number(formData.get("monto") ?? 0),
    referencia: String(formData.get("referencia") ?? ""),
    observaciones: String(formData.get("observaciones") ?? ""),
    aplicaciones,
  };

  let pagoId: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = await cuentasPagarService.registrarPago(input as any, { usuarioId: user.id });
    pagoId = p.id;
  } catch (err) {
    if (err instanceof DistribucionInvalidaError) return { ok: false, error: err.message };
    if (err instanceof AplicacionExcedeSaldoError) return { ok: false, error: err.message };
    if (err instanceof FacturaNoEncontradaError) return { ok: false, error: err.message };
    if (err instanceof FacturaCanceladaError) return { ok: false, error: err.message };
    if (err instanceof FacturaDistintoProveedorError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }

  revalidatePath("/cuentas-pagar");
  revalidatePath(`/cuentas-pagar/estado-cuenta/${input.proveedorId}`);
  redirect(`/cuentas-pagar/pagos/${pagoId}?ok=creado`);
}

export async function cancelarPagoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("cuentas-pagar:editar");
  const pagoId = String(formData.get("pagoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "");
  try {
    await cuentasPagarService.cancelarPago({ pagoId, motivo }, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof PagoNoEncontradoError) return { ok: false, error: err.message };
    if (err instanceof PagoCanceladoError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }
  revalidatePath("/cuentas-pagar");
  revalidatePath(`/cuentas-pagar/pagos/${pagoId}`);
  return { ok: true };
}
