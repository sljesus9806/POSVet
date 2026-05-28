// Eventos del módulo Cuentas por Pagar.

export const CUENTAS_PAGAR_EVENTS = {
  FACTURA_CAPTURADA: "cxp.factura.capturada",
  FACTURA_CANCELADA: "cxp.factura.cancelada",
  FACTURA_PAGADA: "cxp.factura.pagada",
  PAGO_REGISTRADO: "cxp.pago.registrado",
  PAGO_CANCELADO: "cxp.pago.cancelado",
} as const;

export type FacturaCapturadaPayload = {
  facturaId: string;
  folio: string;
  proveedorId: string;
  total: number;
  ordenCompraId: string | null;
  usuarioId: string;
};

export type FacturaCanceladaPayload = {
  facturaId: string;
  folio: string;
  proveedorId: string;
  motivo: string;
  usuarioId: string;
};

export type FacturaPagadaPayload = {
  facturaId: string;
  folio: string;
  proveedorId: string;
  total: number;
};

export type PagoRegistradoPayload = {
  pagoId: string;
  folio: string;
  proveedorId: string;
  monto: number;
  aplicaciones: Array<{ facturaId: string; monto: number }>;
  usuarioId: string;
};

export type PagoCanceladoPayload = {
  pagoId: string;
  folio: string;
  proveedorId: string;
  motivo: string;
  usuarioId: string;
};
