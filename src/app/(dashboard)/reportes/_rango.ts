// Helpers compartidos para parsear los searchParams de filtro en las páginas de
// reportes. Vive bajo `_rango.ts` (prefijo `_`) para que el App Router lo trate
// como módulo privado y no como ruta.

const TZ_OFFSET_MS = new Date().getTimezoneOffset() * 60_000;

// "yyyy-mm-dd" → Date en hora local (00:00 o 23:59:59.999).
function parseLocalDate(s: string, endOfDay = false): Date {
  const [y, m, d] = s.split("-").map(Number);
  return endOfDay
    ? new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999)
    : new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function toYYYYMMDD(d: Date): string {
  const local = new Date(d.getTime() - TZ_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

export type RangoSearchParams = {
  desde?: string;
  hasta?: string;
  ubicacionId?: string;
};

export type RangoResuelto = {
  desde: Date;
  hasta: Date;
  desdeStr: string;
  hastaStr: string;
  ubicacionId?: string;
};

export function resolverRango(sp: RangoSearchParams, opts: { diasPorDefecto?: number } = {}): RangoResuelto {
  const dias = opts.diasPorDefecto ?? 0;
  const hoy = new Date();
  const hastaDefault = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const desdeDefault = new Date(hastaDefault);
  desdeDefault.setDate(desdeDefault.getDate() - dias);

  const desdeStr = sp.desde && /^\d{4}-\d{2}-\d{2}$/.test(sp.desde) ? sp.desde : toYYYYMMDD(desdeDefault);
  const hastaStr = sp.hasta && /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta) ? sp.hasta : toYYYYMMDD(hastaDefault);

  return {
    desde: parseLocalDate(desdeStr, false),
    hasta: parseLocalDate(hastaStr, true),
    desdeStr,
    hastaStr,
    ubicacionId: sp.ubicacionId && sp.ubicacionId.length > 0 ? sp.ubicacionId : undefined,
  };
}

export function formatearFecha(d: Date): string {
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}
