import { requirePermission } from "@/lib/auth-helpers";
import { facturacionService } from "@/lib/modules/facturacion";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("facturacion:leer");
  const { id } = await params;
  const f = await facturacionService.obtenerXml(id);
  if (!f || !f.xml) {
    return new Response("Factura o XML no encontrado.", { status: 404 });
  }

  const nombre = `CFDI_${f.uuid ?? f.serieFolio}.xml`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return new Response(f.xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
