import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

const ocConDetalles = {
  proveedor: { select: { id: true, nombre: true } },
  ubicacionDestino: { select: { id: true, nombre: true } },
  usuario: { select: { nombre: true } },
  lineas: { orderBy: { productoNombre: "asc" } },
  recepciones: {
    orderBy: { fechaRecepcion: "desc" },
    include: {
      usuario: { select: { nombre: true } },
      _count: { select: { lineas: true } },
    },
  },
} satisfies Prisma.OrdenCompraInclude;

const ocListadoSelect = {
  id: true,
  folio: true,
  createdAt: true,
  estado: true,
  total: true,
  proveedor: { select: { id: true, nombre: true } },
  ubicacionDestino: { select: { nombre: true } },
  lineas: {
    select: { cantidadSolicitada: true, cantidadRecibida: true },
  },
} satisfies Prisma.OrdenCompraSelect;

export const comprasRepository = {
  listarOrdenes(opts: { estado?: string; proveedorId?: string; limit?: number } = {}) {
    const where: Prisma.OrdenCompraWhereInput = {};
    if (opts.estado) where.estado = opts.estado as Prisma.EnumEstadoOrdenCompraFilter["equals"];
    if (opts.proveedorId) where.proveedorId = opts.proveedorId;
    return prisma.ordenCompra.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 100,
      select: ocListadoSelect,
    });
  },

  obtenerOrden(id: string) {
    return prisma.ordenCompra.findUnique({
      where: { id },
      include: ocConDetalles,
    });
  },

  proximoFolioOC(tx: Prisma.TransactionClient) {
    const año = new Date().getFullYear();
    return tx.ordenCompra
      .count({ where: { folio: { startsWith: `OC-${año}-` } } })
      .then((n) => `OC-${año}-${String(n + 1).padStart(5, "0")}`);
  },

  proximoFolioRecepcion(tx: Prisma.TransactionClient) {
    const año = new Date().getFullYear();
    return tx.recepcionMercancia
      .count({ where: { folio: { startsWith: `REC-${año}-` } } })
      .then((n) => `REC-${año}-${String(n + 1).padStart(5, "0")}`);
  },

  obtenerRecepcion(id: string) {
    return prisma.recepcionMercancia.findUnique({
      where: { id },
      include: {
        ordenCompra: { select: { folio: true, proveedor: { select: { nombre: true } } } },
        ubicacion: { select: { id: true, nombre: true } },
        usuario: { select: { nombre: true } },
        lineas: {
          include: {
            producto: { select: { sku: true, nombre: true, unidadMedida: true } },
          },
        },
      },
    });
  },

  listarRecepciones(opts: { ordenCompraId?: string; limit?: number } = {}) {
    const where: Prisma.RecepcionMercanciaWhereInput = {};
    if (opts.ordenCompraId) where.ordenCompraId = opts.ordenCompraId;
    return prisma.recepcionMercancia.findMany({
      where,
      orderBy: { fechaRecepcion: "desc" },
      take: opts.limit ?? 50,
      include: {
        ordenCompra: { select: { folio: true, proveedor: { select: { nombre: true } } } },
        ubicacion: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
        _count: { select: { lineas: true } },
      },
    });
  },

  // Todos los productos activos, para el selector de la OC (no solo del proveedor).
  productosParaOc() {
    return prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      take: 1000,
      select: {
        id: true,
        sku: true,
        nombre: true,
        unidadMedida: true,
        ivaAplicable: true,
        ultimoCosto: true,
      },
    });
  },

  // Catálogo del proveedor para sugerir líneas al crear una OC.
  sugerenciasDeProveedor(proveedorId: string) {
    return prisma.proveedorProducto.findMany({
      where: { proveedorId, producto: { activo: true } },
      orderBy: [{ esPreferido: "desc" }, { producto: { nombre: "asc" } }],
      include: {
        producto: {
          select: { id: true, sku: true, nombre: true, unidadMedida: true, ivaAplicable: true },
        },
      },
    });
  },
};
