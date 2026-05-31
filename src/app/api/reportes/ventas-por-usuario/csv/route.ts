import { requirePermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { csvResponse, toCsv } from "../../_csv";
import { rangoFromSearch } from "../../_search";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const rango = rangoFromSearch(new URL(req.url).searchParams);
  const reporte = await reportesService.ventasPorUsuario(rango);

  const csv = toCsv(
    ["Usuario", "Tickets", "Ticket promedio", "Total"],
    reporte.filas.map((f) => [f.usuarioNombre, f.numTickets, f.ticketPromedio, f.total]),
  );
  return csvResponse(csv, "ventas-por-usuario.csv");
}
