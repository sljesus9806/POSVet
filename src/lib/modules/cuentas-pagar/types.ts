import type { EstadoFacturaProveedor, EstadoProveedorPago, FormaPagoProveedor } from "@prisma/client";

export type FacturaListado = {
  id: string;
  folio: string;
  folioProveedor: string;
  proveedorId: string;
  proveedorNombre: string;
  fechaEmision: Date;
  fechaVencimiento: Date;
  diasParaVencer: number; // negativo si ya venció
  total: number;
  saldo: number;
  estado: EstadoFacturaProveedor;
  ordenCompraFolio: string | null;
};

export type AplicacionDetalle = {
  id: string;
  pagoId: string;
  pagoFolio: string;
  pagoFecha: Date;
  pagoEstado: EstadoProveedorPago;
  formaPago: FormaPagoProveedor;
  monto: number;
};

export type FacturaDetalle = {
  id: string;
  folio: string;
  folioProveedor: string;
  proveedorId: string;
  proveedorNombre: string;
  ordenCompraId: string | null;
  ordenCompraFolio: string | null;
  fechaEmision: Date;
  fechaVencimiento: Date;
  subtotal: number;
  iva: number;
  total: number;
  saldo: number;
  estado: EstadoFacturaProveedor;
  observaciones: string | null;
  motivoCancelacion: string | null;
  canceladaEn: Date | null;
  usuarioNombre: string;
  aplicaciones: AplicacionDetalle[];
  createdAt: Date;
  updatedAt: Date;
};

export type PagoListado = {
  id: string;
  folio: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: Date;
  formaPago: FormaPagoProveedor;
  monto: number;
  estado: EstadoProveedorPago;
  totalAplicaciones: number;
};

export type PagoDetalle = {
  id: string;
  folio: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: Date;
  formaPago: FormaPagoProveedor;
  monto: number;
  referencia: string | null;
  observaciones: string | null;
  estado: EstadoProveedorPago;
  motivoCancelacion: string | null;
  canceladoEn: Date | null;
  usuarioNombre: string;
  aplicaciones: Array<{
    id: string;
    facturaId: string;
    facturaFolio: string;
    folioProveedor: string;
    monto: number;
  }>;
};

export type EstadoCuentaProveedor = {
  proveedorId: string;
  proveedorCodigo: string;
  proveedorNombre: string;
  saldoActual: number;
  totalFacturado: number;
  totalPagado: number;
  facturasPendientes: FacturaListado[];
  pagosRecientes: PagoListado[];
};

export type ResumenCxP = {
  totalPorPagar: number;
  vencidasMonto: number;
  vencidasCount: number;
  porVencer30dMonto: number;
  porVencer30dCount: number;
};
