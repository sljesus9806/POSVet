import type { TipoCliente, TipoPrecio } from "@prisma/client";

export type { TipoCliente, TipoPrecio };

export type ClienteListado = {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  tipoCliente: TipoCliente;
  tipoPrecioEfectivo: TipoPrecio;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  // Crédito: lineaCredito >0 = autorizado a crédito, saldoActual = lo que debe.
  // disponible = max(0, lineaCredito - saldoActual). Cero implica sin crédito.
  lineaCredito: number;
  saldoActual: number;
  diasCredito: number;
};

export type ClienteDetalle = ClienteListado & {
  regimenFiscal: string | null;
  usoCFDI: string | null;
  codigoPostal: string | null;
  notas: string | null;
  tipoPrecio: TipoPrecio | null; // override explícito; null = derivado
  createdAt: Date;
  updatedAt: Date;
};

// Convención de UI para pintar crédito disponible en POS:
// disponible = max(0, lineaCredito - saldoActual). Si <= 0, ocultar opción de pago a crédito.
