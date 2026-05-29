import { configuracionService } from "@/lib/modules/configuracion";

export async function getEmpresaParaPdf() {
  const empresa = await configuracionService.obtenerEmpresaPrincipal();
  return {
    razonSocial: empresa?.razonSocial ?? "POSVet",
    rfc: empresa?.rfc ?? null,
  };
}
