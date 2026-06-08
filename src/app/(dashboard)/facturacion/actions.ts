"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-helpers";
import {
  cancelarFacturaSchema,
  emitirFacturaSchema,
  facturacionService,
  PacError,
  DatosFiscalesEmpresaIncompletosError,
  DescuentoGlobalNoSoportadoError,
  FacturaNoEncontradaError,
  FacturaYaCanceladaError,
  VentaNoFacturableError,
  VentaParaFacturarNoEncontradaError,
  VentaYaFacturadaError,
} from "@/lib/modules/facturacion";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function formatZod(err: z.ZodError): FormState {
  return {
    ok: false,
    error: "Revisa los campos del formulario",
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  };
}

// Errores de negocio cuyo mensaje es seguro mostrar tal cual al usuario.
function esErrorDeNegocio(err: unknown): err is Error {
  return (
    err instanceof PacError ||
    err instanceof DatosFiscalesEmpresaIncompletosError ||
    err instanceof DescuentoGlobalNoSoportadoError ||
    err instanceof FacturaNoEncontradaError ||
    err instanceof FacturaYaCanceladaError ||
    err instanceof VentaNoFacturableError ||
    err instanceof VentaParaFacturarNoEncontradaError ||
    err instanceof VentaYaFacturadaError
  );
}

export async function emitirFacturaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("facturacion:crear");

  const parsed = emitirFacturaSchema.safeParse({
    ventaId: String(formData.get("ventaId") ?? ""),
    receptorRfc: String(formData.get("receptorRfc") ?? ""),
    receptorNombre: String(formData.get("receptorNombre") ?? ""),
    receptorRegimen: String(formData.get("receptorRegimen") ?? ""),
    receptorUsoCfdi: String(formData.get("receptorUsoCfdi") ?? ""),
    receptorCp: String(formData.get("receptorCp") ?? ""),
    formaPago: String(formData.get("formaPago") ?? ""),
    metodoPago: String(formData.get("metodoPago") ?? ""),
  });
  if (!parsed.success) return formatZod(parsed.error);

  let facturaId: string;
  try {
    const factura = await facturacionService.emitirDesdeVenta(parsed.data, { usuarioId: user.id });
    facturaId = factura.id;
  } catch (err) {
    if (esErrorDeNegocio(err)) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath("/facturacion");
  redirect(`/facturacion/${facturaId}?ok=timbrada`);
}

export async function cancelarFacturaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("facturacion:autorizar");

  const parsed = cancelarFacturaSchema.safeParse({
    facturaId: String(formData.get("facturaId") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
    folioSustitucion: String(formData.get("folioSustitucion") ?? ""),
  });
  if (!parsed.success) return formatZod(parsed.error);

  try {
    await facturacionService.cancelar(parsed.data, { usuarioId: user.id });
  } catch (err) {
    if (esErrorDeNegocio(err)) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath("/facturacion");
  revalidatePath(`/facturacion/${parsed.data.facturaId}`);
  return { ok: true };
}
