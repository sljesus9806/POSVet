// API pública del módulo Ventas.
// Otros módulos SOLO deben importar desde este archivo.

export {
  ventasService,
  CajaYaAbiertaError,
  CajaNoAbiertaError,
  CajaNoEncontradaError,
  VentaNoEncontradaError,
  VentaYaCanceladaError,
  PagoInsuficienteError,
  CambioSoloEfectivoError,
  ProductoSinPrecioError,
  StockInsuficienteError,
} from "./service";

export {
  abrirCajaSchema,
  cerrarCajaSchema,
  crearVentaSchema,
  cancelarVentaSchema,
  formaPagoSchema,
  formaPagoMvpSchema,
} from "./schemas";

export type {
  AbrirCajaInput,
  CerrarCajaInput,
  CrearVentaInput,
  CancelarVentaInput,
} from "./schemas";

export type {
  CajaListado,
  CajaDetalle,
  VentaListado,
  VentaDetalle,
  VentaLineaListado,
  VentaPagoListado,
  ProductoVendible,
  EstadoCaja,
  EstadoVenta,
  FormaPago,
  TipoPrecio,
} from "./types";

export {
  VENTA_EVENTS,
  type CajaAbiertaPayload,
  type CajaCerradaPayload,
  type VentaCreadaPayload,
  type VentaCanceladaPayload,
  type VentaLineaPayload,
} from "./events";
