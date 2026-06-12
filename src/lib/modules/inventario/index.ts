// API pública del módulo Inventario.

// Nota: inventarioService expone `aplicarSalidaPorVenta` y
// `aplicarEntradaPorCancelacionVenta` que reciben una `Prisma.TransactionClient`
// del caller. Esto permite al módulo de ventas descontar/restaurar stock dentro
// de su misma transacción, garantizando atomicidad (la venta y su movimiento de
// kardex comparten commit). Es preferible a un listener asíncrono sobre el
// event-bus, que no es transaccional.
export {
  inventarioService,
  StockInsuficienteError,
  InventarioNoEncontradoError,
} from "./service";

export {
  abrirEmpaqueSchema,
  ajustarStockSchema,
  crearTransferenciaSchema,
  definirStockMinimoSchema,
  registrarEntradaSchema,
  motivoAjusteSchema,
} from "./schemas";

export type {
  AbrirEmpaqueInput,
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
