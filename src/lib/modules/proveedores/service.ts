import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { proveedoresRepository } from "./repository";
import {
  actualizarLineaCatalogoSchema,
  actualizarProveedorSchema,
  agregarLineaCatalogoSchema,
  crearProveedorSchema,
  eliminarLineaCatalogoSchema,
  type ActualizarLineaCatalogoInput,
  type ActualizarProveedorInput,
  type AgregarLineaCatalogoInput,
  type CrearProveedorInput,
  type EliminarLineaCatalogoInput,
} from "./schemas";
import { PROVEEDOR_EVENTS } from "./events";
import type { CatalogoLinea, ProveedorDetalle, ProveedorListado } from "./types";

export class ProveedorNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Proveedor ${id} no encontrado`);
    this.name = "ProveedorNoEncontradoError";
  }
}

export class CodigoProveedorDuplicadoError extends Error {
  constructor(codigo: string) {
    super(`Ya existe un proveedor con código ${codigo}`);
    this.name = "CodigoProveedorDuplicadoError";
  }
}

export class ProductoYaEnCatalogoError extends Error {
  constructor() {
    super("El producto ya está en el catálogo de este proveedor.");
    this.name = "ProductoYaEnCatalogoError";
  }
}

export class LineaCatalogoNoEncontradaError extends Error {
  constructor(id: string) {
    super(`Línea de catálogo ${id} no encontrada`);
    this.name = "LineaCatalogoNoEncontradaError";
  }
}

const toNumber = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === "number" ? d : Number(d.toString());

function aListado(
  c: Awaited<ReturnType<typeof proveedoresRepository.listar>>[number],
): ProveedorListado {
  return {
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    rfc: c.rfc,
    email: c.email,
    telefono: c.telefono,
    contacto: c.contacto,
    activo: c.activo,
    numProductos: c._count.productos,
  };
}

function aDetalle(
  c: NonNullable<Awaited<ReturnType<typeof proveedoresRepository.buscarPorId>>>,
): ProveedorDetalle {
  return {
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    rfc: c.rfc,
    regimenFiscal: c.regimenFiscal,
    codigoPostal: c.codigoPostal,
    email: c.email,
    telefono: c.telefono,
    contacto: c.contacto,
    direccion: c.direccion,
    notas: c.notas,
    diasCredito: c.diasCredito,
    saldoActual: toNumber(c.saldoActual),
    activo: c.activo,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function aLineaCatalogo(
  l: NonNullable<Awaited<ReturnType<typeof proveedoresRepository.actualizarLineaCatalogo>>>,
): CatalogoLinea {
  return {
    id: l.id,
    proveedorId: l.proveedorId,
    productoId: l.productoId,
    productoSku: l.producto.sku,
    productoNombre: l.producto.nombre,
    productoUnidadMedida: l.producto.unidadMedida,
    codigoProveedor: l.codigoProveedor,
    costoUnitario: toNumber(l.costoUnitario),
    esPreferido: l.esPreferido,
    notas: l.notas,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

export const proveedoresService = {
  async listar(opts: { q?: string; soloActivos?: boolean } = {}): Promise<ProveedorListado[]> {
    const filas = await proveedoresRepository.listar(opts);
    return filas.map(aListado);
  },

  async obtener(id: string): Promise<ProveedorDetalle | null> {
    const c = await proveedoresRepository.buscarPorId(id);
    return c ? aDetalle(c) : null;
  },

  async crear(
    input: CrearProveedorInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<ProveedorDetalle> {
    const data = crearProveedorSchema.parse(input);

    // Reintentar hasta 3 veces si el código colisiona (race entre transacciones concurrentes).
    let proveedor: Awaited<ReturnType<typeof proveedoresRepository.buscarPorId>> = null;
    let lastError: unknown;
    for (let intento = 0; intento < 3; intento++) {
      try {
        proveedor = await prisma.$transaction(async (tx) => {
          const codigo = await proveedoresRepository.proximoCodigo(tx);
          return tx.proveedor.create({
            data: {
              codigo,
              nombre: data.nombre,
              rfc: data.rfc,
              regimenFiscal: data.regimenFiscal,
              codigoPostal: data.codigoPostal,
              email: data.email,
              telefono: data.telefono,
              contacto: data.contacto,
              direccion: data.direccion,
              notas: data.notas,
              diasCredito: data.diasCredito,
            },
          });
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as string[] | undefined)?.includes("codigo")
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    if (!proveedor) throw lastError ?? new Error("No se pudo generar código único");

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "proveedores",
      accion: "crear",
      entidad: "proveedor",
      entidadId: proveedor.id,
      despues: { codigo: proveedor.codigo, nombre: proveedor.nombre },
      ip: ctx.ip,
    });
    await eventBus.emit(PROVEEDOR_EVENTS.CREADO, {
      proveedorId: proveedor.id,
      codigo: proveedor.codigo,
      nombre: proveedor.nombre,
      usuarioId: ctx.usuarioId,
    });

    return aDetalle(proveedor);
  },

  async actualizar(
    input: ActualizarProveedorInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<ProveedorDetalle> {
    const data = actualizarProveedorSchema.parse(input);
    const actual = await proveedoresRepository.buscarPorId(data.id);
    if (!actual) throw new ProveedorNoEncontradoError(data.id);

    const update: Prisma.ProveedorUpdateInput = {};
    if (data.nombre !== undefined) update.nombre = data.nombre;
    if (data.rfc !== undefined) update.rfc = data.rfc ?? null;
    if (data.regimenFiscal !== undefined) update.regimenFiscal = data.regimenFiscal ?? null;
    if (data.codigoPostal !== undefined) update.codigoPostal = data.codigoPostal ?? null;
    if (data.email !== undefined) update.email = data.email ?? null;
    if (data.telefono !== undefined) update.telefono = data.telefono ?? null;
    if (data.contacto !== undefined) update.contacto = data.contacto ?? null;
    if (data.direccion !== undefined) update.direccion = data.direccion ?? null;
    if (data.notas !== undefined) update.notas = data.notas ?? null;
    if (data.diasCredito !== undefined) update.diasCredito = data.diasCredito;
    if (data.activo !== undefined) update.activo = data.activo;

    const actualizado = await proveedoresRepository.actualizar(data.id, update);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "proveedores",
      accion: "editar",
      entidad: "proveedor",
      entidadId: data.id,
      antes: { nombre: actual.nombre, activo: actual.activo },
      despues: { nombre: actualizado.nombre, activo: actualizado.activo },
      ip: ctx.ip,
    });
    await eventBus.emit(PROVEEDOR_EVENTS.ACTUALIZADO, {
      proveedorId: actualizado.id,
      codigo: actualizado.codigo,
      usuarioId: ctx.usuarioId,
    });
    if (data.activo === false && actual.activo) {
      await eventBus.emit(PROVEEDOR_EVENTS.DESACTIVADO, {
        proveedorId: actualizado.id,
        codigo: actualizado.codigo,
        usuarioId: ctx.usuarioId,
      });
    }

    return aDetalle(actualizado);
  },

  // ---------------- Catálogo ----------------
  async listarCatalogo(proveedorId: string): Promise<CatalogoLinea[]> {
    const filas = await proveedoresRepository.listarCatalogo(proveedorId);
    return filas.map(aLineaCatalogo);
  },

  async agregarLineaCatalogo(
    input: AgregarLineaCatalogoInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<CatalogoLinea> {
    const data = agregarLineaCatalogoSchema.parse(input);
    try {
      const linea = await proveedoresRepository.crearLineaCatalogo({
        proveedor: { connect: { id: data.proveedorId } },
        producto: { connect: { id: data.productoId } },
        codigoProveedor: data.codigoProveedor,
        costoUnitario: data.costoUnitario,
        esPreferido: data.esPreferido,
        notas: data.notas,
      });

      await audit({
        usuarioId: ctx.usuarioId,
        modulo: "proveedores",
        accion: "catalogo.agregar",
        entidad: "proveedor_producto",
        entidadId: linea.id,
        despues: {
          proveedorId: data.proveedorId,
          productoId: data.productoId,
          costoUnitario: data.costoUnitario,
        },
        ip: ctx.ip,
      });
      await eventBus.emit(PROVEEDOR_EVENTS.CATALOGO_LINEA_AGREGADA, {
        proveedorId: data.proveedorId,
        productoId: data.productoId,
        lineaId: linea.id,
        usuarioId: ctx.usuarioId,
      });

      return aLineaCatalogo(linea);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ProductoYaEnCatalogoError();
      }
      throw err;
    }
  },

  async actualizarLineaCatalogo(
    input: ActualizarLineaCatalogoInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<CatalogoLinea> {
    const data = actualizarLineaCatalogoSchema.parse(input);
    const actual = await proveedoresRepository.buscarLineaCatalogo(data.lineaId);
    if (!actual) throw new LineaCatalogoNoEncontradaError(data.lineaId);

    const update: Prisma.ProveedorProductoUpdateInput = {};
    if (data.codigoProveedor !== undefined) update.codigoProveedor = data.codigoProveedor ?? null;
    if (data.costoUnitario !== undefined) update.costoUnitario = data.costoUnitario;
    if (data.esPreferido !== undefined) update.esPreferido = data.esPreferido;
    if (data.notas !== undefined) update.notas = data.notas ?? null;

    const actualizada = await proveedoresRepository.actualizarLineaCatalogo(data.lineaId, update);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "proveedores",
      accion: "catalogo.editar",
      entidad: "proveedor_producto",
      entidadId: data.lineaId,
      antes: {
        costoUnitario: toNumber(actual.costoUnitario),
        esPreferido: actual.esPreferido,
      },
      despues: {
        costoUnitario: toNumber(actualizada.costoUnitario),
        esPreferido: actualizada.esPreferido,
      },
      ip: ctx.ip,
    });
    await eventBus.emit(PROVEEDOR_EVENTS.CATALOGO_LINEA_ACTUALIZADA, {
      proveedorId: actualizada.proveedorId,
      productoId: actualizada.productoId,
      lineaId: actualizada.id,
      usuarioId: ctx.usuarioId,
    });

    return aLineaCatalogo(actualizada);
  },

  async eliminarLineaCatalogo(
    input: EliminarLineaCatalogoInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<void> {
    const data = eliminarLineaCatalogoSchema.parse(input);
    const actual = await proveedoresRepository.buscarLineaCatalogo(data.lineaId);
    if (!actual) throw new LineaCatalogoNoEncontradaError(data.lineaId);

    await proveedoresRepository.eliminarLineaCatalogo(data.lineaId);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "proveedores",
      accion: "catalogo.eliminar",
      entidad: "proveedor_producto",
      entidadId: data.lineaId,
      antes: { proveedorId: actual.proveedorId, productoId: actual.productoId },
      ip: ctx.ip,
    });
    await eventBus.emit(PROVEEDOR_EVENTS.CATALOGO_LINEA_ELIMINADA, {
      proveedorId: actual.proveedorId,
      productoId: actual.productoId,
      lineaId: actual.id,
      usuarioId: ctx.usuarioId,
    });
  },
};
