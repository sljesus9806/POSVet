// Eventos emitidos por el módulo Facturación.

export const FACTURA_EVENTS = {
  TIMBRADA: "factura.timbrada",
  CANCELADA: "factura.cancelada",
} as const;

export type FacturaTimbradaPayload = {
  facturaId: string;
  serieFolio: string;
  uuid: string | null;
  ventaId: string | null;
  receptorRfc: string;
  total: number;
  usuarioId: string;
  esDemo: boolean;
};

export type FacturaCanceladaPayload = {
  facturaId: string;
  serieFolio: string;
  uuid: string | null;
  motivo: string;
  usuarioId: string;
};
