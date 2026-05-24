// Eventos emitidos por el módulo de Usuarios.
// Otros módulos pueden suscribirse vía event-bus.

export const USUARIO_EVENTS = {
  CREADO: "usuario.creado",
  ACTUALIZADO: "usuario.actualizado",
  LOGIN_EXITOSO: "usuario.login_exitoso",
  LOGIN_FALLIDO: "usuario.login_fallido",
  BLOQUEADO: "usuario.bloqueado",
} as const;

export type UsuarioCreadoPayload = {
  usuarioId: string;
  email: string;
  empresaId: string;
};

export type LoginExitosoPayload = {
  usuarioId: string;
  email: string;
  ip?: string | null;
};

export type LoginFallidoPayload = {
  email: string;
  motivo: "credenciales_invalidas" | "usuario_inactivo" | "usuario_bloqueado";
  ip?: string | null;
};
