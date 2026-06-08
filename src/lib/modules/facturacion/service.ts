import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { ventasService } from "@/lib/modules/ventas";
import { configuracionService } from "@/lib/modules/configuracion";
import { facturacionRepository, type FacturaConRelaciones } from "./repository";
import {
  crearPacClient,
  getFacturacionConfig,
  PacError,
  type ComprobanteCfdi,
} from "./pac";
import {
  FACTURA_EVENTS,
  type FacturaCanceladaPayload,
  type FacturaTimbradaPayload,
} from "./events";
import type { CancelarFacturaInput, EmitirFacturaInput } from "./schemas";
import type {
  FacturaDetalle,
  FacturaLineaItem,
  FacturaListado,
} from "./types";

export { PacError };

export class VentaParaFacturarNoEncontradaError extends Error {
  constructor() {
    super("La venta a facturar no existe.");
    this.name = "VentaParaFacturarNoEncontradaError";
  }
}

export class VentaNoFacturableError extends Error {
  constructor() {
    super("Solo se pueden facturar ventas completadas (no canceladas).");
    this.name = "VentaNoFacturableError";
  }
}

export class VentaYaFacturadaError extends Error {
  constructor(serieFolio: string) {
    super(`Esta venta ya tiene una factura vigente (${serieFolio}). Cancélala antes de volver a facturar.`);
    this.name = "VentaYaFacturadaError";
  }
}

export class DescuentoGlobalNoSoportadoError extends Error {
  constructor() {
    super(
      "Esta venta tiene un descuento global y por ahora la facturación CFDI no lo soporta. (Próxima fase.)",
    );
    this.name = "DescuentoGlobalNoSoportadoError";
  }
}

export class DatosFiscalesEmpresaIncompletosError extends Error {
  constructor() {
    super(
      "Faltan datos fiscales de tu negocio (RFC, razón social, régimen o código postal). Complétalos en Configuración antes de facturar.",
    );
    this.name = "DatosFiscalesEmpresaIncompletosError";
  }
}

export class FacturaNoEncontradaError extends Error {
  constructor() {
    super("Factura no encontrada.");
    this.name = "FacturaNoEncontradaError";
  }
}

export class FacturaYaCanceladaError extends Error {
  constructor() {
    super("La factura ya está cancelada.");
    this.name = "FacturaYaCanceladaError";
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Más decimales para el valor unitario neto (el CFDI permite hasta 6) y así
// evitar arrastres de redondeo al multiplicar por la cantidad.
function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function aListado(f: FacturaConRelaciones): FacturaListado {
  return {
    id: f.id,
    serie: f.serie,
    folio: f.folio,
    serieFolio: `${f.serie}-${f.folio}`,
    tipo: f.tipo,
    estado: f.estado,
    uuid: f.uuid,
    receptorRfc: f.receptorRfc,
    receptorNombre: f.receptorNombre,
    total: Number(f.total),
    esDemo: f.esDemo,
    fechaTimbrado: f.fechaTimbrado,
    ventaId: f.ventaId,
    ventaFolio: f.venta?.folio ?? null,
    usuarioNombre: f.usuario.nombre,
  };
}

function aDetalle(f: FacturaConRelaciones): FacturaDetalle {
  const lineas: FacturaLineaItem[] = f.lineas.map((l) => ({
    id: l.id,
    claveProdServ: l.claveProdServ,
    claveUnidad: l.claveUnidad,
    noIdentificacion: l.noIdentificacion,
    descripcion: l.descripcion,
    cantidad: Number(l.cantidad),
    valorUnitario: Number(l.valorUnitario),
    importe: Number(l.importe),
    descuento: Number(l.descuento),
    ivaTasa: Number(l.ivaTasa),
    ivaImporte: Number(l.ivaImporte),
  }));
  return {
    ...aListado(f),
    emisorRfc: f.emisorRfc,
    emisorNombre: f.emisorNombre,
    emisorRegimen: f.emisorRegimen,
    lugarExpedicion: f.lugarExpedicion,
    receptorRegimen: f.receptorRegimen,
    receptorUsoCfdi: f.receptorUsoCfdi,
    receptorCp: f.receptorCp,
    moneda: f.moneda,
    subtotal: Number(f.subtotal),
    descuento: Number(f.descuento),
    iva: Number(f.iva),
    formaPago: f.formaPago,
    metodoPago: f.metodoPago,
    selloCfd: f.selloCfd,
    selloSat: f.selloSat,
    noCertificadoSat: f.noCertificadoSat,
    motivoCancelacion: f.motivoCancelacion,
    folioSustitucion: f.folioSustitucion,
    canceladaEn: f.canceladaEn,
    canceladaPorNombre: f.canceladaPor?.nombre ?? null,
    pacProveedor: f.pacProveedor,
    lineas,
    createdAt: f.createdAt,
  };
}

export const facturacionService = {
  async listar(
    opts: { estado?: "TIMBRADA" | "CANCELADA"; q?: string; limit?: number } = {},
  ): Promise<FacturaListado[]> {
    const rows = await facturacionRepository.listar(opts);
    return rows.map(aListado);
  },

  async obtener(id: string): Promise<FacturaDetalle | null> {
    const f = await facturacionRepository.obtener(id);
    return f ? aDetalle(f) : null;
  },

  // XML timbrado crudo (documento fiscal) para descarga. Se expone aparte para
  // no cargar el XML completo en cada consulta del detalle.
  async obtenerXml(id: string): Promise<{ serieFolio: string; uuid: string | null; xml: string } | null> {
    const f = await facturacionRepository.obtener(id);
    if (!f) return null;
    return { serieFolio: `${f.serie}-${f.folio}`, uuid: f.uuid, xml: f.xml ?? "" };
  },

  // Factura vigente de una venta (para el botón "Facturar" en la venta).
  async facturaDeVenta(ventaId: string): Promise<FacturaListado | null> {
    const f = await facturacionRepository.facturaVigenteDeVenta(ventaId);
    return f ? aListado(f) : null;
  },

  async emitirDesdeVenta(
    input: EmitirFacturaInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<FacturaDetalle> {
    const cfg = getFacturacionConfig();

    // 1) Datos fiscales del emisor (negocio).
    const empresa = await configuracionService.obtenerEmpresaPrincipal();
    if (!empresa?.rfc || !empresa.razonSocial || !empresa.regimenFiscal || !empresa.codigoPostal) {
      throw new DatosFiscalesEmpresaIncompletosError();
    }

    // 2) Venta a facturar.
    const venta = await ventasService.obtenerVenta(input.ventaId);
    if (!venta) throw new VentaParaFacturarNoEncontradaError();
    if (venta.estado !== "COMPLETADA") throw new VentaNoFacturableError();
    if (Number(venta.descuentoGlobal) > 0) throw new DescuentoGlobalNoSoportadoError();

    const vigente = await facturacionRepository.facturaVigenteDeVenta(venta.id);
    if (vigente) throw new VentaYaFacturadaError(`${vigente.serie}-${vigente.folio}`);

    // 3) Conceptos a partir de las líneas de la venta.
    //
    // OJO con el IVA: en este POS los precios son IVA INCLUIDO. La línea ya trae
    // los importes desglosados y autoritativos:
    //   l.subtotal   = base neta (sin IVA, después de descuento)
    //   l.ivaImporte = IVA de esa base
    //   l.total      = l.subtotal + l.ivaImporte (lo que pagó el cliente)
    // El CFDI exige montos SIN IVA, así que partimos del neto, no del precio bruto.
    const conceptos = venta.lineas.map((l) => {
      const tasa = l.ivaTasa;
      const baseNeta = l.subtotal; // sin IVA, después de descuento
      const ivaImporte = l.ivaImporte;
      // El descuento de la línea viene en pesos con IVA incluido; lo pasamos a neto.
      const descuentoNeto = round2(tasa > 0 ? l.descuento / (1 + tasa) : l.descuento);
      const importeNeto = round2(baseNeta + descuentoNeto); // neto antes de descuento
      const valorUnitario = l.cantidad > 0 ? round6(importeNeto / l.cantidad) : round6(importeNeto);
      return {
        claveProdServ: cfg.claveProdServDefault,
        claveUnidad: cfg.claveUnidadDefault,
        noIdentificacion: l.productoSku || undefined,
        descripcion: l.productoNombre,
        cantidad: l.cantidad,
        valorUnitario,
        importe: importeNeto,
        descuento: descuentoNeto,
        objetoImp: ivaImporte > 0 ? "02" : "01",
        ivaTasa: tasa,
        ivaImporte,
      };
    });

    const subtotal = round2(conceptos.reduce((a, c) => a + c.importe, 0));
    const descuento = round2(conceptos.reduce((a, c) => a + c.descuento, 0));
    const iva = round2(conceptos.reduce((a, c) => a + c.ivaImporte, 0));
    const total = round2(subtotal - descuento + iva);

    const folio = await facturacionRepository.proximoFolio(cfg.serie);

    const cfdi: ComprobanteCfdi = {
      serie: cfg.serie,
      folio,
      lugarExpedicion: empresa.codigoPostal,
      moneda: "MXN",
      formaPago: input.formaPago,
      metodoPago: input.metodoPago,
      subtotal,
      descuento,
      total,
      emisor: {
        rfc: empresa.rfc,
        nombre: empresa.razonSocial,
        regimenFiscal: empresa.regimenFiscal,
      },
      receptor: {
        rfc: input.receptorRfc,
        nombre: input.receptorNombre,
        regimenFiscal: input.receptorRegimen,
        usoCfdi: input.receptorUsoCfdi,
        domicilioFiscalCp: input.receptorCp,
      },
      conceptos,
    };

    // 4) Timbrar con el PAC (red). Fuera de cualquier transacción de BD.
    const pac = crearPacClient();
    const timbre = await pac.timbrar(cfdi);

    // 5) Persistir el CFDI ya timbrado.
    const creada = await facturacionRepository.crear({
      serie: cfg.serie,
      folio,
      tipo: "INGRESO",
      emisorRfc: empresa.rfc,
      emisorNombre: empresa.razonSocial,
      emisorRegimen: empresa.regimenFiscal,
      lugarExpedicion: empresa.codigoPostal,
      receptorRfc: input.receptorRfc,
      receptorNombre: input.receptorNombre,
      receptorRegimen: input.receptorRegimen,
      receptorUsoCfdi: input.receptorUsoCfdi,
      receptorCp: input.receptorCp,
      moneda: "MXN",
      subtotal,
      descuento,
      iva,
      total,
      formaPago: input.formaPago,
      metodoPago: input.metodoPago,
      uuid: timbre.uuid,
      fechaTimbrado: timbre.fechaTimbrado,
      selloCfd: timbre.selloCfd,
      selloSat: timbre.selloSat,
      noCertificadoSat: timbre.noCertificadoSat,
      xml: timbre.xml,
      pacProveedor: pac.nombre,
      pacFacturaId: timbre.pacFacturaId,
      esDemo: pac.esDemo,
      ventaId: venta.id,
      usuarioId: ctx.usuarioId,
      lineas: conceptos.map((c) => ({
        claveProdServ: c.claveProdServ,
        claveUnidad: c.claveUnidad,
        noIdentificacion: c.noIdentificacion ?? null,
        descripcion: c.descripcion,
        cantidad: c.cantidad,
        valorUnitario: c.valorUnitario,
        importe: c.importe,
        descuento: c.descuento,
        objetoImp: c.objetoImp,
        ivaTasa: c.ivaTasa,
        ivaImporte: c.ivaImporte,
      })),
    });

    const detalle = aDetalle(creada);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "facturacion",
      accion: "timbrar",
      entidad: "factura",
      entidadId: creada.id,
      despues: { serieFolio: detalle.serieFolio, uuid: detalle.uuid, total, esDemo: pac.esDemo },
      ip: ctx.ip ?? null,
    });

    const payload: FacturaTimbradaPayload = {
      facturaId: creada.id,
      serieFolio: detalle.serieFolio,
      uuid: detalle.uuid,
      ventaId: venta.id,
      receptorRfc: detalle.receptorRfc,
      total,
      usuarioId: ctx.usuarioId,
      esDemo: pac.esDemo,
    };
    await eventBus.emit(FACTURA_EVENTS.TIMBRADA, payload);

    return detalle;
  },

  async cancelar(
    input: CancelarFacturaInput,
    ctx: { usuarioId: string; ip?: string | null },
  ): Promise<FacturaDetalle> {
    const f = await facturacionRepository.obtener(input.facturaId);
    if (!f) throw new FacturaNoEncontradaError();
    if (f.estado === "CANCELADA") throw new FacturaYaCanceladaError();

    const pac = crearPacClient();
    await pac.cancelar({
      pacFacturaId: f.pacFacturaId ?? "",
      uuid: f.uuid ?? "",
      motivo: input.motivo,
      folioSustitucion: input.folioSustitucion,
    });

    const actualizada = await facturacionRepository.marcarCancelada(f.id, {
      motivo: input.motivo,
      folioSustitucion: input.folioSustitucion ?? null,
      canceladaPorId: ctx.usuarioId,
    });

    const detalle = aDetalle(actualizada);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "facturacion",
      accion: "cancelar",
      entidad: "factura",
      entidadId: f.id,
      antes: { estado: "TIMBRADA" },
      despues: { estado: "CANCELADA", motivo: input.motivo },
      ip: ctx.ip ?? null,
    });

    const payload: FacturaCanceladaPayload = {
      facturaId: f.id,
      serieFolio: detalle.serieFolio,
      uuid: detalle.uuid,
      motivo: input.motivo,
      usuarioId: ctx.usuarioId,
    };
    await eventBus.emit(FACTURA_EVENTS.CANCELADA, payload);

    return detalle;
  },
};
