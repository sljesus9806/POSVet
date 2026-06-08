import { prisma } from "@/lib/modules/shared/db";
import { ventasService } from "@/lib/modules/ventas";
import { requirePermission } from "@/lib/auth-helpers";
import { generarTicketPdf } from "./ticket-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("ventas:leer");
  const { id } = await params;
  const v = await ventasService.obtenerVenta(id);
  if (!v) return new Response("Venta no encontrada", { status: 404 });

  const empresa = await prisma.empresa.findFirst({
    where: { activa: true },
    select: { razonSocial: true, rfc: true, direccion: true, telefono: true },
  });

  const pdf = generarTicketPdf(v, empresa);
  const nombre = `Recibo_${v.folio}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
