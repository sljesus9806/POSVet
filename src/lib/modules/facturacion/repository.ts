import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

const facturaInclude = {
  venta: { select: { id: true, folio: true } },
  usuario: { select: { id: true, nombre: true } },
  canceladaPor: { select: { id: true, nombre: true } },
  lineas: true,
} satisfies Prisma.FacturaInclude;

export type FacturaConRelaciones = Prisma.FacturaGetPayload<{ include: typeof facturaInclude }>;

export type CrearFacturaLineaData = {
  claveProdServ: string;
  claveUnidad: string;
  noIdentificacion: string | null;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number;
  descuento: number;
  objetoImp: string;
  ivaTasa: number;
  ivaImporte: number;
};

export type CrearFacturaData = {
  serie: string;
  folio: number;
  tipo: "INGRESO" | "EGRESO" | "PAGO";
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimen: string;
  lugarExpedicion: string;
  receptorRfc: string;
  receptorNombre: string;
  receptorRegimen: string;
  receptorUsoCfdi: string;
  receptorCp: string;
  moneda: string;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  formaPago: string;
  metodoPago: string;
  uuid: string;
  fechaTimbrado: Date;
  selloCfd: string;
  selloSat: string;
  noCertificadoSat: string;
  xml: string;
  pacProveedor: string;
  pacFacturaId: string;
  esDemo: boolean;
  ventaId: string;
  usuarioId: string;
  lineas: CrearFacturaLineaData[];
};

export const facturacionRepository = {
  listar(opts: { estado?: "TIMBRADA" | "CANCELADA"; ventaId?: string; q?: string; limit?: number } = {}) {
    const where: Prisma.FacturaWhereInput = {};
    if (opts.estado) where.estado = opts.estado;
    if (opts.ventaId) where.ventaId = opts.ventaId;
    if (opts.q?.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { receptorRfc: { contains: q, mode: "insensitive" } },
        { receptorNombre: { contains: q, mode: "insensitive" } },
        { uuid: { contains: q, mode: "insensitive" } },
      ];
    }
    return prisma.factura.findMany({
      where,
      include: facturaInclude,
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 100,
    });
  },

  obtener(id: string) {
    return prisma.factura.findUnique({ where: { id }, include: facturaInclude });
  },

  // Factura vigente (timbrada) de una venta, si existe.
  facturaVigenteDeVenta(ventaId: string) {
    return prisma.factura.findFirst({
      where: { ventaId, estado: "TIMBRADA" },
      include: facturaInclude,
    });
  },

  // Correlativo por serie: igual patrón que folios de ventas/cajas. La unicidad
  // real la garantiza @@unique([serie, folio]); facturación es de baja
  // concurrencia (una persona emitiendo), así que basta con max+1.
  async proximoFolio(serie: string): Promise<number> {
    const max = await prisma.factura.aggregate({
      where: { serie },
      _max: { folio: true },
    });
    return (max._max.folio ?? 0) + 1;
  },

  crear(data: CrearFacturaData) {
    const { lineas, ...factura } = data;
    return prisma.factura.create({
      data: {
        ...factura,
        estado: "TIMBRADA",
        lineas: { create: lineas },
      },
      include: facturaInclude,
    });
  },

  marcarCancelada(
    id: string,
    data: { motivo: string; folioSustitucion: string | null; canceladaPorId: string },
  ) {
    return prisma.factura.update({
      where: { id },
      data: {
        estado: "CANCELADA",
        motivoCancelacion: data.motivo,
        folioSustitucion: data.folioSustitucion,
        canceladaEn: new Date(),
        canceladaPorId: data.canceladaPorId,
      },
      include: facturaInclude,
    });
  },
};
