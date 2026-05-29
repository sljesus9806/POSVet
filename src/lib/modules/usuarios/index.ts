// API pública del módulo Usuarios.
// Otros módulos SOLO deben importar desde este archivo.

export {
  usuariosService,
  CredencialesInvalidasError,
  UsuarioBloqueadoError,
  UsuarioInactivoError,
  UsuarioNoEncontradoError,
  EmailEnUsoError,
  RolNoEncontradoError,
  AutoDesactivacionError,
} from "./service";

export {
  loginSchema,
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  cambiarPasswordSchema,
  desbloquearUsuarioSchema,
} from "./schemas";

export type {
  LoginInput,
  CrearUsuarioInput,
  ActualizarUsuarioInput,
  CambiarPasswordInput,
  DesbloquearUsuarioInput,
} from "./schemas";

export type {
  UsuarioPublico,
  UsuarioListado,
  UsuarioDetalle,
  RolDisponible,
  CredencialesLogin,
  RolCodigo,
} from "./types";

export { USUARIO_EVENTS } from "./events";
export type {
  UsuarioCreadoPayload,
  UsuarioActualizadoPayload,
  LoginExitosoPayload,
  LoginFallidoPayload,
} from "./events";
