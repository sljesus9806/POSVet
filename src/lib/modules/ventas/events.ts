// Eventos emitidos por el módulo Ventas.

import type { TipoPrecio } from "@prisma/client";

export const VENTA_EVENTS = {
  CAJA_ABIERTA: "caja.abierta",
  CAJA_CERRADA: "caja.cerrada",
  CREADA: "venta.creada",
  CANCELADA: "venta.cancelada",
} as const;

export type CajaAbiertaPayload = {
  cajaId: string;
  folio: string;
  ubicacionId: string;
  usuarioId: string;
  fondoInicial: number;
};

export type CajaCerradaPayload = {
  cajaId: string;
  folio: string;
  usuarioId: string;
  totalVendido: number;
  montoEsperadoEfectivo: number;
  montoContadoEfectivo: number;
  diferenciaEfectivo: number;
};

// Línea consumida por inventario para descontar stock.
export type VentaLineaPayload = {
  productoId: string;
  loteId: string | null;
  cantidad: number;
};

export type VentaCreadaPayload = {
  ventaId: string;
  folio: string;
  cajaId: string;
  ubicacionId: string;
  usuarioId: string;
  clienteId: string | null;
  tipoPrecio: TipoPrecio;
  total: number;
  lineas: VentaLineaPayload[];
};

export type VentaCanceladaPayload = {
  ventaId: string;
  folio: string;
  ubicacionId: string;
  usuarioId: string;
  motivo: string;
  // Líneas a devolver al stock
  lineas: VentaLineaPayload[];
};
