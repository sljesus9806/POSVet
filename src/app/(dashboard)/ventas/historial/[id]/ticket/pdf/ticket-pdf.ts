// Genera el recibo (ticket 80mm) en PDF con jsPDF, para descargarlo desde el POS
// sin cambiar de pestaña. Refleja el mismo contenido que la vista de impresión.

import { jsPDF } from "jspdf";
import type { VentaDetalle } from "@/lib/modules/ventas";

export type EmpresaTicket = {
  razonSocial: string | null;
  rfc: string | null;
  direccion: string | null;
  telefono: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

export function generarTicketPdf(v: VentaDetalle, empresa: EmpresaTicket | null): Buffer {
  const W = 80; // ancho de rollo térmico (mm)
  const margin = 4;
  const right = W - margin;
  const cx = W / 2;
  // Altura estimada generosa para no recortar contenido (mejor sobrar que faltar).
  const alto = 70 + v.lineas.length * 12 + v.pagos.length * 5;
  const doc = new jsPDF({ unit: "mm", format: [W, alto] });
  let y = 6;

  function center(text: string, size = 8, bold = false) {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, cx, y, { align: "center" });
    y += size * 0.42 + 1.2;
  }
  function row(label: string, value: string, bold = false) {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(8);
    doc.text(label, margin, y);
    doc.text(value, right, y, { align: "right" });
    y += 4;
  }
  function divider() {
    doc.setLineWidth(0.1);
    doc.setLineDashPattern([0.6, 0.6], 0);
    doc.line(margin, y, right, y);
    doc.setLineDashPattern([], 0);
    y += 3;
  }

  center(empresa?.razonSocial ?? "Ligerito", 10, true);
  if (empresa?.rfc) center(`RFC: ${empresa.rfc}`, 7);
  if (empresa?.direccion) center(empresa.direccion, 7);
  if (empresa?.telefono) center(`Tel: ${empresa.telefono}`, 7);
  y += 1;
  divider();

  row("Ticket:", v.folio, true);
  row("Fecha:", v.fechaVenta.toLocaleString("es-MX"));
  row("Caja:", v.cajaFolio);
  row("Cajero:", v.usuarioNombre);
  if (v.clienteId) row("Cliente:", v.clienteNombre ?? v.clienteCodigo ?? "—");
  divider();

  for (const l of v.lineas) {
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    const nombre = doc.splitTextToSize(l.productoNombre, W - margin * 2 - 18) as string[];
    doc.text(nombre, margin, y);
    doc.text(fmt(l.total), right, y, { align: "right" });
    y += nombre.length * 3.4;
    const detalle =
      `${l.cantidad} ${l.unidadMedida} x ${fmt(l.precioUnitario)}` +
      (l.descuento > 0 ? ` - ${fmt(l.descuento)}` : "");
    doc.setFontSize(6.5);
    doc.text(detalle, margin, y);
    y += 4;
  }
  divider();

  row("Subtotal", fmt(v.subtotal));
  row("IVA", fmt(v.iva));
  if (v.descuentoLineas > 0) row("Desc. lineas", `- ${fmt(v.descuentoLineas)}`);
  if (v.descuentoGlobal > 0) row("Desc. global", `- ${fmt(v.descuentoGlobal)}`);
  row("TOTAL", fmt(v.total), true);
  divider();

  for (const p of v.pagos) row(p.forma, fmt(p.monto));
  row("Recibido", fmt(v.totalPagado));
  row("Cambio", fmt(v.cambio), true);
  divider();

  center("Gracias por su compra!", 8);
  if (v.estado === "CANCELADA") center("*** VENTA CANCELADA ***", 9, true);

  return Buffer.from(doc.output("arraybuffer"));
}
