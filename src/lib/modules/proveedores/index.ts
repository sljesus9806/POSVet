// API pública del módulo Proveedores.
// Otros módulos SOLO deben importar desde este archivo.

export {
  proveedoresService,
  ProveedorNoEncontradoError,
  CodigoProveedorDuplicadoError,
  ProductoYaEnCatalogoError,
  LineaCatalogoNoEncontradaError,
} from "./service";

export {
  crearProveedorSchema,
  actualizarProveedorSchema,
  agregarLineaCatalogoSchema,
  actualizarLineaCatalogoSchema,
  eliminarLineaCatalogoSchema,
} from "./schemas";

export type {
  CrearProveedorInput,
  ActualizarProveedorInput,
  AgregarLineaCatalogoInput,
  ActualizarLineaCatalogoInput,
  EliminarLineaCatalogoInput,
} from "./schemas";

export type { ProveedorListado, ProveedorDetalle, CatalogoLinea } from "./types";

export {
  PROVEEDOR_EVENTS,
  type ProveedorCreadoPayload,
  type ProveedorActualizadoPayload,
  type ProveedorDesactivadoPayload,
  type CatalogoLineaPayload,
} from "./events";
