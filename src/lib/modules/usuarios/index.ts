// API pública del módulo Usuarios.
// Otros módulos SOLO deben importar desde este archivo.

export { usuariosService } from "./service";
export {
  CredencialesInvalidasError,
  UsuarioBloqueadoError,
  UsuarioInactivoError,
} from "./service";
export { loginSchema, crearUsuarioSchema } from "./schemas";
export type { LoginInput, CrearUsuarioInput } from "./schemas";
export type {
  UsuarioPublico,
  CredencialesLogin,
  RolCodigo,
} from "./types";
export { USUARIO_EVENTS } from "./events";
export type {
  UsuarioCreadoPayload,
  LoginExitosoPayload,
  LoginFallidoPayload,
} from "./events";
