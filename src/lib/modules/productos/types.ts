import type { TipoProducto, TipoPrecio } from "@prisma/client";

export type { TipoProducto, TipoPrecio };

export type PrecioInfo = {
  tipo: TipoPrecio;
  precio: number;
};

export type LoteInfo = {
  id: string;
  lote: string;
  caducidad: Date;
  cantidad: number;
  costoUnitario: number;
};

export type ProductoListado = {
  id: string;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  marca: string | null;
  tipo: TipoProducto;
  especie: string | null;
  categoriaNombre: string | null;
  unidadMedida: string;
  precioPublico: number | null;
  stockTotal: number;
  activo: boolean;
};

export type ProductoDetalle = {
  id: string;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  laboratorio: string | null;
  viaAdministracion: string | null;
  categoriaId: string | null;
  categoriaNombre: string | null;
  unidadMedida: string;
  tipo: TipoProducto;
  especie: string | null;
  requiereReceta: boolean;
  sustanciaControlada: boolean;
  claveSAT: string;
  ivaAplicable: number;
  ultimoCosto: number;
  costoPromedio: number;
  activo: boolean;
  precios: PrecioInfo[];
  lotes: LoteInfo[];
};

export type CategoriaListado = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  productosCount: number;
};
