import { prisma } from "@/lib/modules/shared/db";
import type { Prisma } from "@prisma/client";

// Decimal de Prisma -> number. Las cantidades de un reporte caben en JS number
// sin pérdida (totales por día/semana en moneda con 2 decimales).
const toNum = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === "number" ? d : Number(d.toString());

export type WindowVentas = {
  desde: Date;
  hasta: Date;
  ubicacionId?: string;
};

export const reportesRepository = {
  // Ventas no canceladas dentro del rango (sólo lo que efectivamente entró a caja).
  async ventasEnRango(w: WindowVentas) {
    return prisma.venta.findMany({
      where: {
        fechaVenta: { gte: w.desde, lte: w.hasta },
        estado: { not: "CANCELADA" },
        ...(w.ubicacionId ? { ubicacionId: w.ubicacionId } : {}),
      },
      select: {
        id: true,
        fechaVenta: true,
        total: true,
        usuarioId: true,
        usuario: { select: { nombre: true } },
      },
    });
  },

  async ventasCanceladasEnRango(w: WindowVentas) {
    return prisma.venta.findMany({
      where: {
        canceladaEn: { gte: w.desde, lte: w.hasta },
        estado: "CANCELADA",
        ...(w.ubicacionId ? { ubicacionId: w.ubicacionId } : {}),
      },
      select: { id: true, total: true },
    });
  },

  async pagosDeVentas(ventaIds: string[]) {
    if (ventaIds.length === 0) return [];
    return prisma.ventaPago.findMany({
      where: { ventaId: { in: ventaIds } },
      select: { forma: true, monto: true },
    });
  },

  async lineasEnRango(w: WindowVentas) {
    return prisma.ventaLinea.findMany({
      where: {
        venta: {
          fechaVenta: { gte: w.desde, lte: w.hasta },
          estado: { not: "CANCELADA" },
          ...(w.ubicacionId ? { ubicacionId: w.ubicacionId } : {}),
        },
      },
      select: {
        productoId: true,
        cantidad: true,
        total: true,
        producto: {
          select: {
            sku: true,
            nombre: true,
            unidadMedida: true,
            categoria: { select: { nombre: true } },
          },
        },
      },
    });
  },

  async ubicacionPorId(id: string) {
    return prisma.ubicacion.findUnique({
      where: { id },
      select: { id: true, nombre: true },
    });
  },

  helpers: { toNum },
};
