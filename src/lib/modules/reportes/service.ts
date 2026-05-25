import { reportesRepository } from "./repository";
import { filtroReporteSchema, type FiltroReporteInput } from "./schemas";
import type {
  ProductosVendidosFila,
  ProductosVendidosReporte,
  VentasDelDiaReporte,
  VentasPorUsuarioFila,
  VentasPorUsuarioReporte,
} from "./types";

const { toNum } = reportesRepository.helpers;

async function nombreUbicacion(ubicacionId?: string) {
  if (!ubicacionId) return null;
  const u = await reportesRepository.ubicacionPorId(ubicacionId);
  return u?.nombre ?? null;
}

export const reportesService = {
  async ventasDelDia(input: FiltroReporteInput): Promise<VentasDelDiaReporte> {
    const filtro = filtroReporteSchema.parse(input);
    const w = { desde: filtro.desde, hasta: filtro.hasta, ubicacionId: filtro.ubicacionId };

    const [activas, canceladas, ubicacionNombre] = await Promise.all([
      reportesRepository.ventasEnRango(w),
      reportesRepository.ventasCanceladasEnRango(w),
      nombreUbicacion(filtro.ubicacionId),
    ]);

    const totalVendido = activas.reduce((acc, v) => acc + toNum(v.total), 0);
    const numTickets = activas.length;
    const ticketPromedio = numTickets > 0 ? totalVendido / numTickets : 0;

    // Acumulador por hora (00..23) usando hora local del servidor.
    const porHoraMap = new Map<number, { numTickets: number; total: number }>();
    for (const v of activas) {
      const hora = v.fechaVenta.getHours();
      const cur = porHoraMap.get(hora) ?? { numTickets: 0, total: 0 };
      cur.numTickets += 1;
      cur.total += toNum(v.total);
      porHoraMap.set(hora, cur);
    }
    const porHora = Array.from(porHoraMap.entries())
      .map(([hora, agg]) => ({ hora, ...agg }))
      .sort((a, b) => a.hora - b.hora);

    const pagos = await reportesRepository.pagosDeVentas(activas.map((v) => v.id));
    const porFormaMap = new Map<string, number>();
    for (const p of pagos) {
      porFormaMap.set(p.forma, (porFormaMap.get(p.forma) ?? 0) + toNum(p.monto));
    }
    const porFormaPago = Array.from(porFormaMap.entries())
      .map(([forma, monto]) => ({ forma, monto }))
      .sort((a, b) => b.monto - a.monto);

    return {
      rango: { desde: filtro.desde, hasta: filtro.hasta },
      ubicacionId: filtro.ubicacionId ?? null,
      ubicacionNombre,
      totalVendido,
      numTickets,
      ticketPromedio,
      totalCancelado: canceladas.reduce((acc, v) => acc + toNum(v.total), 0),
      numTicketsCancelados: canceladas.length,
      porHora,
      porFormaPago,
    };
  },

  async productosVendidos(input: FiltroReporteInput): Promise<ProductosVendidosReporte> {
    const filtro = filtroReporteSchema.parse(input);
    const w = { desde: filtro.desde, hasta: filtro.hasta, ubicacionId: filtro.ubicacionId };

    const [lineas, ubicacionNombre] = await Promise.all([
      reportesRepository.lineasEnRango(w),
      nombreUbicacion(filtro.ubicacionId),
    ]);

    const agg = new Map<string, ProductosVendidosFila>();
    for (const l of lineas) {
      const cur = agg.get(l.productoId);
      const cantidad = toNum(l.cantidad);
      const monto = toNum(l.total);
      if (cur) {
        cur.cantidad += cantidad;
        cur.montoTotal += monto;
      } else {
        agg.set(l.productoId, {
          productoId: l.productoId,
          sku: l.producto.sku,
          nombre: l.producto.nombre,
          unidadMedida: l.producto.unidadMedida,
          categoria: l.producto.categoria?.nombre ?? null,
          cantidad,
          montoTotal: monto,
        });
      }
    }

    const filas = Array.from(agg.values()).sort((a, b) => b.montoTotal - a.montoTotal);
    return {
      rango: { desde: filtro.desde, hasta: filtro.hasta },
      ubicacionId: filtro.ubicacionId ?? null,
      ubicacionNombre,
      filas,
      totalCantidad: filas.reduce((acc, f) => acc + f.cantidad, 0),
      totalMonto: filas.reduce((acc, f) => acc + f.montoTotal, 0),
    };
  },

  async ventasPorUsuario(input: FiltroReporteInput): Promise<VentasPorUsuarioReporte> {
    const filtro = filtroReporteSchema.parse(input);
    const w = { desde: filtro.desde, hasta: filtro.hasta, ubicacionId: filtro.ubicacionId };

    const [activas, ubicacionNombre] = await Promise.all([
      reportesRepository.ventasEnRango(w),
      nombreUbicacion(filtro.ubicacionId),
    ]);

    const agg = new Map<string, VentasPorUsuarioFila>();
    for (const v of activas) {
      const cur = agg.get(v.usuarioId);
      const monto = toNum(v.total);
      if (cur) {
        cur.numTickets += 1;
        cur.total += monto;
      } else {
        agg.set(v.usuarioId, {
          usuarioId: v.usuarioId,
          usuarioNombre: v.usuario.nombre,
          numTickets: 1,
          total: monto,
          ticketPromedio: 0,
        });
      }
    }
    for (const f of agg.values()) {
      f.ticketPromedio = f.numTickets > 0 ? f.total / f.numTickets : 0;
    }
    const filas = Array.from(agg.values()).sort((a, b) => b.total - a.total);

    return {
      rango: { desde: filtro.desde, hasta: filtro.hasta },
      ubicacionId: filtro.ubicacionId ?? null,
      ubicacionNombre,
      filas,
      totalGeneral: filas.reduce((acc, f) => acc + f.total, 0),
      numTicketsGeneral: filas.reduce((acc, f) => acc + f.numTickets, 0),
    };
  },
};
