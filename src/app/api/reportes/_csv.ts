// Helper para exportar reportes a CSV desde los route handlers.
// Valores numéricos en crudo (sin formato de moneda) y fechas ISO yyyy-mm-dd, para
// que se usen directo en Excel/Sheets. BOM UTF-8 para que Excel respete los acentos.

type Celda = string | number | null | undefined;

function escapar(v: Celda): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], filas: Celda[][]): string {
  const lineas = [headers, ...filas].map((f) => f.map(escapar).join(","));
  return "﻿" + lineas.join("\r\n") + "\r\n";
}

export function fechaIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function csvResponse(csv: string, filename: string): Response {
  const safe = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "no-store",
    },
  });
}
