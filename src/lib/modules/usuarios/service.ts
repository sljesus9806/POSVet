import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { usuariosRepository } from "./repository";
import { USUARIO_EVENTS } from "./events";
import {
  actualizarUsuarioSchema,
  cambiarPasswordSchema,
  crearUsuarioSchema,
  desbloquearUsuarioSchema,
  type ActualizarUsuarioInput,
  type CambiarPasswordInput,
  type CrearUsuarioInput,
  type DesbloquearUsuarioInput,
} from "./schemas";
import type {
  CredencialesLogin,
  RolCodigo,
  RolDisponible,
  UsuarioDetalle,
  UsuarioListado,
  UsuarioPublico,
} from "./types";

const MAX_INTENTOS_FALLIDOS = 5;
const MINUTOS_BLOQUEO = 15;
const BCRYPT_COST = 12;

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

export class UsuarioNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Usuario ${id} no encontrado`);
    this.name = "UsuarioNoEncontradoError";
  }
}

export class EmailEnUsoError extends Error {
  constructor(email: string) {
    super(`El correo ${email} ya está en uso`);
    this.name = "EmailEnUsoError";
  }
}

export class RolNoEncontradoError extends Error {
  constructor(codigo: string) {
    super(`Rol ${codigo} no existe en el sistema`);
    this.name = "RolNoEncontradoError";
  }
}

export class AutoDesactivacionError extends Error {
  constructor() {
    super("No puedes desactivar ni quitarte el rol ADMIN a ti mismo");
    this.name = "AutoDesactivacionError";
  }
}

type UsuarioConRoles = NonNullable<
  Awaited<ReturnType<typeof usuariosRepository.buscarPorEmail>>
>;
type UsuarioConRolesSimple = NonNullable<
  Awaited<ReturnType<typeof usuariosRepository.buscarDetalle>>
>;
type UsuarioListadoRaw = Awaited<ReturnType<typeof usuariosRepository.listar>>[number];

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

function estaBloqueado(bloqueadoHasta: Date | null): boolean {
  return bloqueadoHasta !== null && bloqueadoHasta > new Date();
}

function aListado(u: UsuarioListadoRaw): UsuarioListado {
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    activo: u.activo,
    bloqueado: estaBloqueado(u.bloqueadoHasta),
    ultimoLoginAt: u.ultimoLoginAt,
    roles: u.roles.map((ur) => ur.rol.codigo as RolCodigo),
  };
}

function aDetalle(u: UsuarioConRolesSimple): UsuarioDetalle {
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    empresaId: u.empresaId,
    activo: u.activo,
    bloqueado: estaBloqueado(u.bloqueadoHasta),
    bloqueadoHasta: u.bloqueadoHasta,
    intentosFallidos: u.intentosFallidos,
    ultimoLoginAt: u.ultimoLoginAt,
    roles: u.roles.map((ur) => ur.rol.codigo as RolCodigo),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export const usuariosService = {
  // -------- Autenticación (existente) --------
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

  // -------- Gestión de usuarios --------
  async listar(opts: {
    empresaId: string;
    q?: string;
    soloActivos?: boolean;
    rolCodigo?: RolCodigo;
  }): Promise<UsuarioListado[]> {
    const filas = await usuariosRepository.listar(opts);
    return filas.map(aListado);
  },

  async obtenerDetalle(id: string): Promise<UsuarioDetalle | null> {
    const u = await usuariosRepository.buscarDetalle(id);
    return u ? aDetalle(u) : null;
  },

  async listarRolesDisponibles(): Promise<RolDisponible[]> {
    const roles = await usuariosRepository.listarRolesDisponibles();
    return roles.map((r) => ({
      codigo: r.codigo as RolCodigo,
      nombre: r.nombre,
      descripcion: r.descripcion,
    }));
  },

  async crear(
    input: CrearUsuarioInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<UsuarioDetalle> {
    const data = crearUsuarioSchema.parse(input);

    const enUso = await usuariosRepository.emailEnUso(data.email);
    if (enUso) throw new EmailEnUsoError(data.email);

    const roles = await usuariosRepository.listarRolesPorCodigos(data.roles);
    if (roles.length !== data.roles.length) {
      const encontrados = new Set(roles.map((r) => r.codigo));
      const faltante = data.roles.find((c) => !encontrados.has(c));
      throw new RolNoEncontradoError(faltante ?? "?");
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);

    const creado = await usuariosRepository.crear(
      {
        email: data.email,
        nombre: data.nombre,
        passwordHash,
        empresa: { connect: { id: data.empresaId } },
      },
      roles.map((r) => r.id),
    );

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "usuarios",
      accion: "crear",
      entidad: "usuario",
      entidadId: creado.id,
      despues: { email: creado.email, nombre: creado.nombre, roles: data.roles },
      ip: ctx.ip,
    });
    await eventBus.emit(USUARIO_EVENTS.CREADO, {
      usuarioId: creado.id,
      email: creado.email,
      empresaId: creado.empresaId,
    });

    return aDetalle(creado);
  },

  async actualizar(
    input: ActualizarUsuarioInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<UsuarioDetalle> {
    const data = actualizarUsuarioSchema.parse(input);
    const actual = await usuariosRepository.buscarDetalle(data.id);
    if (!actual) throw new UsuarioNoEncontradoError(data.id);

    // No permitir auto-desactivarse ni quitarse el rol ADMIN si era el único cambio peligroso.
    if (data.id === ctx.usuarioId) {
      if (!data.activo) throw new AutoDesactivacionError();
      const tieneAdmin = data.roles.includes("ADMIN");
      const teníaAdmin = actual.roles.some((ur) => ur.rol.codigo === "ADMIN");
      if (teníaAdmin && !tieneAdmin) throw new AutoDesactivacionError();
    }

    if (data.email !== actual.email) {
      const enUso = await usuariosRepository.emailEnUso(data.email, data.id);
      if (enUso) throw new EmailEnUsoError(data.email);
    }

    const rolesNuevos = data.roles;
    const rolesActuales = actual.roles.map((ur) => ur.rol.codigo as RolCodigo);
    const cambianRoles =
      rolesNuevos.length !== rolesActuales.length ||
      rolesNuevos.some((r) => !rolesActuales.includes(r)) ||
      rolesActuales.some((r) => !rolesNuevos.includes(r as RolCodigo));

    if (cambianRoles) {
      const roles = await usuariosRepository.listarRolesPorCodigos(rolesNuevos);
      if (roles.length !== rolesNuevos.length) {
        const encontrados = new Set(roles.map((r) => r.codigo));
        const faltante = rolesNuevos.find((c) => !encontrados.has(c));
        throw new RolNoEncontradoError(faltante ?? "?");
      }
      await usuariosRepository.reasignarRoles(
        data.id,
        roles.map((r) => r.id),
      );
    }

    const update: Prisma.UsuarioUpdateInput = {
      email: data.email,
      nombre: data.nombre,
      activo: data.activo,
    };

    const actualizado = await usuariosRepository.actualizar(data.id, update);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "usuarios",
      accion: "editar",
      entidad: "usuario",
      entidadId: data.id,
      antes: {
        email: actual.email,
        nombre: actual.nombre,
        activo: actual.activo,
        roles: rolesActuales,
      },
      despues: {
        email: actualizado.email,
        nombre: actualizado.nombre,
        activo: actualizado.activo,
        roles: rolesNuevos,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(USUARIO_EVENTS.ACTUALIZADO, {
      usuarioId: actualizado.id,
      email: actualizado.email,
      empresaId: actualizado.empresaId,
      porUsuarioId: ctx.usuarioId,
    });
    if (actual.activo && !actualizado.activo) {
      await eventBus.emit(USUARIO_EVENTS.DESACTIVADO, {
        usuarioId: actualizado.id,
        email: actualizado.email,
        empresaId: actualizado.empresaId,
        porUsuarioId: ctx.usuarioId,
      });
    }

    return aDetalle(actualizado);
  },

  async cambiarPassword(
    input: CambiarPasswordInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<void> {
    const data = cambiarPasswordSchema.parse(input);
    const actual = await usuariosRepository.buscarDetalle(data.id);
    if (!actual) throw new UsuarioNoEncontradoError(data.id);

    const passwordHash = await bcrypt.hash(data.nuevaPassword, BCRYPT_COST);
    await usuariosRepository.cambiarPassword(data.id, passwordHash);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "usuarios",
      accion: "password.cambiar",
      entidad: "usuario",
      entidadId: data.id,
      ip: ctx.ip,
    });
    await eventBus.emit(USUARIO_EVENTS.PASSWORD_CAMBIADA, {
      usuarioId: data.id,
      email: actual.email,
      empresaId: actual.empresaId,
      porUsuarioId: ctx.usuarioId,
    });
  },

  async desbloquear(
    input: DesbloquearUsuarioInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<UsuarioDetalle> {
    const data = desbloquearUsuarioSchema.parse(input);
    const actual = await usuariosRepository.buscarDetalle(data.id);
    if (!actual) throw new UsuarioNoEncontradoError(data.id);

    await usuariosRepository.desbloquear(data.id);
    const refrescado = await usuariosRepository.buscarDetalle(data.id);
    if (!refrescado) throw new UsuarioNoEncontradoError(data.id);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "usuarios",
      accion: "desbloquear",
      entidad: "usuario",
      entidadId: data.id,
      antes: {
        intentosFallidos: actual.intentosFallidos,
        bloqueadoHasta: actual.bloqueadoHasta,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(USUARIO_EVENTS.DESBLOQUEADO, {
      usuarioId: data.id,
      email: actual.email,
      empresaId: actual.empresaId,
      porUsuarioId: ctx.usuarioId,
    });

    return aDetalle(refrescado);
  },
};
