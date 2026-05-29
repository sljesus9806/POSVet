// Helper para generar PDFs de reportes con jsPDF + autoTable.
// Se ejecuta en el servidor (route handlers); devuelve Buffer.

import { jsPDF } from "jspdf";
import autoTable, { type CellInput, type RowInput, type CellDef } from "jspdf-autotable";

export type PdfColumna = {
  header: string;
  align?: "left" | "right" | "center";
  width?: number; // ancho en puntos (opcional)
};

export type PdfTotalLinea = { label: string; valor: string };

export type GenerarPdfInput = {
  empresa: {
    razonSocial: string;
    rfc?: string | null;
  };
  titulo: string;
  subtitulo?: string | null;
  rango?: { desde: Date; hasta: Date } | null;
  ubicacionNombre?: string | null;
  columnas: PdfColumna[];
  filas: CellInput[][];
  totales?: PdfTotalLinea[];
  notas?: string[];
};

const FMT_FECHA_LARGA = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const FMT_FECHA = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
});

function dibujarEncabezado(doc: jsPDF, input: GenerarPdfInput) {
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.empresa.razonSocial, 14, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (input.empresa.rfc) {
    const rfcText = `RFC: ${input.empresa.rfc}`;
    doc.text(rfcText, pageW - 14, y, { align: "right" });
  }
  y += 6;

  // Línea separadora
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  // Título del reporte
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(input.titulo, 14, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const generado = `Generado: ${FMT_FECHA_LARGA.format(new Date())}`;
  doc.text(generado, pageW - 14, y, { align: "right" });
  y += 5;

  // Subtítulo / rango / ubicación
  doc.setFontSize(9);
  doc.setTextColor(90);
  const meta: string[] = [];
  if (input.subtitulo) meta.push(input.subtitulo);
  if (input.rango)
    meta.push(
      `Rango: ${FMT_FECHA.format(input.rango.desde)} → ${FMT_FECHA.format(input.rango.hasta)}`,
    );
  if (input.ubicacionNombre) meta.push(`Ubicación: ${input.ubicacionNombre}`);
  if (meta.length) {
    doc.text(meta.join("  ·  "), 14, y);
    y += 4;
  }
  doc.setTextColor(0);

  return y + 2;
}

function dibujarPiePagina(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(`Página ${i} de ${totalPages}`, pageW - 14, pageH - 8, {
      align: "right",
    });
    doc.text("POSVet", 14, pageH - 8);
  }
  doc.setTextColor(0);
}

export function generarReportePDF(input: GenerarPdfInput): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const startY = dibujarEncabezado(doc, input);

  const head: RowInput[] = [
    input.columnas.map((c) => ({
      content: c.header,
      styles: { halign: c.align ?? "left", fontStyle: "bold" },
    })),
  ];

  const body: RowInput[] = input.filas.map((row) =>
    row.map((cell, i): CellDef => {
      const col = input.columnas[i];
      if (typeof cell === "object" && cell !== null && "content" in cell) {
        return cell as CellDef;
      }
      return { content: cell as string | number, styles: { halign: col?.align ?? "left" } };
    }),
  );

  autoTable(doc, {
    startY,
    head,
    body,
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // azul cielo
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { left: 14, right: 14 },
    columnStyles: input.columnas.reduce(
      (acc, c, i) => {
        if (c.width) acc[i] = { cellWidth: c.width };
        return acc;
      },
      {} as Record<number, { cellWidth: number }>,
    ),
  });

  // Totales al pie
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? startY;
  let y = finalY + 6;
  if (input.totales && input.totales.length > 0) {
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    for (const t of input.totales) {
      doc.text(`${t.label}: ${t.valor}`, pageW - 14, y, { align: "right" });
      y += 5;
    }
  }

  if (input.notas && input.notas.length > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(110);
    for (const n of input.notas) {
      doc.text(n, 14, y);
      y += 4;
    }
    doc.setTextColor(0);
  }

  dibujarPiePagina(doc);

  const out = doc.output("arraybuffer");
  return Buffer.from(out);
}

export function pdfResponse(
  buf: Buffer,
  filename: string,
): Response {
  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const blob = new Uint8Array(buf);
  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}

// Formateadores compartidos
export const fmt = {
  mxn: (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(n),
  num: (n: number, dec = 0) =>
    new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    }).format(n),
  fecha: (d: Date) => FMT_FECHA.format(d),
  fechaHora: (d: Date) => FMT_FECHA_LARGA.format(d),
};
