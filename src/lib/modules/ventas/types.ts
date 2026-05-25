import type { EstadoCaja, EstadoVenta, FormaPago, TipoPrecio } from "@prisma/client";

export type { EstadoCaja, EstadoVenta, FormaPago, TipoPrecio };

export type CajaListado = {
  id: string;
  folio: string;
  ubicacionId: string;
  ubicacionNombre: string;
  estado: EstadoCaja;
  abiertaPorNombre: string;
  cerradaPorNombre: string | null;
  fondoInicial: number;
  totalVendido: number;
  montoEsperadoEfectivo: number | null;
  montoContadoEfectivo: number | null;
  diferenciaEfectivo: number | null;
  abiertaEn: Date;
  cerradaEn: Date | null;
};

export type CajaDetalle = CajaListado & {
  observacionesApertura: string | null;
  observacionesCierre: string | null;
  totalVentas: number;
  desglosePorForma: Array<{ forma: FormaPago; total: number }>;
};

export type VentaLineaListado = {
  id: string;
  productoId: string;
  productoSku: string;
  productoNombre: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  ivaTasa: number;
  ivaImporte: number;
  total: number;
  loteNumero: string | null;
};

export type VentaPagoListado = {
  id: string;
  forma: FormaPago;
  monto: number;
  referencia: string | null;
};

export type VentaListado = {
  id: string;
  folio: string;
  fechaVenta: Date;
  estado: EstadoVenta;
  tipoPrecio: TipoPrecio;
  total: number;
  totalLineas: number;
  clienteNombre: string | null;
  usuarioNombre: string;
  cajaFolio: string;
  ubicacionNombre: string;
};

export type VentaDetalle = VentaListado & {
  subtotal: number;
  descuentoLineas: number;
  descuentoGlobal: number;
  iva: number;
  totalPagado: number;
  cambio: number;
  observaciones: string | null;
  motivoCancelacion: string | null;
  canceladaEn: Date | null;
  canceladaPorNombre: string | null;
  clienteId: string | null;
  clienteCodigo: string | null;
  clienteRfc: string | null;
  ubicacionId: string;
  cajaId: string;
  lineas: VentaLineaListado[];
  pagos: VentaPagoListado[];
};

// Producto resumido para búsqueda desde el POS
export type ProductoVendible = {
  productoId: string;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  unidadMedida: string;
  ivaTasa: number;
  precios: Record<TipoPrecio, number | null>;
  stockUbicacion: number;
};
