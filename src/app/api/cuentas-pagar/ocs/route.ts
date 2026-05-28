import { NextResponse } from "next/server";
import { prisma } from "@/lib/modules/shared/db";
import { requirePermission } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  await requirePermission("cuentas-pagar:leer");
  const url = new URL(req.url);
  const proveedorId = url.searchParams.get("proveedorId");
  if (!proveedorId) return NextResponse.json([], { status: 200 });

  const ocs = await prisma.ordenCompra.findMany({
    where: {
      proveedorId,
      estado: { in: ["ENVIADA", "RECIBIDA_PARCIAL", "RECIBIDA_TOTAL"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      folio: true,
      subtotal: true,
      iva: true,
      total: true,
    },
  });
  return NextResponse.json(
    ocs.map((o) => ({
      id: o.id,
      folio: o.folio,
      subtotal: Number(o.subtotal.toString()),
      iva: Number(o.iva.toString()),
      total: Number(o.total.toString()),
    })),
  );
}
