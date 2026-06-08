import { DemoPacClient } from "./demo";
import { FacturamaPacClient } from "./facturama";
import type { PacClient } from "./types";

export type FacturacionModo = "demo" | "facturama";

export type FacturacionConfig = {
  modo: FacturacionModo;
  serie: string;
  claveProdServDefault: string;
  claveUnidadDefault: string;
};

// Toda la configuración de facturación vive en variables de entorno. Quien
// instala el sistema las define una vez; la persona que factura no las toca.
export function getFacturacionConfig(): FacturacionConfig {
  const modo = process.env.FACTURACION_MODO === "facturama" ? "facturama" : "demo";
  return {
    modo,
    serie: process.env.FACTURACION_SERIE?.trim() || "A",
    // 01010101 = "No existe en el catálogo". Sirve como respaldo, pero conviene
    // configurar una clave real acorde al giro (FACTURACION_CLAVE_PROD_SERV).
    claveProdServDefault: process.env.FACTURACION_CLAVE_PROD_SERV?.trim() || "01010101",
    // H87 = Pieza.
    claveUnidadDefault: process.env.FACTURACION_CLAVE_UNIDAD?.trim() || "H87",
  };
}

// Fábrica del cliente PAC según el modo configurado. El service solo conoce la
// interfaz `PacClient`; cambiar de PAC es agregar un caso aquí.
export function crearPacClient(): PacClient {
  const cfg = getFacturacionConfig();
  if (cfg.modo === "facturama") {
    return new FacturamaPacClient({
      baseUrl: process.env.FACTURAMA_API_URL?.trim() || "https://apisandbox.facturama.mx",
      user: process.env.FACTURAMA_USER?.trim() || "",
      password: process.env.FACTURAMA_PASSWORD?.trim() || "",
    });
  }
  return new DemoPacClient();
}

export type {
  ComprobanteCfdi,
  TimbreResultado,
  CancelarInput,
  CancelacionResultado,
  PacClient,
} from "./types";
export { PacError } from "./types";
