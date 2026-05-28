import { NextResponse } from "next/server";
import { cuentasPagarService } from "@/lib/modules/cuentas-pagar";
import { requirePermission } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  await requirePermission("cuentas-pagar:leer");
  const url = new URL(req.url);
  const proveedorId = url.searchParams.get("proveedorId");
  if (!proveedorId) return NextResponse.json([], { status: 200 });
  const facturas = await cuentasPagarService.listarFacturas({
    proveedorId,
    estado: "PENDIENTE",
    limit: 200,
  });
  const parciales = await cuentasPagarService.listarFacturas({
    proveedorId,
    estado: "PAGADA_PARCIAL",
    limit: 200,
  });
  const todas = [...facturas, ...parciales].sort(
    (a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime(),
  );
  return NextResponse.json(todas);
}
