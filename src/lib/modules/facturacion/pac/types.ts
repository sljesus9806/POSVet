// Contrato neutral del PAC (adapter pattern). El service arma un `ComprobanteCfdi`
// genérico y se lo entrega al PacClient; cada implementación (demo, Facturama, y
// en el futuro otro PAC) traduce a/desde su propia API. Así, cambiar de PAC no
// toca la lógica de negocio.

export type CfdiEmisor = {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
};

export type CfdiReceptor = {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
  usoCfdi: string;
  domicilioFiscalCp: string;
};

export type CfdiConcepto = {
  claveProdServ: string;
  claveUnidad: string;
  noIdentificacion?: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number; // cantidad * valorUnitario (sin IVA, antes de descuento)
  descuento: number;
  objetoImp: string; // "01" no objeto, "02" sí objeto de impuesto
  ivaTasa: number; // ej. 0.16
  ivaImporte: number;
};

export type ComprobanteCfdi = {
  serie: string;
  folio: number;
  lugarExpedicion: string; // CP
  moneda: string; // "MXN"
  formaPago: string; // clave SAT
  metodoPago: string; // PUE | PPD
  subtotal: number;
  descuento: number;
  total: number;
  emisor: CfdiEmisor;
  receptor: CfdiReceptor;
  conceptos: CfdiConcepto[];
};

export type TimbreResultado = {
  uuid: string;
  fechaTimbrado: Date;
  selloCfd: string;
  selloSat: string;
  noCertificadoSat: string;
  xml: string;
  pacFacturaId: string; // id del CFDI dentro del PAC (para cancelar/descargar)
};

export type CancelarInput = {
  pacFacturaId: string;
  uuid: string;
  motivo: string;
  folioSustitucion?: string;
};

export type CancelacionResultado = {
  ok: boolean;
  acuse?: string;
};

export interface PacClient {
  readonly nombre: string; // "demo" | "facturama"
  readonly esDemo: boolean;
  timbrar(cfdi: ComprobanteCfdi): Promise<TimbreResultado>;
  cancelar(input: CancelarInput): Promise<CancelacionResultado>;
}

// Error de integración con el PAC. El `.message` está pensado para mostrarse al
// usuario (mensaje legible, no stack técnico).
export class PacError extends Error {
  constructor(
    message: string,
    public readonly detalle?: unknown,
  ) {
    super(message);
    this.name = "PacError";
  }
}
