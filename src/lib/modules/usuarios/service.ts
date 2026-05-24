import bcrypt from "bcryptjs";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { usuariosRepository } from "./repository";
import { USUARIO_EVENTS } from "./events";
import type {
  CredencialesLogin,
  UsuarioPublico,
  RolCodigo,
} from "./types";

const MAX_INTENTOS_FALLIDOS = 5;
const MINUTOS_BLOQUEO = 15;

export class CredencialesInvalidasError extends Error {
  constructor() {
    super("Correo o contraseña incorrectos");
    this.name = "CredencialesInvalidasError";
  }
}

export class UsuarioBloqueadoError extends Error {
  constructor(public bloqueadoHasta: Date) {
    super("Usuario bloqueado temporalmente por intentos fallidos");
    this.name = "UsuarioBloqueadoError";
  }
}

export class UsuarioInactivoError extends Error {
  constructor() {
    super("Usuario inactivo");
    this.name = "UsuarioInactivoError";
  }
}

type UsuarioConRoles = NonNullable<
  Awaited<ReturnType<typeof usuariosRepository.buscarPorEmail>>
>;

function aPublico(usuario: UsuarioConRoles): UsuarioPublico {
  const roles = usuario.roles.map((ur) => ur.rol.codigo as RolCodigo);
  const permisos = Array.from(
    new Set(
      usuario.roles.flatMap((ur) =>
        ur.rol.permisos.map((rp) => rp.permiso.codigo),
      ),
    ),
  );
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    empresaId: usuario.empresaId,
    activo: usuario.activo,
    roles,
    permisos,
  };
}

export const usuariosService = {
  async autenticar(creds: CredencialesLogin): Promise<UsuarioPublico> {
    const usuario = await usuariosRepository.buscarPorEmail(creds.email);

    if (!usuario) {
      await usuariosRepository.registrarLogin({
        usuarioId: null,
        email: creds.email,
        exitoso: false,
        ip: creds.ip,
        userAgent: creds.userAgent,
      });
      await eventBus.emit(USUARIO_EVENTS.LOGIN_FALLIDO, {
        email: creds.email,
        motivo: "credenciales_invalidas",
        ip: creds.ip ?? null,
      });
      throw new CredencialesInvalidasError();
    }

    if (!usuario.activo) {
      await usuariosRepository.registrarLogin({
        usuarioId: usuario.id,
        email: creds.email,
        exitoso: false,
        ip: creds.ip,
        userAgent: creds.userAgent,
      });
      throw new UsuarioInactivoError();
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      throw new UsuarioBloqueadoError(usuario.bloqueadoHasta);
    }

    const passwordOk = await bcrypt.compare(creds.password, usuario.passwordHash);

    if (!passwordOk) {
      const nuevosIntentos = usuario.intentosFallidos + 1;
      const bloquearHasta =
        nuevosIntentos >= MAX_INTENTOS_FALLIDOS
          ? new Date(Date.now() + MINUTOS_BLOQUEO * 60_000)
          : undefined;

      await usuariosRepository.incrementarIntentosFallidos(
        usuario.id,
        bloquearHasta,
      );
      await usuariosRepository.registrarLogin({
        usuarioId: usuario.id,
        email: creds.email,
        exitoso: false,
        ip: creds.ip,
        userAgent: creds.userAgent,
      });
      await eventBus.emit(USUARIO_EVENTS.LOGIN_FALLIDO, {
        email: creds.email,
        motivo: "credenciales_invalidas",
        ip: creds.ip ?? null,
      });
      throw new CredencialesInvalidasError();
    }

    await usuariosRepository.resetIntentosYRegistrarLogin(usuario.id);
    await usuariosRepository.registrarLogin({
      usuarioId: usuario.id,
      email: creds.email,
      exitoso: true,
      ip: creds.ip,
      userAgent: creds.userAgent,
    });
    await audit({
      usuarioId: usuario.id,
      modulo: "usuarios",
      accion: "login",
      entidad: "usuario",
      entidadId: usuario.id,
      ip: creds.ip,
      userAgent: creds.userAgent,
    });
    await eventBus.emit(USUARIO_EVENTS.LOGIN_EXITOSO, {
      usuarioId: usuario.id,
      email: usuario.email,
      ip: creds.ip ?? null,
    });

    return aPublico(usuario);
  },

  async obtenerPorId(id: string): Promise<UsuarioPublico | null> {
    const usuario = await usuariosRepository.buscarPorId(id);
    return usuario ? aPublico(usuario) : null;
  },

  tienePermiso(usuario: UsuarioPublico, codigo: string): boolean {
    return usuario.permisos.includes(codigo) || usuario.roles.includes("ADMIN");
  },

  tieneRol(usuario: UsuarioPublico, rol: RolCodigo): boolean {
    return usuario.roles.includes(rol);
  },
};
