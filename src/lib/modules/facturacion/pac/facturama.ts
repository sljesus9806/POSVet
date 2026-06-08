import {
  PacError,
  type CancelacionResultado,
  type CancelarInput,
  type ComprobanteCfdi,
  type PacClient,
  type TimbreResultado,
} from "./types";

// Cliente real de Facturama (https://facturama.mx). Encapsula su API REST para
// CFDI 4.0; el resto del sistema no sabe que existe Facturama.
//
// IMPORTANTE: este cliente usa la API multiemisor (rutas /3/cfdis). Si la cuenta
// es de tipo "API Lite" (un solo emisor), las rutas y algunos campos cambian
// ligeramente — revísalo contra la documentación de Facturama de la cuenta antes
// de timbrar en producción. La autenticación es Basic (usuario:contraseña de la
// API, NO las del portal web).

export type FacturamaConfig = {
  baseUrl: string; // sandbox: https://apisandbox.facturama.mx | prod: https://api.facturama.mx
  user: string;
  password: string;
};

type FacturamaTaxStamp = {
  Uuid?: string;
  Date?: string;
  CfdiSign?: string;
  SatSign?: string;
  SatCertNumber?: string;
};

type FacturamaCreateResponse = {
  Id?: string;
  Uuid?: string;
  Complement?: { TaxStamp?: FacturamaTaxStamp };
};

export class FacturamaPacClient implements PacClient {
  readonly nombre = "facturama";
  readonly esDemo = false;

  constructor(private readonly cfg: FacturamaConfig) {
    if (!cfg.user || !cfg.password) {
      throw new PacError(
        "Faltan las credenciales de Facturama. Configura FACTURAMA_USER y FACTURAMA_PASSWORD.",
      );
    }
  }

  private authHeader(): string {
    const token = Buffer.from(`${this.cfg.user}:${this.cfg.password}`).toString("base64");
    return `Basic ${token}`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.cfg.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new PacError("No se pudo conectar con Facturama. Revisa tu conexión a internet.", err);
    }

    const text = await res.text();
    if (!res.ok) {
      throw new PacError(mensajeError(res.status, text), text);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  async timbrar(cfdi: ComprobanteCfdi): Promise<TimbreResultado> {
    const payload = mapComprobante(cfdi);
    const created = await this.request<FacturamaCreateResponse>("POST", "/3/cfdis", payload);

    const stamp = created.Complement?.TaxStamp ?? {};
    const uuid = stamp.Uuid ?? created.Uuid;
    const id = created.Id;
    if (!uuid || !id) {
      throw new PacError("Facturama no devolvió el folio fiscal (UUID) del CFDI.", created);
    }

    const xml = await this.descargarXml(id);

    return {
      uuid,
      fechaTimbrado: stamp.Date ? new Date(stamp.Date) : new Date(),
      selloCfd: stamp.CfdiSign ?? "",
      selloSat: stamp.SatSign ?? "",
      noCertificadoSat: stamp.SatCertNumber ?? "",
      xml,
      pacFacturaId: id,
    };
  }

  private async descargarXml(id: string): Promise<string> {
    const res = await this.request<{ Content?: string }>("GET", `/cfdi/xml/issued/${id}`);
    if (!res.Content) return "";
    return Buffer.from(res.Content, "base64").toString("utf-8");
  }

  async cancelar(input: CancelarInput): Promise<CancelacionResultado> {
    const params = new URLSearchParams({ type: "issued", motive: input.motivo });
    if (input.folioSustitucion) params.set("uuidReplacement", input.folioSustitucion);
    await this.request<unknown>("DELETE", `/cfdi/${input.pacFacturaId}?${params.toString()}`);
    return { ok: true };
  }
}

function mapComprobante(cfdi: ComprobanteCfdi) {
  return {
    Serie: cfdi.serie,
    Folio: String(cfdi.folio),
    Currency: cfdi.moneda,
    ExpeditionPlace: cfdi.lugarExpedicion,
    PaymentForm: cfdi.formaPago,
    PaymentMethod: cfdi.metodoPago,
    CfdiType: "I",
    Receiver: {
      Rfc: cfdi.receptor.rfc,
      Name: cfdi.receptor.nombre,
      CfdiUse: cfdi.receptor.usoCfdi,
      FiscalRegime: cfdi.receptor.regimenFiscal,
      TaxZipCode: cfdi.receptor.domicilioFiscalCp,
    },
    Items: cfdi.conceptos.map((c) => ({
      ProductCode: c.claveProdServ,
      IdentificationNumber: c.noIdentificacion,
      Description: c.descripcion,
      UnitCode: c.claveUnidad,
      Quantity: c.cantidad,
      UnitPrice: round6(c.valorUnitario),
      Subtotal: round2(c.importe),
      Discount: round2(c.descuento),
      TaxObject: c.objetoImp,
      Total: round2(c.importe - c.descuento + c.ivaImporte),
      Taxes:
        c.objetoImp === "02"
          ? [
              {
                Total: round2(c.ivaImporte),
                Name: "IVA",
                Base: round2(c.importe - c.descuento),
                Rate: c.ivaTasa,
                IsRetention: false,
              },
            ]
          : [],
    })),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function mensajeError(status: number, body: string): string {
  if (status === 401) return "Facturama rechazó las credenciales (401). Revisa usuario y contraseña de la API.";
  // Facturama suele devolver { Message } o { ModelState: { campo: [errores] } }.
  try {
    const j = JSON.parse(body) as { Message?: string; ModelState?: Record<string, string[]> };
    if (j.ModelState) {
      const primero = Object.values(j.ModelState).flat()[0];
      if (primero) return `Facturama rechazó la factura: ${primero}`;
    }
    if (j.Message) return `Facturama: ${j.Message}`;
  } catch {
    // body no es JSON
  }
  return `Facturama respondió con error ${status}. Intenta de nuevo o revisa los datos fiscales.`;
}
