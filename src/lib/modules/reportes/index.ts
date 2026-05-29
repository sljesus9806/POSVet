// API pública del módulo Reportes.

export { reportesService } from "./service";

export {
  filtroReporteSchema,
  filtroInventarioActualSchema,
  filtroCaducidadSchema,
  filtroSinMovimientoSchema,
} from "./schemas";

export type {
  FiltroReporteInput,
  FiltroReporteData,
  FiltroInventarioActualInput,
  FiltroCaducidadInput,
  FiltroSinMovimientoInput,
} from "./schemas";

export type {
  RangoFechas,
  VentasDelDiaReporte,
  ProductosVendidosReporte,
  ProductosVendidosFila,
  VentasPorUsuarioReporte,
  VentasPorUsuarioFila,
  InventarioActualReporte,
  InventarioActualFila,
  InventarioActualPorCategoria,
  ProductosPorCaducarReporte,
  ProductoPorCaducarFila,
  CaducidadBucket,
  AntiguedadSaldosReporte,
  AntiguedadCxCFila,
  AntiguedadCxPFila,
  AntiguedadBucket,
  ProductosSinMovimientoReporte,
  ProductoSinMovimientoFila,
} from "./types";

export { generarReportePDF, pdfResponse, fmt as pdfFmt } from "./pdf";
export type { GenerarPdfInput, PdfColumna, PdfTotalLinea } from "./pdf";
