import { requirePermission } from "@/lib/auth-helpers";
import { facturacionService, generarFacturaPdf } from "@/lib/modules/facturacion";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("facturacion:leer");
  const { id } = await params;
  const f = await facturacionService.obtener(id);
  if (!f) return new Response("Factura no encontrada.", { status: 404 });

  const pdf = generarFacturaPdf(f);
  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  const nombre = `Factura_${f.serieFolio}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, "_");

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      // Sin "attachment" se abre en el navegador (para imprimir); con ?descargar=1 se baja.
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
