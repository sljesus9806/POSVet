// CFG — Configuración (empresa y ubicaciones). Plan §5.1
import { configuracionService } from "../../src/lib/modules/configuracion";
import { prisma, caso, check, eq, lanza, adminId, SEED, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.1 Configuración ==");
  const usuarioId = await adminId();

  // CFG-01
  caso("CFG-01", "obtenerEmpresaPrincipal devuelve la empresa del seed");
  const empresa = await configuracionService.obtenerEmpresaPrincipal();
  check(!!empresa && empresa.razonSocial.includes("POSVet"), empresa?.razonSocial);
  S.empresaId = empresa?.id ?? SEED.empresaId;

  // CFG-02
  caso("CFG-02", "actualizarEmpresa persiste + escribe AuditLog");
  const nuevaRazon = "POSVet Veterinaria Demo SA de CV (QA)";
  const actualizada = await configuracionService.actualizarEmpresa(
    {
      id: S.empresaId,
      rfc: "XAXX010101000",
      razonSocial: nuevaRazon,
      regimenFiscal: "601",
      codigoPostal: "06700",
      direccion: "Av. QA 123, CDMX",
    },
    { usuarioId },
  );
  eq(actualizada.razonSocial, nuevaRazon, "razón social actualizada");
  eq(actualizada.codigoPostal, "06700", "CP actualizado");
  const enDb = await prisma.empresa.findUnique({ where: { id: S.empresaId } });
  eq(enDb?.razonSocial, nuevaRazon, "persistido en BD");
  const audit = await prisma.auditLog.findFirst({
    where: { entidad: "empresa", accion: "empresa.editar", entidadId: S.empresaId },
    orderBy: { fecha: "desc" },
  });
  check(!!audit && audit.usuarioId === usuarioId, "AuditLog empresa.editar presente");

  // CFG-03
  caso("CFG-03", "listarUbicaciones devuelve Tienda + Bodega");
  const ubic = await configuracionService.listarUbicaciones(S.empresaId);
  const nombres = ubic.map((u) => u.nombre);
  check(nombres.includes("Tienda") && nombres.includes("Bodega"), nombres.join(", "));

  // CFG-04
  caso("CFG-04", "crearUbicacion Sucursal Centro (SUCURSAL) creada y activa");
  const sucursal = await configuracionService.crearUbicacion(
    { nombre: "Sucursal Centro", tipo: "SUCURSAL", direccion: "Centro 1" },
    { usuarioId, empresaId: S.empresaId },
  );
  check(sucursal.activa === true && sucursal.tipo === "SUCURSAL", sucursal.id);
  S.sucursalId = sucursal.id;

  // CFG-05
  caso("CFG-05", "actualizarUbicacion renombra y desactiva + audit");
  const editada = await configuracionService.actualizarUbicacion(
    { id: S.sucursalId, nombre: "Sucursal Centro Histórico", tipo: "SUCURSAL", activa: false },
    { usuarioId },
  );
  eq(editada.nombre, "Sucursal Centro Histórico", "renombrada");
  eq(editada.activa, false, "desactivada");
  const auditU = await prisma.auditLog.findFirst({
    where: { entidad: "ubicacion", accion: "ubicacion.editar", entidadId: S.sucursalId },
  });
  check(!!auditU, "AuditLog ubicacion.editar presente");

  // CFG-06 ✗
  caso("CFG-06", "crearUbicacion con payload inválido → ZodError");
  await lanza(
    "ZodError",
    () =>
      configuracionService.crearUbicacion(
        // nombre demasiado corto + tipo inexistente
        { nombre: "X", tipo: "GALAXIA" as never, direccion: "" },
        { usuarioId, empresaId: S.empresaId },
      ),
    "validación de entrada",
  );
}
