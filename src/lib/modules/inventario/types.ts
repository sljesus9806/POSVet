import type {
  EstadoTransferencia,
  MotivoMovimiento,
  TipoMovimiento,
} from "@prisma/client";

export type { EstadoTransferencia, MotivoMovimiento, TipoMovimiento };

export type StockPorUbicacion = {
  productoId: string;
  productoNombre: string;
  sku: string;
  unidadMedida: string;
  ubicacionId: string;
  ubicacionNombre: string;
  stock: number;
  stockMinimo: number;
  stockMaximo: number | null;
};

export type StockProductoResumen = {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  porUbicacion: Array<{
    ubicacionId: string;
    ubicacionNombre: string;
    stock: number;
    stockMinimo: number;
  }>;
  stockTotal: number;
};

export type MovimientoListado = {
  id: string;
  fecha: Date;
  tipo: TipoMovimiento;
  motivo: MotivoMovimiento;
  productoId: string;
  productoSku: string;
  productoNombre: string;
  ubicacionNombre: string;
  loteNumero: string | null;
  cantidad: number;
  stockResultante: number;
  costoUnitario: number | null;
  observaciones: string | null;
  usuarioNombre: string;
};

export type AlertaBajoStock = {
  productoId: string;
  sku: string;
  nombre: string;
  ubicacionId: string;
  ubicacionNombre: string;
  stock: number;
  stockMinimo: number;
};

export type AlertaCaducidad = {
  loteId: string;
  productoId: string;
  sku: string;
  productoNombre: string;
  lote: string;
  caducidad: Date;
  diasRestantes: number;
  cantidad: number;
};

export type TransferenciaListado = {
  id: string;
  folio: string;
  fecha: Date;
  origenNombre: string;
  destinoNombre: string;
  estado: EstadoTransferencia;
  totalLineas: number;
  usuarioNombre: string;
};
