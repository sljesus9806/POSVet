import { prisma } from "../shared/db";

type DatosInstalacion = {
  token: string;
  licenseId: string;
  cliente: string;
  modo: string;
};

export const licenciaRepository = {
  // La licencia vigente es la fila más reciente. (Hoy hay una sola por copia;
  // ordenar por createdAt deja lista la futura re-emisión/renovación.)
  activa() {
    return prisma.licencia.findFirst({ orderBy: { createdAt: "desc" } });
  },

  upsertPorInstalacion(instalacion: string, datos: DatosInstalacion) {
    return prisma.licencia.upsert({
      where: { instalacion },
      create: { instalacion, ...datos },
      update: datos,
    });
  },

  registrarValidacion(id: string, estado: string) {
    return prisma.licencia.update({
      where: { id },
      data: { ultimaValidacion: new Date(), ultimoEstado: estado },
    });
  },

  guardarConfigOnline(
    instalacion: string,
    config: { apiUrl: string; claveActivacion: string },
  ) {
    return prisma.licencia.update({
      where: { instalacion },
      data: config,
    });
  },

  // Registra el contacto con la plataforma. `revocada` refleja el veredicto:
  // true si respondió suspendida/vencida, false si renovó OK. En fallo de red
  // no se llama (se deja el estado anterior).
  marcarSync(id: string, revocada: boolean) {
    return prisma.licencia.update({
      where: { id },
      data: { ultimaSync: new Date(), revocada },
    });
  },
};
