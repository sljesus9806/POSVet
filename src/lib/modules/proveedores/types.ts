export type ProveedorListado = {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  email: string | null;
  telefono: string | null;
  contacto: string | null;
  activo: boolean;
  numProductos: number;
};

export type ProveedorDetalle = {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  regimenFiscal: string | null;
  codigoPostal: string | null;
  email: string | null;
  telefono: string | null;
  contacto: string | null;
  direccion: string | null;
  notas: string | null;
  diasCredito: number;
  saldoActual: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CatalogoLinea = {
  id: string;
  proveedorId: string;
  productoId: string;
  productoSku: string;
  productoNombre: string;
  productoUnidadMedida: string;
  codigoProveedor: string | null;
  costoUnitario: number;
  esPreferido: boolean;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
};
