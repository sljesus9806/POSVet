// Eventos emitidos por el módulo Inventario.

import type { MotivoMovimiento, TipoMovimiento } from "@prisma/client";

export const INVENTARIO_EVENTS = {
  MOVIMIENTO: "inventario.movimiento",
  BAJO_STOCK: "producto.bajo_stock",
  POR_CADUCAR: "producto.por_caducar",
  TRANSFERENCIA_CREADA: "inventario.transferencia_creada",
  TRANSFERENCIA_COMPLETADA: "inventario.transferencia_completada",
} as const;

export type MovimientoPayload = {
  movimientoId: string;
  productoId: string;
  ubicacionId: string;
  tipo: TipoMovimiento;
  motivo: MotivoMovimiento;
  cantidad: number;
  stockResultante: number;
  usuarioId: string;
};

export type BajoStockPayload = {
  productoId: string;
  ubicacionId: string;
  stock: number;
  stockMinimo: number;
};

export type PorCaducarPayload = {
  productoId: string;
  loteId: string;
  caducidad: Date;
  diasRestantes: number;
};

export type TransferenciaCreadaPayload = {
  transferenciaId: string;
  folio: string;
  origenId: string;
  destinoId: string;
  usuarioId: string;
};

export type TransferenciaCompletadaPayload = {
  transferenciaId: string;
  folio: string;
  usuarioId: string;
};
