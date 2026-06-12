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
  // Granel: si este producto-empaque tiene un granel ligado, datos para "Abrir".
  productoGranelId: string | null;
  productoGranelNombre: string | null;
  contenidoGranel: number | null;
  granelUnidad: string | null;
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
  // Granel
  productoGranelId: string | null;
  contenidoGranel: number | null;
};

export type CategoriaListado = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  productosCount: number;
};
