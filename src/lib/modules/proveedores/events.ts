// Eventos emitidos por el módulo Proveedores.

export const PROVEEDOR_EVENTS = {
  CREADO: "proveedor.creado",
  ACTUALIZADO: "proveedor.actualizado",
  DESACTIVADO: "proveedor.desactivado",
  CATALOGO_LINEA_AGREGADA: "proveedor.catalogo.agregada",
  CATALOGO_LINEA_ACTUALIZADA: "proveedor.catalogo.actualizada",
  CATALOGO_LINEA_ELIMINADA: "proveedor.catalogo.eliminada",
} as const;

export type ProveedorCreadoPayload = {
  proveedorId: string;
  codigo: string;
  nombre: string;
  usuarioId: string;
};

export type ProveedorActualizadoPayload = {
  proveedorId: string;
  codigo: string;
  usuarioId: string;
};

export type ProveedorDesactivadoPayload = {
  proveedorId: string;
  codigo: string;
  usuarioId: string;
};

export type CatalogoLineaPayload = {
  proveedorId: string;
  productoId: string;
  lineaId: string;
  usuarioId: string;
};
