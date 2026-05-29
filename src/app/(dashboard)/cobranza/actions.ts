"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AbonoCanceladoError,
  AbonoNoEncontradoError,
  AplicacionExcedeSaldoVentaError,
  DistribucionInvalidaError,
  VentaDistintoClienteError,
  VentaNoCreditoError,
  cobranzaService,
} from "@/lib/modules/cobranza";
import { requirePermission } from "@/lib/auth-helpers";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

export async function registrarAbonoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("cobranza:crear");

  const ventasIds = formData.getAll("aplVentaId").map(String);
  const montos = formData.getAll("aplMonto").map((v) => Number(v));
  const aplicaciones: Array<{ ventaId: string; monto: number }> = [];
  for (let i = 0; i < ventasIds.length; i++) {
    if (!ventasIds[i] || !montos[i] || montos[i] <= 0) continue;
    aplicaciones.push({ ventaId: ventasIds[i], monto: montos[i] });
  }

  const input = {
    clienteId: String(formData.get("clienteId") ?? ""),
    fecha: String(formData.get("fecha") ?? ""),
    formaPago: String(formData.get("formaPago") ?? ""),
    monto: Number(formData.get("monto") ?? 0),
    referencia: String(formData.get("referencia") ?? ""),
    observaciones: String(formData.get("observaciones") ?? ""),
    aplicaciones,
  };

  let abonoId: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = await cobranzaService.registrarAbono(input as any, { usuarioId: user.id });
    abonoId = a.id;
  } catch (err) {
    if (err instanceof DistribucionInvalidaError) return { ok: false, error: err.message };
    if (err instanceof AplicacionExcedeSaldoVentaError) return { ok: false, error: err.message };
    if (err instanceof VentaDistintoClienteError) return { ok: false, error: err.message };
    if (err instanceof VentaNoCreditoError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }

  revalidatePath("/cobranza");
  revalidatePath(`/cobranza/estado-cuenta/${input.clienteId}`);
  redirect(`/cobranza/abonos/${abonoId}?ok=creado`);
}

export async function cancelarAbonoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("cobranza:editar");
  const abonoId = String(formData.get("abonoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "");
  try {
    await cobranzaService.cancelarAbono({ abonoId, motivo }, { usuarioId: user.id });
  } catch (err) {
    if (err instanceof AbonoNoEncontradoError) return { ok: false, error: err.message };
    if (err instanceof AbonoCanceladoError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return formatZod(err);
    throw err;
  }
  revalidatePath("/cobranza");
  revalidatePath(`/cobranza/abonos/${abonoId}`);
  return { ok: true };
}
