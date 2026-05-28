// Eventos emitidos por el módulo Compras.

export const COMPRA_EVENTS = {
  OC_CREADA: "compra.oc.creada",
  OC_ENVIADA: "compra.oc.enviada",
  OC_CANCELADA: "compra.oc.cancelada",
  RECIBIDA: "compra.recibida",
} as const;

export type OcCreadaPayload = {
  ordenCompraId: string;
  folio: string;
  proveedorId: string;
  total: number;
  usuarioId: string;
};

export type OcEnviadaPayload = {
  ordenCompraId: string;
  folio: string;
  usuarioId: string;
};

export type OcCanceladaPayload = {
  ordenCompraId: string;
  folio: string;
  motivo: string;
  usuarioId: string;
};

// Una recepción puede contener varias líneas; este payload incluye solo el
// resumen. Inventario consume `lineas` para aplicar las entradas reales.
export type CompraRecibidaPayload = {
  recepcionId: string;
  folio: string;
  ordenCompraId: string;
  ordenCompraFolio: string;
  ubicacionId: string;
  usuarioId: string;
  lineas: Array<{
    recepcionLineaId: string;
    productoId: string;
    cantidad: number;
    costoUnitario: number;
    loteId: string | null;
  }>;
};
