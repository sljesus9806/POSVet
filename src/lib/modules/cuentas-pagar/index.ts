// API pública del módulo Cuentas por Pagar.
// Otros módulos SOLO deben importar desde este archivo.

export {
  cuentasPagarService,
  FacturaNoEncontradaError,
  FacturaDuplicadaError,
  FacturaCanceladaError,
  FacturaConPagosError,
  PagoNoEncontradoError,
  PagoCanceladoError,
  DistribucionInvalidaError,
  AplicacionExcedeSaldoError,
  FacturaDistintoProveedorError,
} from "./service";

export {
  registrarFacturaSchema,
  cancelarFacturaSchema,
  registrarPagoSchema,
  cancelarPagoSchema,
  aplicacionPagoSchema,
  formaPagoSchema,
} from "./schemas";

export type {
  RegistrarFacturaInput,
  CancelarFacturaInput,
  RegistrarPagoInput,
  CancelarPagoInput,
  AplicacionPagoInput,
  FormaPagoInput,
} from "./schemas";

export type {
  FacturaListado,
  FacturaDetalle,
  PagoListado,
  PagoDetalle,
  EstadoCuentaProveedor,
  ResumenCxP,
  AplicacionDetalle,
} from "./types";

export {
  CUENTAS_PAGAR_EVENTS,
  type FacturaCapturadaPayload,
  type FacturaCanceladaPayload,
  type FacturaPagadaPayload,
  type PagoRegistradoPayload,
  type PagoCanceladoPayload,
} from "./events";
