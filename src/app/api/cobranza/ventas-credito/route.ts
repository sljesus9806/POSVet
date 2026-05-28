import { NextResponse } from "next/server";
import { cobranzaService } from "@/lib/modules/cobranza";
import { requirePermission } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  await requirePermission("cobranza:leer");
  const url = new URL(req.url);
  const clienteId = url.searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json([], { status: 200 });
  const ventas = await cobranzaService.listarVentasCredito({
    clienteId,
    soloPendientes: true,
    limit: 200,
  });
  return NextResponse.json(ventas);
}
