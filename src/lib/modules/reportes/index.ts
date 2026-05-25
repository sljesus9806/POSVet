// API pública del módulo Reportes.
// Otros módulos SOLO deben importar desde este archivo.

export { reportesService } from "./service";

export { filtroReporteSchema } from "./schemas";
export type { FiltroReporteInput, FiltroReporteData } from "./schemas";

export type {
  RangoFechas,
  VentasDelDiaReporte,
  ProductosVendidosReporte,
  ProductosVendidosFila,
  VentasPorUsuarioReporte,
  VentasPorUsuarioFila,
} from "./types";
