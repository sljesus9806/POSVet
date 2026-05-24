// Eventos emitidos por el módulo Productos.

export const PRODUCTO_EVENTS = {
  CREADO: "producto.creado",
  ACTUALIZADO: "producto.actualizado",
  DESACTIVADO: "producto.desactivado",
  PRECIO_ACTUALIZADO: "producto.precio_actualizado",
  LOTE_CREADO: "producto.lote_creado",
} as const;

export type ProductoCreadoPayload = {
  productoId: string;
  sku: string;
  nombre: string;
  usuarioId: string;
};

export type ProductoActualizadoPayload = {
  productoId: string;
  sku: string;
  usuarioId: string;
};

export type ProductoDesactivadoPayload = {
  productoId: string;
  sku: string;
  usuarioId: string;
};

export type LoteCreadoPayload = {
  productoId: string;
  loteId: string;
  lote: string;
  caducidad: Date;
  cantidad: number;
};
