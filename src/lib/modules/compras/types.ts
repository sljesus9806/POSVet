import type { EstadoOrdenCompra } from "@prisma/client";

export type OrdenCompraListado = {
  id: string;
  folio: string;
  fecha: Date;
  proveedorId: string | null;
  proveedorNombre: string | null;
  ubicacionDestinoNombre: string;
  estado: EstadoOrdenCompra;
  total: number;
  totalLineas: number;
  lineasCompletas: number; // líneas con cantidadRecibida >= cantidadSolicitada
};

export type OrdenCompraLinea = {
  id: string;
  productoId: string;
  productoSku: string;
  productoNombre: string;
  unidadMedida: string;
  codigoProveedor: string | null;
  cantidadSolicitada: number;
  cantidadRecibida: number;
  cantidadPendiente: number;
  costoUnitario: number;
  ivaTasa: number;
  subtotal: number;
  ivaImporte: number;
  total: number;
};

export type OrdenCompraDetalle = {
  id: string;
  folio: string;
  proveedorId: string | null;
  proveedorNombre: string | null;
  ubicacionDestinoId: string;
  ubicacionDestinoNombre: string;
  estado: EstadoOrdenCompra;
  preciosIncluyenIva: boolean;
  subtotal: number;
  iva: number;
  total: number;
  observaciones: string | null;
  fechaEsperada: Date | null;
  enviadaEn: Date | null;
  cerradaEn: Date | null;
  motivoCancelacion: string | null;
  canceladaEn: Date | null;
  usuarioNombre: string;
  lineas: OrdenCompraLinea[];
  recepciones: RecepcionResumen[];
  createdAt: Date;
  updatedAt: Date;
};

export type RecepcionResumen = {
  id: string;
  folio: string;
  fecha: Date;
  usuarioNombre: string;
  totalLineas: number;
  observaciones: string | null;
};

export type RecepcionLineaDetalle = {
  id: string;
  ocLineaId: string;
  productoId: string;
  productoSku: string;
  productoNombre: string;
  unidadMedida: string;
  cantidad: number;
  costoUnitario: number;
  lote: string | null;
  caducidad: Date | null;
  loteId: string | null;
};

export type RecepcionDetalle = {
  id: string;
  folio: string;
  fecha: Date;
  ordenCompraId: string;
  ordenCompraFolio: string;
  proveedorNombre: string | null;
  ubicacionId: string;
  ubicacionNombre: string;
  usuarioNombre: string;
  observaciones: string | null;
  lineas: RecepcionLineaDetalle[];
};

// Sugerencia para el formulario de OC: línea pre-llenada desde el catálogo
// del proveedor.
export type CatalogoSugerencia = {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  codigoProveedor: string | null;
  costoUnitario: number;
  ivaAplicable: number;
};
