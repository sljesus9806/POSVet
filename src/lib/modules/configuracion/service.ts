import { Prisma } from "@prisma/client";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { configuracionRepository } from "./repository";
import {
  actualizarEmpresaSchema,
  actualizarUbicacionSchema,
  crearUbicacionSchema,
  type ActualizarEmpresaInput,
  type ActualizarUbicacionInput,
  type CrearUbicacionInput,
} from "./schemas";
import { CONFIGURACION_EVENTS } from "./events";
import type { EmpresaDetalle, UbicacionDetalle, UbicacionListado } from "./types";

export class EmpresaNoEncontradaError extends Error {
  constructor(id: string) {
    super(`Empresa ${id} no encontrada`);
    this.name = "EmpresaNoEncontradaError";
  }
}

export class UbicacionNoEncontradaError extends Error {
  constructor(id: string) {
    super(`Ubicación ${id} no encontrada`);
    this.name = "UbicacionNoEncontradaError";
  }
}

export class UbicacionConInventarioError extends Error {
  constructor() {
    super(
      "No se puede desactivar una ubicación con inventario activo. Mueve el stock antes.",
    );
    this.name = "UbicacionConInventarioError";
  }
}

function aDetalleEmpresa(
  e: NonNullable<Awaited<ReturnType<typeof configuracionRepository.obtenerEmpresa>>>,
): EmpresaDetalle {
  return {
    id: e.id,
    rfc: e.rfc,
    razonSocial: e.razonSocial,
    regimenFiscal: e.regimenFiscal,
    codigoPostal: e.codigoPostal,
    direccion: e.direccion,
    email: e.email,
    telefono: e.telefono,
    logoUrl: e.logoUrl,
    activa: e.activa,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function aListadoUbicacion(
  u: Awaited<ReturnType<typeof configuracionRepository.listarUbicaciones>>[number],
): UbicacionListado {
  return {
    id: u.id,
    nombre: u.nombre,
    tipo: u.tipo,
    direccion: u.direccion,
    activa: u.activa,
    numInventarios: u._count.inventarios,
  };
}

function aDetalleUbicacion(
  u: NonNullable<Awaited<ReturnType<typeof configuracionRepository.obtenerUbicacion>>>,
): UbicacionDetalle {
  return {
    id: u.id,
    empresaId: u.empresaId,
    nombre: u.nombre,
    tipo: u.tipo,
    direccion: u.direccion,
    activa: u.activa,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export const configuracionService = {
  // -------- Empresa --------
  async obtenerEmpresa(id: string): Promise<EmpresaDetalle | null> {
    const e = await configuracionRepository.obtenerEmpresa(id);
    return e ? aDetalleEmpresa(e) : null;
  },

  async obtenerEmpresaPrincipal(): Promise<EmpresaDetalle | null> {
    const e = await configuracionRepository.primeraEmpresa();
    return e ? aDetalleEmpresa(e) : null;
  },

  async actualizarEmpresa(
    input: ActualizarEmpresaInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<EmpresaDetalle> {
    const data = actualizarEmpresaSchema.parse(input);
    const actual = await configuracionRepository.obtenerEmpresa(data.id);
    if (!actual) throw new EmpresaNoEncontradaError(data.id);

    const update: Prisma.EmpresaUpdateInput = {
      rfc: data.rfc,
      razonSocial: data.razonSocial,
      regimenFiscal: data.regimenFiscal ?? null,
      codigoPostal: data.codigoPostal ?? null,
      direccion: data.direccion ?? null,
      email: data.email ?? null,
      telefono: data.telefono ?? null,
      logoUrl: data.logoUrl ?? null,
    };

    const actualizada = await configuracionRepository.actualizarEmpresa(data.id, update);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "configuracion",
      accion: "empresa.editar",
      entidad: "empresa",
      entidadId: data.id,
      antes: {
        rfc: actual.rfc,
        razonSocial: actual.razonSocial,
        regimenFiscal: actual.regimenFiscal,
        codigoPostal: actual.codigoPostal,
      },
      despues: {
        rfc: actualizada.rfc,
        razonSocial: actualizada.razonSocial,
        regimenFiscal: actualizada.regimenFiscal,
        codigoPostal: actualizada.codigoPostal,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(CONFIGURACION_EVENTS.EMPRESA_ACTUALIZADA, {
      empresaId: actualizada.id,
      usuarioId: ctx.usuarioId,
    });

    return aDetalleEmpresa(actualizada);
  },

  // -------- Ubicaciones --------
  async listarUbicaciones(
    empresaId: string,
    opts: { soloActivas?: boolean } = {},
  ): Promise<UbicacionListado[]> {
    const filas = await configuracionRepository.listarUbicaciones(empresaId, opts);
    return filas.map(aListadoUbicacion);
  },

  async obtenerUbicacion(id: string): Promise<UbicacionDetalle | null> {
    const u = await configuracionRepository.obtenerUbicacion(id);
    return u ? aDetalleUbicacion(u) : null;
  },

  async crearUbicacion(
    input: CrearUbicacionInput,
    ctx: { usuarioId: string; empresaId: string; ip?: string | null },
  ): Promise<UbicacionDetalle> {
    const data = crearUbicacionSchema.parse(input);

    const creada = await configuracionRepository.crearUbicacion({
      empresa: { connect: { id: ctx.empresaId } },
      nombre: data.nombre,
      tipo: data.tipo,
      direccion: data.direccion,
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "configuracion",
      accion: "ubicacion.crear",
      entidad: "ubicacion",
      entidadId: creada.id,
      despues: { nombre: creada.nombre, tipo: creada.tipo },
      ip: ctx.ip,
    });
    await eventBus.emit(CONFIGURACION_EVENTS.UBICACION_CREADA, {
      ubicacionId: creada.id,
      empresaId: ctx.empresaId,
      nombre: creada.nombre,
      usuarioId: ctx.usuarioId,
    });

    return aDetalleUbicacion(creada);
  },

  async actualizarUbicacion(
    input: ActualizarUbicacionInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<UbicacionDetalle> {
    const data = actualizarUbicacionSchema.parse(input);
    const actual = await configuracionRepository.obtenerUbicacion(data.id);
    if (!actual) throw new UbicacionNoEncontradaError(data.id);

    // Bloquea la desactivación si hay stock > 0 en algún inventario de esta ubicación.
    if (data.activa === false && actual.activa) {
      const conStock = await configuracionRepository.tieneStockActivo(data.id);
      if (conStock) throw new UbicacionConInventarioError();
    }

    const update: Prisma.UbicacionUpdateInput = {
      nombre: data.nombre,
      tipo: data.tipo,
      direccion: data.direccion ?? null,
      activa: data.activa,
    };

    const actualizada = await configuracionRepository.actualizarUbicacion(data.id, update);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "configuracion",
      accion: "ubicacion.editar",
      entidad: "ubicacion",
      entidadId: data.id,
      antes: { nombre: actual.nombre, tipo: actual.tipo, activa: actual.activa },
      despues: {
        nombre: actualizada.nombre,
        tipo: actualizada.tipo,
        activa: actualizada.activa,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(CONFIGURACION_EVENTS.UBICACION_ACTUALIZADA, {
      ubicacionId: actualizada.id,
      empresaId: actualizada.empresaId,
      nombre: actualizada.nombre,
      usuarioId: ctx.usuarioId,
    });
    if (data.activa === false && actual.activa) {
      await eventBus.emit(CONFIGURACION_EVENTS.UBICACION_DESACTIVADA, {
        ubicacionId: actualizada.id,
        empresaId: actualizada.empresaId,
        nombre: actualizada.nombre,
        usuarioId: ctx.usuarioId,
      });
    }

    return aDetalleUbicacion(actualizada);
  },
};
