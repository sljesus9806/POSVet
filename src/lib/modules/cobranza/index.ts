// API pública del módulo Cobranza.
// Otros módulos SOLO deben importar desde este archivo.

export {
  cobranzaService,
  AbonoNoEncontradoError,
  AbonoCanceladoError,
  VentaNoCreditoError,
  VentaDistintoClienteError,
  AplicacionExcedeSaldoVentaError,
  DistribucionInvalidaError,
} from "./service";

export {
  registrarAbonoSchema,
  cancelarAbonoSchema,
  aplicacionAbonoSchema,
  formaPagoAbonoSchema,
} from "./schemas";

export type {
  RegistrarAbonoInput,
  CancelarAbonoInput,
  AplicacionAbonoInput,
  FormaPagoAbonoInput,
} from "./schemas";

export type {
  AbonoListado,
  AbonoDetalle,
  VentaCreditoListado,
  EstadoCuentaCliente,
  ResumenCobranza,
} from "./types";

export {
  COBRANZA_EVENTS,
  type AbonoRegistradoPayload,
  type AbonoCanceladoPayload,
  type VentaSaldadaPayload,
} from "./events";
