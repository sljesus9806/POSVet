import { Prisma } from "@prisma/client";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { categoriasRepository, productosRepository } from "./repository";
import {
  actualizarCategoriaSchema,
  actualizarProductoSchema,
  crearCategoriaSchema,
  crearLoteSchema,
  crearProductoSchema,
  type ActualizarCategoriaInput,
  type ActualizarProductoInput,
  type CrearCategoriaInput,
  type CrearLoteInput,
  type CrearProductoInput,
} from "./schemas";
import { PRODUCTO_EVENTS } from "./events";
import type {
  CategoriaListado,
  ProductoDetalle,
  ProductoListado,
} from "./types";

export class SkuDuplicadoError extends Error {
  constructor(sku: string) {
    super(`Ya existe un producto con SKU ${sku}`);
    this.name = "SkuDuplicadoError";
  }
}

export class CodigoBarrasDuplicadoError extends Error {
  constructor(codigo: string) {
    super(`Ya existe un producto con código de barras ${codigo}`);
    this.name = "CodigoBarrasDuplicadoError";
  }
}

export class ProductoNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Producto ${id} no encontrado`);
    this.name = "ProductoNoEncontradoError";
  }
}

export class CategoriaDuplicadaError extends Error {
  constructor(nombre: string) {
    super(`Ya existe una categoría con nombre "${nombre}"`);
    this.name = "CategoriaDuplicadaError";
  }
}

function toNumber(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : Number(d.toString());
}

function aListado(
  p: Awaited<ReturnType<typeof productosRepository.listar>>[number],
): ProductoListado {
  const stockTotal = p.inventarios.reduce((acc, i) => acc + toNumber(i.stock), 0);
  return {
    id: p.id,
    sku: p.sku,
    codigoBarras: p.codigoBarras,
    nombre: p.nombre,
    marca: p.marca,
    tipo: p.tipo,
    especie: p.especie,
    categoriaNombre: p.categoria?.nombre ?? null,
    unidadMedida: p.unidadMedida,
    precioPublico: p.precios[0] ? toNumber(p.precios[0].precio) : null,
    stockTotal,
    activo: p.activo,
  };
}

function aDetalle(
  p: NonNullable<Awaited<ReturnType<typeof productosRepository.buscarPorId>>>,
): ProductoDetalle {
  return {
    id: p.id,
    sku: p.sku,
    codigoBarras: p.codigoBarras,
    nombre: p.nombre,
    descripcion: p.descripcion,
    marca: p.marca,
    laboratorio: p.laboratorio,
    viaAdministracion: p.viaAdministracion,
    categoriaId: p.categoriaId,
    categoriaNombre: p.categoria?.nombre ?? null,
    unidadMedida: p.unidadMedida,
    tipo: p.tipo,
    especie: p.especie,
    requiereReceta: p.requiereReceta,
    sustanciaControlada: p.sustanciaControlada,
    claveSAT: p.claveSAT,
    ivaAplicable: toNumber(p.ivaAplicable),
    ultimoCosto: toNumber(p.ultimoCosto),
    costoPromedio: toNumber(p.costoPromedio),
    activo: p.activo,
    precios: p.precios.map((pr) => ({ tipo: pr.tipo, precio: toNumber(pr.precio) })),
    lotes: p.lotes.map((l) => ({
      id: l.id,
      lote: l.lote,
      caducidad: l.caducidad,
      cantidad: toNumber(l.cantidad),
      costoUnitario: toNumber(l.costoUnitario),
    })),
  };
}

export const productosService = {
  async listar(opts: { q?: string; tipo?: ProductoDetalle["tipo"]; soloActivos?: boolean } = {}): Promise<ProductoListado[]> {
    const filas = await productosRepository.listar(opts);
    return filas.map(aListado);
  },

  async obtener(id: string): Promise<ProductoDetalle | null> {
    const p = await productosRepository.buscarPorId(id);
    return p ? aDetalle(p) : null;
  },

  async crear(input: CrearProductoInput, ctx: { usuarioId: string; ip?: string | null }): Promise<ProductoDetalle> {
    const data = crearProductoSchema.parse(input);

    const existeSku = await productosRepository.buscarPorSku(data.sku);
    if (existeSku) throw new SkuDuplicadoError(data.sku);
    if (data.codigoBarras) {
      const existeBarras = await productosRepository.buscarPorCodigoBarras(data.codigoBarras);
      if (existeBarras) throw new CodigoBarrasDuplicadoError(data.codigoBarras);
    }

    const producto = await productosRepository.crear({
      sku: data.sku,
      codigoBarras: data.codigoBarras,
      nombre: data.nombre,
      descripcion: data.descripcion,
      marca: data.marca,
      unidadMedida: data.unidadMedida,
      tipo: data.tipo,
      especie: data.especie,
      requiereReceta: data.requiereReceta,
      sustanciaControlada: data.sustanciaControlada,
      laboratorio: data.laboratorio,
      viaAdministracion: data.viaAdministracion,
      claveSAT: data.claveSAT,
      ivaAplicable: data.ivaAplicable,
      ultimoCosto: data.ultimoCosto,
      costoPromedio: data.ultimoCosto,
      categoria: data.categoriaId ? { connect: { id: data.categoriaId } } : undefined,
      precios: {
        create: data.precios.map((p) => ({ tipo: p.tipo, precio: p.precio })),
      },
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "productos",
      accion: "crear",
      entidad: "producto",
      entidadId: producto.id,
      despues: { sku: producto.sku, nombre: producto.nombre },
      ip: ctx.ip,
    });
    await eventBus.emit(PRODUCTO_EVENTS.CREADO, {
      productoId: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      usuarioId: ctx.usuarioId,
    });

    const detalle = await this.obtener(producto.id);
    return detalle!;
  },

  async actualizar(input: ActualizarProductoInput, ctx: { usuarioId: string; ip?: string | null }): Promise<ProductoDetalle> {
    const data = actualizarProductoSchema.parse(input);
    const actual = await productosRepository.buscarPorId(data.id);
    if (!actual) throw new ProductoNoEncontradoError(data.id);

    if (data.sku && data.sku !== actual.sku) {
      const existeSku = await productosRepository.buscarPorSku(data.sku);
      if (existeSku && existeSku.id !== actual.id) throw new SkuDuplicadoError(data.sku);
    }
    if (data.codigoBarras && data.codigoBarras !== actual.codigoBarras) {
      const existeBarras = await productosRepository.buscarPorCodigoBarras(data.codigoBarras);
      if (existeBarras && existeBarras.id !== actual.id) throw new CodigoBarrasDuplicadoError(data.codigoBarras);
    }

    const update: Prisma.ProductoUpdateInput = {};
    if (data.sku !== undefined) update.sku = data.sku;
    if (data.codigoBarras !== undefined) update.codigoBarras = data.codigoBarras ?? null;
    if (data.nombre !== undefined) update.nombre = data.nombre;
    if (data.descripcion !== undefined) update.descripcion = data.descripcion ?? null;
    if (data.marca !== undefined) update.marca = data.marca ?? null;
    if (data.unidadMedida !== undefined) update.unidadMedida = data.unidadMedida;
    if (data.tipo !== undefined) update.tipo = data.tipo;
    if (data.especie !== undefined) update.especie = data.especie ?? null;
    if (data.requiereReceta !== undefined) update.requiereReceta = data.requiereReceta;
    if (data.sustanciaControlada !== undefined) update.sustanciaControlada = data.sustanciaControlada;
    if (data.laboratorio !== undefined) update.laboratorio = data.laboratorio ?? null;
    if (data.viaAdministracion !== undefined) update.viaAdministracion = data.viaAdministracion ?? null;
    if (data.claveSAT !== undefined) update.claveSAT = data.claveSAT;
    if (data.ivaAplicable !== undefined) update.ivaAplicable = data.ivaAplicable;
    if (data.ultimoCosto !== undefined) update.ultimoCosto = data.ultimoCosto;
    if (data.activo !== undefined) update.activo = data.activo;
    if (data.categoriaId !== undefined) {
      update.categoria = data.categoriaId
        ? { connect: { id: data.categoriaId } }
        : { disconnect: true };
    }

    await productosRepository.actualizar(data.id, update);

    if (data.precios) {
      for (const p of data.precios) {
        await productosRepository.upsertPrecio(data.id, p.tipo, p.precio);
      }
    }

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "productos",
      accion: "editar",
      entidad: "producto",
      entidadId: data.id,
      antes: { sku: actual.sku, nombre: actual.nombre, activo: actual.activo },
      despues: { sku: data.sku ?? actual.sku, nombre: data.nombre ?? actual.nombre, activo: data.activo ?? actual.activo },
      ip: ctx.ip,
    });
    await eventBus.emit(PRODUCTO_EVENTS.ACTUALIZADO, {
      productoId: data.id,
      sku: data.sku ?? actual.sku,
      usuarioId: ctx.usuarioId,
    });

    if (data.activo === false && actual.activo) {
      await eventBus.emit(PRODUCTO_EVENTS.DESACTIVADO, {
        productoId: data.id,
        sku: actual.sku,
        usuarioId: ctx.usuarioId,
      });
    }

    const detalle = await this.obtener(data.id);
    return detalle!;
  },

  async crearLote(input: CrearLoteInput, ctx: { usuarioId: string }): Promise<{ id: string }> {
    const data = crearLoteSchema.parse(input);
    const producto = await productosRepository.buscarPorId(data.productoId);
    if (!producto) throw new ProductoNoEncontradoError(data.productoId);

    const lote = await productosRepository.crearLote({
      lote: data.lote,
      caducidad: data.caducidad,
      cantidad: data.cantidad,
      costoUnitario: data.costoUnitario,
      producto: { connect: { id: data.productoId } },
    });

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "productos",
      accion: "crear_lote",
      entidad: "producto_lote",
      entidadId: lote.id,
      despues: { productoId: data.productoId, lote: data.lote },
    });
    await eventBus.emit(PRODUCTO_EVENTS.LOTE_CREADO, {
      productoId: data.productoId,
      loteId: lote.id,
      lote: data.lote,
      caducidad: data.caducidad,
      cantidad: data.cantidad,
    });

    return { id: lote.id };
  },
};

export const categoriasService = {
  async listar(): Promise<CategoriaListado[]> {
    const filas = await categoriasRepository.listar();
    return filas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion,
      activa: c.activa,
      productosCount: c._count.productos,
    }));
  },

  async crear(input: CrearCategoriaInput, ctx: { usuarioId: string }) {
    const data = crearCategoriaSchema.parse(input);
    const existente = await categoriasRepository.buscarPorNombre(data.nombre);
    if (existente) throw new CategoriaDuplicadaError(data.nombre);
    const categoria = await categoriasRepository.crear(data);
    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "productos",
      accion: "crear_categoria",
      entidad: "categoria",
      entidadId: categoria.id,
      despues: data,
    });
    return categoria;
  },

  async actualizar(input: ActualizarCategoriaInput, ctx: { usuarioId: string }) {
    const data = actualizarCategoriaSchema.parse(input);
    const actual = await categoriasRepository.buscarPorId(data.id);
    if (!actual) throw new Error("Categoría no encontrada");
    if (data.nombre && data.nombre !== actual.nombre) {
      const duplicada = await categoriasRepository.buscarPorNombre(data.nombre);
      if (duplicada && duplicada.id !== actual.id) throw new CategoriaDuplicadaError(data.nombre);
    }
    const actualizada = await categoriasRepository.actualizar(data.id, {
      nombre: data.nombre,
      descripcion: data.descripcion,
      activa: data.activa,
    });
    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "productos",
      accion: "editar_categoria",
      entidad: "categoria",
      entidadId: data.id,
      antes: { nombre: actual.nombre, activa: actual.activa },
      despues: { nombre: actualizada.nombre, activa: actualizada.activa },
    });
    return actualizada;
  },
};
