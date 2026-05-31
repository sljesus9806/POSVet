export type ModoLicencia = "online" | "offline";

// "ausente": no hay licencia instalada.
// "invalida": firma incorrecta o payload manipulado/ilegible.
// "valida": vigente. "gracia": venció pero dentro del periodo de tolerancia.
// "expirada": venció y se agotó la gracia → bloqueo.
export type EstadoLicencia =
  | "ausente"
  | "invalida"
  | "valida"
  | "gracia"
  | "expirada"
  | "revocada"; // la plataforma suspendió/venció la membresía (bloqueo inmediato)

export type ResultadoLicencia = {
  estado: EstadoLicencia;
  bloqueado: boolean; // true si debe cerrarse el acceso al sistema
  cliente: string | null;
  modo: ModoLicencia | null;
  expira: Date | null;
  finGracia: Date | null;
  // Días hasta `expira` (negativo si ya venció pero sigue en gracia).
  diasRestantes: number | null;
  mensaje: string;
};
