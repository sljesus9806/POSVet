// Representación impresa del CFDI (PDF), generada al vuelo con jsPDF + autoTable.
// El documento fiscal es el XML; este PDF es la versión legible para entregar o
// imprimir. Se ejecuta en el servidor (route handler) y devuelve un Buffer.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FORMAS_PAGO,
  METODOS_PAGO,
  REGIMENES_FISCALES,
  USOS_CFDI,
} from "./catalogos";
import type { FacturaDetalle } from "./types";

const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fechaHora = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d) : "—";

function label(items: { clave: string; descripcion: string }[], clave: string): string {
  return items.find((i) => i.clave === clave)?.descripcion ?? clave;
}

export function generarFacturaPdf(f: FacturaDetalle): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 44;

  // Marcas de estado.
  if (f.esDemo) {
    doc.setFontSize(9);
    doc.setTextColor(180, 80, 0);
    doc.text("DOCUMENTO DE PRUEBA (DEMO) — SIN VALIDEZ FISCAL", pageW / 2, 24, { align: "center" });
  }
  if (f.estado === "CANCELADA") {
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(40);
    doc.setFont("helvetica", "bold");
    doc.text("CANCELADA", pageW / 2, 360, { align: "center", angle: 18 });
  }

  // Encabezado: emisor + folio fiscal.
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(f.emisorNombre, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70);
  y += 16;
  doc.text(`RFC: ${f.emisorRfc}`, margin, y);
  doc.text(`Régimen: ${f.emisorRegimen}`, margin, y + 12);
  doc.text(`Lugar de expedición (CP): ${f.lugarExpedicion}`, margin, y + 24);

  // Bloque derecho: tipo de comprobante + serie/folio + UUID.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text("Factura (CFDI 4.0 — Ingreso)", pageW - margin, 44, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text(`Serie-Folio: ${f.serie}-${f.folio}`, pageW - margin, 60, { align: "right" });
  doc.text(`Folio fiscal (UUID):`, pageW - margin, 74, { align: "right" });
  doc.setFontSize(7.5);
  doc.text(f.uuid ?? "—", pageW - margin, 84, { align: "right" });
  doc.setFontSize(9);
  doc.text(`Fecha de timbrado: ${fechaHora(f.fechaTimbrado)}`, pageW - margin, 98, { align: "right" });

  y += 44;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // Receptor.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("Receptor", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70);
  y += 14;
  doc.text(`Nombre / Razón social: ${f.receptorNombre}`, margin, y);
  y += 12;
  doc.text(`RFC: ${f.receptorRfc}`, margin, y);
  doc.text(`CP: ${f.receptorCp}`, margin + 200, y);
  y += 12;
  doc.text(`Régimen: ${label(REGIMENES_FISCALES, f.receptorRegimen)}`, margin, y);
  y += 12;
  doc.text(`Uso de CFDI: ${label(USOS_CFDI, f.receptorUsoCfdi)}`, margin, y);
  y += 12;
  doc.text(
    `Forma de pago: ${label(FORMAS_PAGO, f.formaPago)}   ·   Método: ${label(METODOS_PAGO, f.metodoPago)}`,
    margin,
    y,
  );
  y += 16;

  // Conceptos.
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Cant.", "Clave SAT", "Descripción", "P. unit.", "Desc.", "IVA", "Importe"]],
    body: f.lineas.map((l) => [
      String(l.cantidad),
      l.claveProdServ,
      l.descripcion,
      mxn(l.valorUnitario),
      mxn(l.descuento),
      mxn(l.ivaImporte),
      mxn(l.importe),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [40, 40, 40], halign: "center" },
    columnStyles: {
      0: { halign: "right", cellWidth: 38 },
      1: { halign: "center", cellWidth: 62 },
      3: { halign: "right", cellWidth: 60 },
      4: { halign: "right", cellWidth: 50 },
      5: { halign: "right", cellWidth: 55 },
      6: { halign: "right", cellWidth: 65 },
    },
  });

  // Totales. (autoTable agrega `lastAutoTable` en runtime; mismo cast que reportes.)
  let afterY: number =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  afterY += 16;
  const totX = pageW - margin;
  const labX = pageW - margin - 150;
  doc.setFontSize(9);
  doc.setTextColor(40);
  const fila = (lbl: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(lbl, labX, afterY);
    doc.text(val, totX, afterY, { align: "right" });
    afterY += 14;
  };
  fila("Subtotal", mxn(f.subtotal));
  if (f.descuento > 0) fila("Descuento", `- ${mxn(f.descuento)}`);
  fila("IVA", mxn(f.iva));
  fila("Total", mxn(f.total), true);

  // Sellos (resumen, truncado).
  afterY += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(90);
  doc.text("Sellos digitales", margin, afterY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  afterY += 10;
  const wrap = (txt: string) => doc.splitTextToSize(txt, pageW - margin * 2);
  doc.text(wrap(`No. Certificado SAT: ${f.noCertificadoSat ?? "—"}`), margin, afterY);
  afterY += 10;
  doc.text(wrap(`Sello CFDI: ${(f.selloCfd ?? "—").slice(0, 180)}`), margin, afterY);
  afterY += 16;
  doc.text(wrap(`Sello SAT: ${(f.selloSat ?? "—").slice(0, 180)}`), margin, afterY);

  // Pie.
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text(
    "Este documento es una representación impresa de un CFDI.",
    pageW / 2,
    doc.internal.pageSize.getHeight() - 24,
    { align: "center" },
  );

  return Buffer.from(doc.output("arraybuffer"));
}
