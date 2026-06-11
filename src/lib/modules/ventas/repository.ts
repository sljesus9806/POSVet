import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

/**
 * Lock asesor a nivel de transacción para serializar la generación de un folio
 * correlativo (que se calcula con COUNT, no atómico). Dos transacciones de la misma
 * serie no pueden calcular el mismo número: la 2ª se bloquea hasta que la 1ª hace
 * commit y entonces cuenta incluyendo la fila recién creada. Se libera solo al
 * terminar la transacción (commit o rollback). No requiere migración; `hashtext`
 * mapea la serie a un entero estable que sirve de llave del lock.
 */
async function lockSerieFolio(tx: Prisma.TransactionClient, serie: string): Promise<void> {
  // $executeRaw (no $queryRaw): pg_advisory_xact_lock devuelve `void` y $queryRaw no
  // puede deserializar esa columna; $executeRaw solo ejecuta y no lee columnas.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${serie})::bigint)`;
}

const ventaInclude = {
  caja: { select: { id: true, folio: true } },
  ubicacion: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true } },
  canceladaPor: { select: { id: true, nombre: true } },
  cliente: { select: { id: true, codigo: true, nombre: true, rfc: true } },
  lineas: {
    include: {
      lote: { select: { lote: true } },
    },
  },
  pagos: true,
  _count: { select: { lineas: true } },
} satisfies Prisma.VentaInclude;

export type VentaConRelaciones = Prisma.VentaGetPayload<{ include: typeof ventaInclude }>;

export const ventasRepository = {
  cajaAbiertaDeUsuario(usuarioId: string) {
    return prisma.caja.findFirst({
      where: { abiertaPorId: usuarioId, estado: "ABIERTA" },
      include: {
        ubicacion: { select: { id: true, nombre: true } },
        abiertaPor: { select: { id: true, nombre: true } },
        cerradaPor: { select: { id: true, nombre: true } },
      },
    });
  },

  listarCajas(opts: { estado?: "ABIERTA" | "CERRADA"; limit?: number } = {}) {
    return prisma.caja.findMany({
      where: { estado: opts.estado },
      include: {
        ubicacion: { select: { id: true, nombre: true } },
        abiertaPor: { select: { id: true, nombre: true } },
        cerradaPor: { select: { id: true, nombre: true } },
      },
      orderBy: { abiertaEn: "desc" },
      take: opts.limit ?? 50,
    });
  },

  obtenerCaja(id: string) {
    return prisma.caja.findUnique({
      where: { id },
      include: {
        ubicacion: { select: { id: true, nombre: true } },
        abiertaPor: { select: { id: true, nombre: true } },
        cerradaPor: { select: { id: true, nombre: true } },
      },
    });
  },

  // Totales de la caja a partir de las ventas no canceladas
  async resumenCaja(cajaId: string) {
    const ventas = await prisma.venta.findMany({
      where: { cajaId, estado: "COMPLETADA" },
      select: {
        total: true,
        cambio: true,
        pagos: { select: { forma: true, monto: true } },
      },
    });

    const totalVendido = ventas.reduce((acc, v) => acc + Number(v.total), 0);
    // El cambio devuelto sale del cajón (siempre en efectivo): se acumula para restarlo del esperado.
    const cambioTotal = ventas.reduce((acc, v) => acc + Number(v.cambio), 0);
    const desglose = new Map<string, number>();
    for (const v of ventas) {
      for (const p of v.pagos) {
        desglose.set(p.forma, (desglose.get(p.forma) ?? 0) + Number(p.monto));
      }
    }

    return {
      totalVendido,
      cambioTotal,
      totalVentas: ventas.length,
      desglose: Array.from(desglose.entries()).map(([forma, total]) => ({ forma: forma as never, total })),
    };
  },

  listarVentas(opts: {
    desde?: Date;
    hasta?: Date;
    ubicacionId?: string;
    usuarioId?: string;
    clienteId?: string;
    cajaId?: string;
    estado?: "COMPLETADA" | "CANCELADA";
    limit?: number;
  } = {}) {
    const where: Prisma.VentaWhereInput = {};
    if (opts.estado) where.estado = opts.estado;
    if (opts.ubicacionId) where.ubicacionId = opts.ubicacionId;
    if (opts.usuarioId) where.usuarioId = opts.usuarioId;
    if (opts.clienteId) where.clienteId = opts.clienteId;
    if (opts.cajaId) where.cajaId = opts.cajaId;
    if (opts.desde || opts.hasta) {
      where.fechaVenta = {};
      if (opts.desde) where.fechaVenta.gte = opts.desde;
      if (opts.hasta) where.fechaVenta.lte = opts.hasta;
    }
    return prisma.venta.findMany({
      where,
      include: ventaInclude,
      orderBy: { fechaVenta: "desc" },
      take: opts.limit ?? 100,
    });
  },

  obtenerVenta(id: string) {
    return prisma.venta.findUnique({
      where: { id },
      include: ventaInclude,
    });
  },

  // Generador de folios alineado al de transferencias: anual + correlativo.
  // El correlativo se calcula con COUNT (no atómico): para que dos transacciones
  // concurrentes no obtengan el mismo número, serializamos por serie con un lock
  // asesor de transacción (ver lockSerieFolio). Sin migración; preserva el formato.
  async proximoFolioVenta(tx: Prisma.TransactionClient) {
    const año = new Date().getFullYear();
    const serie = `V-${año}-`;
    await lockSerieFolio(tx, serie);
    const count = await tx.venta.count({ where: { folio: { startsWith: serie } } });
    return `${serie}${String(count + 1).padStart(6, "0")}`;
  },

  async proximoFolioCaja(tx: Prisma.TransactionClient) {
    const año = new Date().getFullYear();
    const serie = `C-${año}-`;
    await lockSerieFolio(tx, serie);
    const count = await tx.caja.count({ where: { folio: { startsWith: serie } } });
    return `${serie}${String(count + 1).padStart(5, "0")}`;
  },

  // Catálogo vendible: productos activos con precios + stock en una ubicación
  async productosVendibles(opts: { ubicacionId: string; q?: string; limit?: number }) {
    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        ...(opts.q?.trim()
          ? {
              OR: [
                { sku: { contains: opts.q.trim(), mode: "insensitive" } },
                { codigoBarras: { contains: opts.q.trim(), mode: "insensitive" } },
                { nombre: { contains: opts.q.trim(), mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        precios: true,
        inventarios: {
          where: { ubicacionId: opts.ubicacionId },
          select: { stock: true },
        },
      },
      orderBy: { nombre: "asc" },
      take: opts.limit ?? 50,
    });
    return productos;
  },
};
