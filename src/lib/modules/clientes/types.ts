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
