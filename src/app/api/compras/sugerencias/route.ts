import { NextResponse } from "next/server";
import { comprasService } from "@/lib/modules/compras";
import { requirePermission } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  await requirePermission("compras:leer");
  const url = new URL(req.url);
  const proveedorId = url.searchParams.get("proveedorId");
  if (!proveedorId) return NextResponse.json([], { status: 200 });
  const data = await comprasService.sugerenciasDeProveedor(proveedorId);
  return NextResponse.json(data);
}
