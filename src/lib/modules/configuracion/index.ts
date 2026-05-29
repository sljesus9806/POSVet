// API pública del módulo Configuración.
// Otros módulos SOLO deben importar desde este archivo.

export {
  configuracionService,
  EmpresaNoEncontradaError,
  UbicacionNoEncontradaError,
  UbicacionConInventarioError,
} from "./service";

export {
  actualizarEmpresaSchema,
  crearUbicacionSchema,
  actualizarUbicacionSchema,
} from "./schemas";

export type {
  ActualizarEmpresaInput,
  CrearUbicacionInput,
  ActualizarUbicacionInput,
} from "./schemas";

export type { EmpresaDetalle, UbicacionListado, UbicacionDetalle } from "./types";

export {
  CONFIGURACION_EVENTS,
  type EmpresaActualizadaPayload,
  type UbicacionPayload,
} from "./events";
