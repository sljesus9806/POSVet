// API pública del módulo Facturación (CFDI 4.0).
// Otros módulos SOLO deben importar desde este archivo.

export {
  facturacionService,
  PacError,
  VentaParaFacturarNoEncontradaError,
  VentaNoFacturableError,
  VentaYaFacturadaError,
  DescuentoGlobalNoSoportadoError,
  DatosFiscalesEmpresaIncompletosError,
  FacturaNoEncontradaError,
  FacturaYaCanceladaError,
} from "./service";

export {
  emitirFacturaSchema,
  cancelarFacturaSchema,
  type EmitirFacturaInput,
  type CancelarFacturaInput,
} from "./schemas";

export type {
  FacturaListado,
  FacturaDetalle,
  FacturaLineaItem,
  ReceptorFiscal,
  EstadoFactura,
  TipoCfdi,
} from "./types";

export {
  USOS_CFDI,
  REGIMENES_FISCALES,
  FORMAS_PAGO,
  METODOS_PAGO,
  MOTIVOS_CANCELACION,
  RFC_PUBLICO_GENERAL,
  formaPagoVentaASat,
  type CatalogoItem,
} from "./catalogos";

export { generarFacturaPdf } from "./pdf";

export {
  FACTURA_EVENTS,
  type FacturaTimbradaPayload,
  type FacturaCanceladaPayload,
} from "./events";

export { getFacturacionConfig } from "./pac";
