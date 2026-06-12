import { Prisma, type TipoPrecio } from "@prisma/client";
import { prisma } from "../shared/db";

export const productosRepository = {
  listar(opts: { q?: string; tipo?: Prisma.ProductoWhereInput["tipo"]; soloActivos?: boolean } = {}) {
    const where: Prisma.ProductoWhereInput = {};
    if (opts.soloActivos !== false) where.activo = true;
    if (opts.tipo) where.tipo = opts.tipo;
    if (opts.q && opts.q.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { sku: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
        { codigoBarras: { contains: q, mode: "insensitive" } },
        { marca: { contains: q, mode: "insensitive" } },
      ];
    }
    return prisma.producto.findMany({
      where,
      orderBy: { nombre: "asc" },
      include: {
        categoria: { select: { nombre: true } },
        precios: { where: { tipo: "PUBLICO" }, select: { precio: true } },
        inventarios: { select: { stock: true } },
        productoGranel: { select: { nombre: true, unidadMedida: true } },
      },
      take: 200,
    });
  },

  buscarPorId(id: string) {
    return prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        precios: true,
        lotes: { orderBy: { caducidad: "asc" } },
      },
    });
  },

  buscarPorSku(sku: string) {
    return prisma.producto.findUnique({ where: { sku: sku.toUpperCase() } });
  },

  buscarPorCodigoBarras(codigo: string) {
    return prisma.producto.findUnique({ where: { codigoBarras: codigo } });
  },

  crear(data: Prisma.ProductoCreateInput) {
    return prisma.producto.create({ data });
  },

  actualizar(id: string, data: Prisma.ProductoUpdateInput) {
    return prisma.producto.update({ where: { id }, data });
  },

  // Borra el producto. La BD limpia en cascada precios/lotes/stock/movimientos;
  // si hay ventas/compras (FK Restrict) lanza P2003 y el service lo maneja.
  eliminar(id: string) {
    return prisma.producto.delete({ where: { id } });
  },

  upsertPrecio(productoId: string, tipo: TipoPrecio, precio: number) {
    return prisma.productoPrecio.upsert({
      where: { productoId_tipo: { productoId, tipo } },
      update: { precio },
      create: { productoId, tipo, precio },
    });
  },

  crearLote(data: Prisma.ProductoLoteCreateInput) {
    return prisma.productoLote.create({ data });
  },
};

export const categoriasRepository = {
  listar() {
    return prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    });
  },

  buscarPorId(id: string) {
    return prisma.categoria.findUnique({ where: { id } });
  },

  buscarPorNombre(nombre: string) {
    return prisma.categoria.findUnique({ where: { nombre } });
  },

  crear(data: Prisma.CategoriaCreateInput) {
    return prisma.categoria.create({ data });
  },

  actualizar(id: string, data: Prisma.CategoriaUpdateInput) {
    return prisma.categoria.update({ where: { id }, data });
  },
};
