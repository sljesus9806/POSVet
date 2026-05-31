// Eventos emitidos por el módulo Licencia.

export const LICENCIA_EVENTS = {
  VALIDADA: "licencia.validada",
  EN_GRACIA: "licencia.en_gracia",
  EXPIRADA: "licencia.expirada",
  INSTALADA: "licencia.instalada",
} as const;

export type LicenciaEstadoPayload = {
  cliente: string;
  modo: "online" | "offline";
  estado: "valida" | "gracia" | "expirada";
  expira: string; // ISO
};

export type LicenciaInstaladaPayload = {
  licenseId: string;
  cliente: string;
  modo: "online" | "offline";
};
