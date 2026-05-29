// Eventos del módulo Cobranza.

export const COBRANZA_EVENTS = {
  ABONO_REGISTRADO: "cobranza.abono.registrado",
  ABONO_CANCELADO: "cobranza.abono.cancelado",
  VENTA_SALDADA: "cobranza.venta.saldada",
} as const;

export type AbonoRegistradoPayload = {
  abonoId: string;
  folio: string;
  clienteId: string;
  monto: number;
  aplicaciones: Array<{ ventaId: string; monto: number }>;
  usuarioId: string;
};

export type AbonoCanceladoPayload = {
  abonoId: string;
  folio: string;
  clienteId: string;
  motivo: string;
  usuarioId: string;
};

export type VentaSaldadaPayload = {
  ventaId: string;
  folio: string;
  clienteId: string;
  montoCredito: number;
};
