// API pública del módulo Compras (Órdenes de Compra y Recepciones).
// Otros módulos SOLO deben importar desde este archivo.

export {
  comprasService,
  OrdenCompraNoEncontradaError,
  TransicionOcInvalidaError,
  RecepcionExcedeOcError,
  RecepcionVaciaError,
} from "./service";

export {
  crearOrdenCompraSchema,
  enviarOrdenCompraSchema,
  cancelarOrdenCompraSchema,
  registrarRecepcionSchema,
} from "./schemas";

export type {
  CrearOrdenCompraInput,
  EnviarOrdenCompraInput,
  CancelarOrdenCompraInput,
  RegistrarRecepcionInput,
  LineaOcInput,
  LineaRecepcionInput,
} from "./schemas";

export type {
  OrdenCompraListado,
  OrdenCompraDetalle,
  OrdenCompraLinea,
  RecepcionResumen,
  RecepcionDetalle,
  RecepcionLineaDetalle,
  CatalogoSugerencia,
} from "./types";

export {
  COMPRA_EVENTS,
  type OcCreadaPayload,
  type OcEnviadaPayload,
  type OcCanceladaPayload,
  type CompraRecibidaPayload,
} from "./events";
