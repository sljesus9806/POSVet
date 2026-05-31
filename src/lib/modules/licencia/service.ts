import { eventBus } from "../shared/event-bus";
import { verificarToken } from "./crypto";
import { LICENCIA_EVENTS } from "./events";
import { LICENCIA_PUBLIC_KEY } from "./keys";
import { licenciaRepository } from "./repository";
import { licenciaPayloadSchema } from "./schemas";
import type { ResultadoLicencia } from "./types";

const MS_DIA = 86_400_000;

export class LicenciaInvalidaError extends Error {
  constructor() {
    super("La licencia es inválida o fue manipulada.");
    this.name = "LicenciaInvalidaError";
  }
}

function fmtFecha(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export const licenciaService = {
  /**
   * Evalúa la licencia instalada y devuelve su estado. Persiste el último
   * estado/validación. No lanza: ante cualquier problema devuelve un resultado
   * con `bloqueado: true` para que el gate cierre el acceso de forma segura.
   */
  async evaluar(now: Date = new Date()): Promise<ResultadoLicencia> {
    const row = await licenciaRepository.activa();
    if (!row) {
      return {
        estado: "ausente",
        bloqueado: true,
        cliente: null,
        modo: null,
        expira: null,
        finGracia: null,
        diasRestantes: null,
        mensaje: "No hay una licencia instalada en este equipo.",
      };
    }

    const payload = verificarToken(row.token, LICENCIA_PUBLIC_KEY);
    const parsed = payload ? licenciaPayloadSchema.safeParse(payload) : null;
    if (!parsed?.success) {
      await licenciaRepository.registrarValidacion(row.id, "invalida");
      return {
        estado: "invalida",
        bloqueado: true,
        cliente: null,
        modo: null,
        expira: null,
        finGracia: null,
        diasRestantes: null,
        mensaje: "La licencia es inválida o fue manipulada.",
      };
    }

    const lic = parsed.data;
    const expira = new Date(lic.expira);
    const finGracia = new Date(expira.getTime() + lic.gracia * MS_DIA);

    // Revocación remota: la plataforma respondió suspendida/vencida. Bloqueo
    // inmediato, sin esperar a que expire el token.
    if (row.revocada) {
      await licenciaRepository.registrarValidacion(row.id, "revocada");
      return {
        estado: "revocada",
        bloqueado: true,
        cliente: lic.cliente,
        modo: lic.modo,
        expira,
        finGracia,
        diasRestantes: Math.ceil((expira.getTime() - now.getTime()) / MS_DIA),
        mensaje:
          "El proveedor suspendió esta licencia. Contáctalo para reactivarla.",
      };
    }
    const diasRestantes = Math.ceil(
      (expira.getTime() - now.getTime()) / MS_DIA,
    );

    let estado: "valida" | "gracia" | "expirada";
    if (now <= expira) estado = "valida";
    else if (now <= finGracia) estado = "gracia";
    else estado = "expirada";

    await licenciaRepository.registrarValidacion(row.id, estado);

    void eventBus.emit(
      estado === "expirada"
        ? LICENCIA_EVENTS.EXPIRADA
        : estado === "gracia"
          ? LICENCIA_EVENTS.EN_GRACIA
          : LICENCIA_EVENTS.VALIDADA,
      {
        cliente: lic.cliente,
        modo: lic.modo,
        estado,
        expira: lic.expira,
      },
    );

    const mensaje =
      estado === "valida"
        ? `Licencia vigente hasta el ${fmtFecha(expira)}.`
        : estado === "gracia"
          ? `Tu licencia venció el ${fmtFecha(expira)}. Renueva antes del ${fmtFecha(finGracia)} para no perder el acceso.`
          : `Tu licencia venció el ${fmtFecha(expira)} y se agotó el periodo de gracia.`;

    return {
      estado,
      bloqueado: estado === "expirada",
      cliente: lic.cliente,
      modo: lic.modo,
      expira,
      finGracia,
      diasRestantes,
      mensaje,
    };
  },

  /**
   * Instala/renueva una licencia en este equipo a partir de un token firmado.
   * Verifica firma + contenido antes de guardar. Lanza `LicenciaInvalidaError`
   * si el token no es válido.
   */
  async instalar(token: string, instalacion: string) {
    const payload = verificarToken(token.trim(), LICENCIA_PUBLIC_KEY);
    const parsed = payload ? licenciaPayloadSchema.safeParse(payload) : null;
    if (!parsed?.success) throw new LicenciaInvalidaError();

    const lic = parsed.data;
    const row = await licenciaRepository.upsertPorInstalacion(instalacion, {
      token: token.trim(),
      licenseId: lic.licenseId,
      cliente: lic.cliente,
      modo: lic.modo,
    });

    void eventBus.emit(LICENCIA_EVENTS.INSTALADA, {
      licenseId: lic.licenseId,
      cliente: lic.cliente,
      modo: lic.modo,
    });

    return row;
  },
};
