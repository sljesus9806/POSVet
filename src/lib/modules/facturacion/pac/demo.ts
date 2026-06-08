import { randomUUID } from "node:crypto";
import type {
  CancelacionResultado,
  CancelarInput,
  ComprobanteCfdi,
  PacClient,
  TimbreResultado,
} from "./types";

// Cliente de timbrado SIMULADO. No contacta al SAT: genera un UUID y un XML de
// apariencia válida para poder probar el flujo completo (emitir → ver → cancelar)
// sin credenciales de PAC. Las facturas que produce llevan `esDemo = true` y NO
// tienen validez fiscal. Es el modo por defecto (FACTURACION_MODO=demo).

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlDemo(cfdi: ComprobanteCfdi, uuid: string, fecha: Date): string {
  const conceptos = cfdi.conceptos
    .map(
      (c) =>
        `    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}" Cantidad="${c.cantidad}" ` +
        `ClaveUnidad="${c.claveUnidad}" Descripcion="${esc(c.descripcion)}" ` +
        `ValorUnitario="${c.valorUnitario.toFixed(2)}" Importe="${c.importe.toFixed(2)}" ` +
        `Descuento="${c.descuento.toFixed(2)}" ObjetoImp="${c.objetoImp}"/>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- CFDI DE PRUEBA (DEMO) - SIN VALIDEZ FISCAL -->
<cfdi:Comprobante Version="4.0" Serie="${cfdi.serie}" Folio="${cfdi.folio}" ` +
    `Fecha="${fecha.toISOString().slice(0, 19)}" SubTotal="${cfdi.subtotal.toFixed(2)}" ` +
    `Descuento="${cfdi.descuento.toFixed(2)}" Total="${cfdi.total.toFixed(2)}" ` +
    `Moneda="${cfdi.moneda}" TipoDeComprobante="I" MetodoPago="${cfdi.metodoPago}" ` +
    `FormaPago="${cfdi.formaPago}" LugarExpedicion="${cfdi.lugarExpedicion}">
  <cfdi:Emisor Rfc="${cfdi.emisor.rfc}" Nombre="${esc(cfdi.emisor.nombre)}" RegimenFiscal="${cfdi.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${cfdi.receptor.rfc}" Nombre="${esc(cfdi.receptor.nombre)}" ` +
    `UsoCFDI="${cfdi.receptor.usoCfdi}" RegimenFiscalReceptor="${cfdi.receptor.regimenFiscal}" ` +
    `DomicilioFiscalReceptor="${cfdi.receptor.domicilioFiscalCp}"/>
  <cfdi:Conceptos>
${conceptos}
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="${uuid}" FechaTimbrado="${fecha.toISOString().slice(0, 19)}" ` +
    `SelloCFD="DEMO-SELLO-CFD" SelloSAT="DEMO-SELLO-SAT" NoCertificadoSAT="00000000000000000000"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}

export class DemoPacClient implements PacClient {
  readonly nombre = "demo";
  readonly esDemo = true;

  async timbrar(cfdi: ComprobanteCfdi): Promise<TimbreResultado> {
    const uuid = randomUUID().toUpperCase();
    const fecha = new Date();
    return {
      uuid,
      fechaTimbrado: fecha,
      selloCfd: "DEMO-SELLO-CFD",
      selloSat: "DEMO-SELLO-SAT",
      noCertificadoSat: "00000000000000000000",
      xml: xmlDemo(cfdi, uuid, fecha),
      pacFacturaId: `demo-${uuid}`,
    };
  }

  async cancelar(_input: CancelarInput): Promise<CancelacionResultado> {
    return { ok: true, acuse: "DEMO-ACUSE-CANCELACION" };
  }
}
