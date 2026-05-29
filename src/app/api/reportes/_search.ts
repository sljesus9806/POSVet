// Helper para parsear searchParams en route handlers de reportes PDF.

function parseLocalDate(s: string, endOfDay = false): Date {
  const [y, m, d] = s.split("-").map(Number);
  return endOfDay
    ? new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999)
    : new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function rangoFromSearch(sp: URLSearchParams, opts: { diasPorDefecto?: number } = {}) {
  const hoy = new Date();
  const hastaDefault = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const desdeDefault = new Date(hastaDefault);
  desdeDefault.setDate(desdeDefault.getDate() - (opts.diasPorDefecto ?? 0));

  const desdeRaw = sp.get("desde");
  const hastaRaw = sp.get("hasta");

  const desde =
    desdeRaw && /^\d{4}-\d{2}-\d{2}$/.test(desdeRaw)
      ? parseLocalDate(desdeRaw, false)
      : new Date(desdeDefault.setHours(0, 0, 0, 0));
  const hasta =
    hastaRaw && /^\d{4}-\d{2}-\d{2}$/.test(hastaRaw)
      ? parseLocalDate(hastaRaw, true)
      : new Date(hastaDefault.setHours(23, 59, 59, 999));

  const ubicacionId = sp.get("ubicacionId") || undefined;
  return { desde, hasta, ubicacionId };
}
