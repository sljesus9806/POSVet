import type { EstadoClienteAbono, FormaPagoAbono } from "@prisma/client";

export type VentaCreditoListado = {
  ventaId: string;
  folio: string;
  fechaVenta: Date;
  total: number;
  montoCredito: number;
  saldoCredito: number;
  diasDesdeVenta: number;
  clienteId: string;
  clienteNombre: string;
};

export type AbonoListado = {
  id: string;
  folio: string;
  clienteId: string;
  clienteNombre: string;
  fecha: Date;
  formaPago: FormaPagoAbono;
  monto: number;
  estado: EstadoClienteAbono;
  totalAplicaciones: number;
};

export type AbonoDetalle = {
  id: string;
  folio: string;
  clienteId: string;
  clienteNombre: string;
  fecha: Date;
  formaPago: FormaPagoAbono;
  monto: number;
  referencia: string | null;
  observaciones: string | null;
  estado: EstadoClienteAbono;
  motivoCancelacion: string | null;
  canceladoEn: Date | null;
  usuarioNombre: string;
  aplicaciones: Array<{
    id: string;
    ventaId: string;
    ventaFolio: string;
    monto: number;
  }>;
};

export type EstadoCuentaCliente = {
  clienteId: string;
  clienteCodigo: string;
  clienteNombre: string;
  lineaCredito: number;
  saldoActual: number;
  disponible: number;
  diasCredito: number;
  ventasCredito: VentaCreditoListado[];
  abonosRecientes: AbonoListado[];
};

export type ResumenCobranza = {
  totalPorCobrar: number;
  clientesConSaldo: number;
};
