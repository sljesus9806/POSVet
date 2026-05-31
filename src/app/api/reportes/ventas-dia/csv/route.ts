import { requirePermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { csvResponse, toCsv } from "../../_csv";
import { rangoFromSearch } from "../../_search";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const rango = rangoFromSearch(new URL(req.url).searchParams);
  const reporte = await reportesService.ventasDelDia(rango);

  const csv = toCsv(
    ["Hora", "Tickets", "Total"],
    reporte.porHora.map((h) => [`${String(h.hora).padStart(2, "0")}:00`, h.numTickets, h.total]),
  );
  const fileName = `ventas-dia_${rango.desde.toISOString().slice(0, 10)}_${rango.hasta
    .toISOString()
    .slice(0, 10)}.csv`;
  return csvResponse(csv, fileName);
}
