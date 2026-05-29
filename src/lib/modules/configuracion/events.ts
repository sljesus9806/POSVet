// Eventos emitidos por el módulo Configuración.

export const CONFIGURACION_EVENTS = {
  EMPRESA_ACTUALIZADA: "configuracion.empresa.actualizada",
  UBICACION_CREADA: "configuracion.ubicacion.creada",
  UBICACION_ACTUALIZADA: "configuracion.ubicacion.actualizada",
  UBICACION_DESACTIVADA: "configuracion.ubicacion.desactivada",
} as const;

export type EmpresaActualizadaPayload = {
  empresaId: string;
  usuarioId: string;
};

export type UbicacionPayload = {
  ubicacionId: string;
  empresaId: string;
  nombre: string;
  usuarioId: string;
};
