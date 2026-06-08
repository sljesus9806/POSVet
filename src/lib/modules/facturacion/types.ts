import type { EstadoFactura, TipoCfdi } from "@prisma/client";

export type { EstadoFactura, TipoCfdi };

export type FacturaLineaItem = {
  id: string;
  claveProdServ: string;
  claveUnidad: string;
  noIdentificacion: string | null;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number;
  descuento: number;
  ivaTasa: number;
  ivaImporte: number;
};

export type FacturaListado = {
  id: string;
  serie: string;
  folio: number;
  serieFolio: string; // "A-123"
  tipo: TipoCfdi;
  estado: EstadoFactura;
  uuid: string | null;
  receptorRfc: string;
  receptorNombre: string;
  total: number;
  esDemo: boolean;
  fechaTimbrado: Date | null;
  ventaId: string | null;
  ventaFolio: string | null;
  usuarioNombre: string;
};

export type FacturaDetalle = FacturaListado & {
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimen: string;
  lugarExpedicion: string;
  receptorRegimen: string;
  receptorUsoCfdi: string;
  receptorCp: string;
  moneda: string;
  subtotal: number;
  descuento: number;
  iva: number;
  formaPago: string;
  metodoPago: string;
  selloCfd: string | null;
  selloSat: string | null;
  noCertificadoSat: string | null;
  motivoCancelacion: string | null;
  folioSustitucion: string | null;
  canceladaEn: Date | null;
  canceladaPorNombre: string | null;
  pacProveedor: string;
  lineas: FacturaLineaItem[];
  createdAt: Date;
};

// Datos fiscales del receptor capturados en el formulario de emisión.
export type ReceptorFiscal = {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
  usoCfdi: string;
  codigoPostal: string;
};
