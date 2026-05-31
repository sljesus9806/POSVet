import { reportesRepository } from "./repository";
import {
  filtroCaducidadSchema,
  filtroInventarioActualSchema,
  filtroReporteSchema,
  filtroSinMovimientoSchema,
  type FiltroCaducidadInput,
  type FiltroInventarioActualInput,
  type FiltroReporteInput,
  type FiltroSinMovimientoInput,
} from "./schemas";
import type {
  CorteCajaFila,
  CorteCajasReporte,
  AntiguedadBucket,
  AntiguedadCxCFila,
  AntiguedadCxPFila,
  AntiguedadSaldosReporte,
  CaducidadBucket,
  InventarioActualFila,
  InventarioActualPorCategoria,
  InventarioActualReporte,
  ProductosPorCaducarReporte,
  ProductosSinMovimientoReporte,
  ProductosVendidosFila,
  ProductosVendidosReporte,
  ProductoSinMovimientoFila,
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

async function nombreCategoria(categoriaId?: string) {
  if (!categoriaId) return null;
  const c = await reportesRepository.categoriaPorId(categoriaId);
  return c?.nombre ?? null;
}

function bucketCaducidad(dias: number): CaducidadBucket {
  if (dias < 0) return "vencidos";
  if (dias <= 30) return "0-30";
  if (dias <= 60) return "31-60";
  if (dias <= 90) return "61-90";
  return "mas-90";
}

function bucketAntiguedad(diasTranscurridos: number): AntiguedadBucket {
  if (diasTranscurridos <= 30) return "0-30";
  if (diasTranscurridos <= 60) return "31-60";
  if (diasTranscurridos <= 90) return "61-90";
  return "mas-90";
}

const DAY_MS = 24 * 60 * 60 * 1000;

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

  // ===== Inventario actual valorizado =====
  async inventarioActual(input: FiltroInventarioActualInput): Promise<InventarioActualReporte> {
    const filtro = filtroInventarioActualSchema.parse(input);
    const [filasRaw, ubicacionNombre, categoriaNombre] = await Promise.all([
      reportesRepository.inventarioActual({
        ubicacionId: filtro.ubicacionId,
        categoriaId: filtro.categoriaId,
        soloConStock: filtro.soloConStock,
      }),
      nombreUbicacion(filtro.ubicacionId),
      nombreCategoria(filtro.categoriaId),
    ]);

    const filas: InventarioActualFila[] = filasRaw.map((row) => {
      const stock = toNum(row.stock);
      // Valoriza al costoPromedio si existe, si no ultimoCosto.
      const costoUnitario =
        toNum(row.producto.costoPromedio) || toNum(row.producto.ultimoCosto);
      const precioVenta = toNum(row.producto.precios[0]?.precio);
      return {
        productoId: row.productoId,
        sku: row.producto.sku,
        nombre: row.producto.nombre,
        unidadMedida: row.producto.unidadMedida,
        categoria: row.producto.categoria?.nombre ?? null,
        ubicacionId: row.ubicacionId,
        ubicacionNombre: row.ubicacion.nombre,
        stock,
        costoUnitario,
        precioVenta,
        valorCosto: stock * costoUnitario,
        valorVenta: stock * precioVenta,
      };
    });

    const totalCosto = filas.reduce((acc, f) => acc + f.valorCosto, 0);
    const totalVenta = filas.reduce((acc, f) => acc + f.valorVenta, 0);

    const porCatMap = new Map<string, InventarioActualPorCategoria>();
    for (const f of filas) {
      const key = f.categoria ?? "Sin categoría";
      const cur = porCatMap.get(key) ?? { categoria: key, valorCosto: 0, valorVenta: 0 };
      cur.valorCosto += f.valorCosto;
      cur.valorVenta += f.valorVenta;
      porCatMap.set(key, cur);
    }
    const porCategoria = Array.from(porCatMap.values()).sort(
      (a, b) => b.valorCosto - a.valorCosto,
    );

    return {
      ubicacionId: filtro.ubicacionId ?? null,
      ubicacionNombre,
      categoriaId: filtro.categoriaId ?? null,
      categoriaNombre,
      soloConStock: filtro.soloConStock,
      filas,
      totalCosto,
      totalVenta,
      margenPotencial: totalVenta - totalCosto,
      porCategoria,
    };
  },

  // ===== Productos por caducar =====
  async productosPorCaducar(input: FiltroCaducidadInput): Promise<ProductosPorCaducarReporte> {
    const filtro = filtroCaducidadSchema.parse(input);
    const lotes = await reportesRepository.lotesPorCaducar({ dias: filtro.dias });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const filas = lotes.map((l) => {
      const diff = Math.floor((l.caducidad.getTime() - hoy.getTime()) / DAY_MS);
      const cantidad = toNum(l.cantidad);
      const costoUnitario = toNum(l.costoUnitario);
      return {
        loteId: l.id,
        productoId: l.productoId,
        sku: l.producto.sku,
        nombre: l.producto.nombre,
        unidadMedida: l.producto.unidadMedida,
        lote: l.lote,
        caducidad: l.caducidad,
        diasParaCaducar: diff,
        cantidad,
        costoUnitario,
        bucket: bucketCaducidad(diff),
      };
    });

    const BUCKETS: Array<{ key: CaducidadBucket; label: string }> = [
      { key: "vencidos", label: "Vencidos" },
      { key: "0-30", label: "0 a 30 días" },
      { key: "31-60", label: "31 a 60 días" },
      { key: "61-90", label: "61 a 90 días" },
      { key: "mas-90", label: "Más de 90 días" },
    ];
    const porBucket = BUCKETS.map((b) => {
      const subset = filas.filter((f) => f.bucket === b.key);
      return {
        bucket: b.key,
        label: b.label,
        numLotes: subset.length,
        cantidad: subset.reduce((a, f) => a + f.cantidad, 0),
        valorCosto: subset.reduce((a, f) => a + f.cantidad * f.costoUnitario, 0),
      };
    });

    return {
      diasUmbral: filtro.dias,
      filas,
      porBucket,
      totalLotes: filas.length,
      totalCantidad: filas.reduce((a, f) => a + f.cantidad, 0),
      totalValorCosto: filas.reduce((a, f) => a + f.cantidad * f.costoUnitario, 0),
    };
  },

  // ===== Antigüedad CxC =====
  async antiguedadSaldosCxC(): Promise<AntiguedadSaldosReporte<AntiguedadCxCFila>> {
    const ventas = await reportesRepository.ventasConSaldoCredito();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const agg = new Map<string, AntiguedadCxCFila>();
    for (const v of ventas) {
      if (!v.clienteId) continue;
      const diff = Math.floor((hoy.getTime() - v.fechaVenta.getTime()) / DAY_MS);
      const bucket = bucketAntiguedad(diff);
      const monto = toNum(v.saldoCredito);

      const cur =
        agg.get(v.clienteId) ??
        ({
          clienteId: v.clienteId,
          clienteCodigo: v.cliente?.codigo ?? "—",
          clienteNombre: v.cliente?.nombre ?? "—",
          numDocumentos: 0,
          bucket0_30: 0,
          bucket31_60: 0,
          bucket61_90: 0,
          bucketMas90: 0,
          total: 0,
        } satisfies AntiguedadCxCFila);
      cur.numDocumentos += 1;
      cur.total += monto;
      if (bucket === "0-30") cur.bucket0_30 += monto;
      else if (bucket === "31-60") cur.bucket31_60 += monto;
      else if (bucket === "61-90") cur.bucket61_90 += monto;
      else cur.bucketMas90 += monto;
      agg.set(v.clienteId, cur);
    }

    const filas = Array.from(agg.values()).sort((a, b) => b.total - a.total);
    return {
      fechaCorte: hoy,
      filas,
      totalGeneral: filas.reduce((a, f) => a + f.total, 0),
      totalBucket0_30: filas.reduce((a, f) => a + f.bucket0_30, 0),
      totalBucket31_60: filas.reduce((a, f) => a + f.bucket31_60, 0),
      totalBucket61_90: filas.reduce((a, f) => a + f.bucket61_90, 0),
      totalBucketMas90: filas.reduce((a, f) => a + f.bucketMas90, 0),
    };
  },

  // ===== Antigüedad CxP =====
  async antiguedadSaldosCxP(): Promise<AntiguedadSaldosReporte<AntiguedadCxPFila>> {
    const facturas = await reportesRepository.facturasProveedorConSaldo();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const agg = new Map<string, AntiguedadCxPFila>();
    for (const f of facturas) {
      const diff = Math.floor((hoy.getTime() - f.fechaEmision.getTime()) / DAY_MS);
      const bucket = bucketAntiguedad(diff);
      const monto = toNum(f.saldo);

      const cur =
        agg.get(f.proveedorId) ??
        ({
          proveedorId: f.proveedorId,
          proveedorCodigo: f.proveedor.codigo,
          proveedorNombre: f.proveedor.nombre,
          numDocumentos: 0,
          bucket0_30: 0,
          bucket31_60: 0,
          bucket61_90: 0,
          bucketMas90: 0,
          total: 0,
        } satisfies AntiguedadCxPFila);
      cur.numDocumentos += 1;
      cur.total += monto;
      if (bucket === "0-30") cur.bucket0_30 += monto;
      else if (bucket === "31-60") cur.bucket31_60 += monto;
      else if (bucket === "61-90") cur.bucket61_90 += monto;
      else cur.bucketMas90 += monto;
      agg.set(f.proveedorId, cur);
    }

    const filas = Array.from(agg.values()).sort((a, b) => b.total - a.total);
    return {
      fechaCorte: hoy,
      filas,
      totalGeneral: filas.reduce((a, f) => a + f.total, 0),
      totalBucket0_30: filas.reduce((a, f) => a + f.bucket0_30, 0),
      totalBucket31_60: filas.reduce((a, f) => a + f.bucket31_60, 0),
      totalBucket61_90: filas.reduce((a, f) => a + f.bucket61_90, 0),
      totalBucketMas90: filas.reduce((a, f) => a + f.bucketMas90, 0),
    };
  },

  // ===== Productos sin movimiento =====
  async productosSinMovimiento(
    input: FiltroSinMovimientoInput,
  ): Promise<ProductosSinMovimientoReporte> {
    const filtro = filtroSinMovimientoSchema.parse(input);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const cortePorFecha = new Date(hoy.getTime() - filtro.dias * DAY_MS);

    const [ultimas, categoriaNombre] = await Promise.all([
      reportesRepository.ultimasVentasPorProducto({ categoriaId: filtro.categoriaId }),
      nombreCategoria(filtro.categoriaId),
    ]);

    // Sin venta nunca o última venta < cortePorFecha.
    const candidatos = ultimas.filter(
      (u) => u.ultimaVenta === null || u.ultimaVenta < cortePorFecha,
    );
    const productos = await reportesRepository.productosPorIds(
      candidatos.map((c) => c.productoId),
    );

    const stockMap = await reportesRepository.stockTotalPorProducto(
      productos.map((p) => p.id),
    );

    const ultimaPorProd = new Map(candidatos.map((c) => [c.productoId, c.ultimaVenta]));

    const filas: ProductoSinMovimientoFila[] = productos.map((p) => {
      const stockTotal = stockMap.get(p.id) ?? 0;
      const costoUnitario = toNum(p.costoPromedio) || toNum(p.ultimoCosto);
      const ultimaVenta = ultimaPorProd.get(p.id) ?? null;
      const diasSinVenta = ultimaVenta
        ? Math.floor((hoy.getTime() - ultimaVenta.getTime()) / DAY_MS)
        : 999999;
      return {
        productoId: p.id,
        sku: p.sku,
        nombre: p.nombre,
        unidadMedida: p.unidadMedida,
        categoria: p.categoria?.nombre ?? null,
        ultimaVenta,
        diasSinVenta,
        stockTotal,
        valorCosto: stockTotal * costoUnitario,
      };
    });

    const filtradas = filtro.soloConStock ? filas.filter((f) => f.stockTotal > 0) : filas;
    filtradas.sort((a, b) => b.diasSinVenta - a.diasSinVenta);

    return {
      fechaCorte: hoy,
      diasUmbral: filtro.dias,
      categoriaId: filtro.categoriaId ?? null,
      categoriaNombre,
      soloConStock: filtro.soloConStock,
      filas: filtradas,
      totalProductos: filtradas.length,
      totalValorCosto: filtradas.reduce((a, f) => a + f.valorCosto, 0),
    };
  },

  // ===== Corte de caja: resumen de cajas (sesiones) en un rango =====
  async corteCajas(input: FiltroReporteInput): Promise<CorteCajasReporte> {
    const filtro = filtroReporteSchema.parse(input);
    const [cajas, ubicacionNombre] = await Promise.all([
      reportesRepository.cajasEnRango({
        desde: filtro.desde,
        hasta: filtro.hasta,
        ubicacionId: filtro.ubicacionId,
      }),
      nombreUbicacion(filtro.ubicacionId),
    ]);

    const filas: CorteCajaFila[] = cajas.map((c) => ({
      id: c.id,
      folio: c.folio,
      estado: c.estado,
      ubicacionNombre: c.ubicacion.nombre,
      abiertaPorNombre: c.abiertaPor.nombre,
      cerradaPorNombre: c.cerradaPor?.nombre ?? null,
      abiertaEn: c.abiertaEn,
      cerradaEn: c.cerradaEn,
      fondoInicial: toNum(c.fondoInicial),
      totalVendido: toNum(c.totalVendido),
      numVentas: c._count.ventas,
      efectivoEsperado: c.montoEsperadoEfectivo != null ? toNum(c.montoEsperadoEfectivo) : null,
      montoContado: c.montoContadoEfectivo != null ? toNum(c.montoContadoEfectivo) : null,
      diferencia: c.diferenciaEfectivo != null ? toNum(c.diferenciaEfectivo) : null,
    }));

    return {
      rango: { desde: filtro.desde, hasta: filtro.hasta },
      ubicacionId: filtro.ubicacionId ?? null,
      ubicacionNombre,
      filas,
      numCajas: filas.length,
      totalFondo: filas.reduce((a, f) => a + f.fondoInicial, 0),
      totalVendido: filas.reduce((a, f) => a + f.totalVendido, 0),
      totalContado: filas.reduce((a, f) => a + (f.montoContado ?? 0), 0),
      totalDiferencia: filas.reduce((a, f) => a + (f.diferencia ?? 0), 0),
    };
  },
};
