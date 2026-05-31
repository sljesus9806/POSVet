// Cliente del modo online: POSVet "llama a casa" (la plataforma de licencias)
// para activarse y renovar su token cada cierto tiempo. Todo es tolerante a
// fallos: si no hay internet o la plataforma no responde, NO se bloquea nada;
// el token vigente sigue valiendo hasta que expire (gracia incluida).

import { licenciaRepository } from "./repository";
import { licenciaService } from "./service";

const APP_VERSION = process.env.npm_package_version ?? "1.0.0";
const SYNC_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 h entre renovaciones
const TIMEOUT_MS = 5000;

export type ResultadoSync = {
  ok: boolean;
  motivo: string; // renovada | reciente | membresia_inactiva | sin_conexion | ...
  estado?: string;
};

async function postJson(
  url: string,
  body: unknown,
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

/**
 * Activación inicial del modo online: contacta la plataforma con la clave del
 * cliente, instala el token devuelto y guarda la config (url + clave) para
 * futuras renovaciones. Lanza si la activación falla.
 */
export async function activarOnline(params: {
  apiUrl: string;
  clave: string;
  instalacion: string;
}): Promise<void> {
  const apiUrl = params.apiUrl.replace(/\/+$/, "");
  const { status, json } = await postJson(`${apiUrl}/api/v1/activar`, {
    clave: params.clave,
    instalacion: params.instalacion,
    version: APP_VERSION,
  });

  if (status !== 200 || !json || typeof json !== "object") {
    const motivo =
      (json as { error?: string } | null)?.error ?? `http_${status}`;
    throw new Error(`No se pudo activar: ${motivo}`);
  }

  const token = (json as { token?: string }).token;
  if (!token) throw new Error("La plataforma no devolvió token.");

  await licenciaService.instalar(token, params.instalacion);
  await licenciaRepository.guardarConfigOnline(params.instalacion, {
    apiUrl,
    claveActivacion: params.clave,
  });
}

/**
 * Sincroniza con la plataforma (renueva el token). Pensada para llamarse en
 * segundo plano de forma frecuente: se auto-limita a una vez cada 6 h salvo
 * `force`. Nunca lanza: cualquier problema se reporta en el resultado.
 */
export async function sincronizar(
  opts: { force?: boolean } = {},
): Promise<ResultadoSync> {
  const row = await licenciaRepository.activa();
  if (!row) return { ok: false, motivo: "sin_licencia" };
  if (row.modo !== "online") return { ok: false, motivo: "no_es_online" };

  const apiUrl = (row.apiUrl ?? process.env.LICENCIA_API_URL)?.replace(
    /\/+$/,
    "",
  );
  const clave = row.claveActivacion ?? process.env.LICENCIA_CLAVE;
  if (!apiUrl || !clave) return { ok: false, motivo: "sin_config" };

  if (
    !opts.force &&
    row.ultimaSync &&
    Date.now() - row.ultimaSync.getTime() < SYNC_THROTTLE_MS
  ) {
    return { ok: true, motivo: "reciente" };
  }

  try {
    const { status, json } = await postJson(`${apiUrl}/api/v1/renovar`, {
      clave,
      instalacion: row.instalacion,
      version: APP_VERSION,
    });

    if (status === 200) {
      const token = (json as { token?: string } | null)?.token;
      if (token) await licenciaService.instalar(token, row.instalacion);
      await licenciaRepository.marcarSync(row.id);
      return { ok: true, motivo: "renovada" };
    }

    if (status === 402) {
      // Membresía suspendida/vencida: no renovamos. El token actual seguirá
      // hasta vencer → gracia → bloqueo. Registramos el contacto igual.
      await licenciaRepository.marcarSync(row.id);
      const estado = (json as { estado?: string } | null)?.estado;
      return { ok: true, motivo: "membresia_inactiva", estado };
    }

    return { ok: false, motivo: `http_${status}` };
  } catch {
    // Sin conexión / timeout: tolerante, no bloquea.
    return { ok: false, motivo: "sin_conexion" };
  }
}
