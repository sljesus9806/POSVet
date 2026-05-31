// API pública del módulo Licencia.
// Otros módulos / la app SOLO deben importar desde este archivo.

export { licenciaService, LicenciaInvalidaError } from "./service";

export { licenciaPayloadSchema } from "./schemas";
export type { LicenciaPayload } from "./schemas";

export type {
  EstadoLicencia,
  ModoLicencia,
  ResultadoLicencia,
} from "./types";

export {
  LICENCIA_EVENTS,
  type LicenciaEstadoPayload,
  type LicenciaInstaladaPayload,
} from "./events";

// Primitivas cripto: expuestas para el emisor (scripts/licencia). La app
// cliente solo usa `licenciaService`.
export { firmarPayload, verificarToken, generarParLlaves } from "./crypto";
