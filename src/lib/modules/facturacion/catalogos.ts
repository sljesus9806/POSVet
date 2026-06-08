// Subconjuntos curados de los catálogos del SAT para CFDI 4.0.
// No es el catálogo completo (son miles de claves); son los valores de uso
// común en un punto de venta, para poblar los <select> de la UI sin abrumar
// a quien factura. Si en el futuro se necesitan más, se agregan aquí.

export type CatalogoItem = { clave: string; descripcion: string };

// Uso del CFDI (c_UsoCFDI). Lo elige el receptor según para qué usará la factura.
export const USOS_CFDI: CatalogoItem[] = [
  { clave: "G01", descripcion: "G01 — Adquisición de mercancías" },
  { clave: "G03", descripcion: "G03 — Gastos en general" },
  { clave: "I01", descripcion: "I01 — Construcciones" },
  { clave: "I04", descripcion: "I04 — Equipo de cómputo y accesorios" },
  { clave: "I08", descripcion: "I08 — Otra maquinaria y equipo" },
  { clave: "D01", descripcion: "D01 — Honorarios médicos y gastos hospitalarios" },
  { clave: "D10", descripcion: "D10 — Pagos por servicios educativos" },
  { clave: "S01", descripcion: "S01 — Sin efectos fiscales" },
  { clave: "CP01", descripcion: "CP01 — Pagos" },
];

// Régimen fiscal del receptor (c_RegimenFiscal). El del emisor se toma de Configuración.
export const REGIMENES_FISCALES: CatalogoItem[] = [
  { clave: "601", descripcion: "601 — General de Ley Personas Morales" },
  { clave: "603", descripcion: "603 — Personas Morales con Fines no Lucrativos" },
  { clave: "605", descripcion: "605 — Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { clave: "606", descripcion: "606 — Arrendamiento" },
  { clave: "607", descripcion: "607 — Régimen de Enajenación o Adquisición de Bienes" },
  { clave: "608", descripcion: "608 — Demás ingresos" },
  { clave: "612", descripcion: "612 — Personas Físicas con Actividades Empresariales y Profesionales" },
  { clave: "614", descripcion: "614 — Ingresos por intereses" },
  { clave: "616", descripcion: "616 — Sin obligaciones fiscales" },
  { clave: "621", descripcion: "621 — Incorporación Fiscal" },
  { clave: "625", descripcion: "625 — Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { clave: "626", descripcion: "626 — Régimen Simplificado de Confianza (RESICO)" },
];

// Forma de pago (c_FormaPago).
export const FORMAS_PAGO: CatalogoItem[] = [
  { clave: "01", descripcion: "01 — Efectivo" },
  { clave: "02", descripcion: "02 — Cheque nominativo" },
  { clave: "03", descripcion: "03 — Transferencia electrónica" },
  { clave: "04", descripcion: "04 — Tarjeta de crédito" },
  { clave: "28", descripcion: "28 — Tarjeta de débito" },
  { clave: "99", descripcion: "99 — Por definir" },
];

// Método de pago (c_MetodoPago).
export const METODOS_PAGO: CatalogoItem[] = [
  { clave: "PUE", descripcion: "PUE — Pago en una sola exhibición" },
  { clave: "PPD", descripcion: "PPD — Pago en parcialidades o diferido" },
];

// Motivos de cancelación (c_MotivoCancelacion).
export const MOTIVOS_CANCELACION: CatalogoItem[] = [
  { clave: "01", descripcion: "01 — Comprobante con errores con relación (sustituye a otro)" },
  { clave: "02", descripcion: "02 — Comprobante con errores sin relación" },
  { clave: "03", descripcion: "03 — No se llevó a cabo la operación" },
  { clave: "04", descripcion: "04 — Operación nominativa relacionada en una factura global" },
];

export const FORMAS_PAGO_CLAVES = FORMAS_PAGO.map((f) => f.clave);
export const METODOS_PAGO_CLAVES = METODOS_PAGO.map((m) => m.clave);
export const MOTIVOS_CANCELACION_CLAVES = MOTIVOS_CANCELACION.map((m) => m.clave);

// RFC genérico para público en general (operaciones sin receptor identificado).
export const RFC_PUBLICO_GENERAL = "XAXX010101000";

// Mapa de la forma de pago interna del POS → clave SAT, para prellenar el form.
export function formaPagoVentaASat(forma: string): string {
  switch (forma) {
    case "EFECTIVO":
      return "01";
    case "TRANSFERENCIA":
      return "03";
    case "TARJETA":
      return "04";
    case "CREDITO":
      return "99";
    default:
      return "99";
  }
}
