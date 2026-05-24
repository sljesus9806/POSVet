// API pública del módulo Inventario.

export {
  inventarioService,
  StockInsuficienteError,
  InventarioNoEncontradoError,
} from "./service";

export {
  ajustarStockSchema,
  crearTransferenciaSchema,
  definirStockMinimoSchema,
  registrarEntradaSchema,
  motivoAjusteSchema,
} from "./schemas";

export type {
  AjustarStockInput,
  CrearTransferenciaInput,
  DefinirStockMinimoInput,
  RegistrarEntradaInput,
} from "./schemas";

export type {
  StockPorUbicacion,
  StockProductoResumen,
  MovimientoListado,
  AlertaBajoStock,
  AlertaCaducidad,
  TransferenciaListado,
  TipoMovimiento,
  MotivoMovimiento,
  EstadoTransferencia,
} from "./types";

export {
  INVENTARIO_EVENTS,
  type MovimientoPayload,
  type BajoStockPayload,
  type PorCaducarPayload,
  type TransferenciaCreadaPayload,
  type TransferenciaCompletadaPayload,
} from "./events";
