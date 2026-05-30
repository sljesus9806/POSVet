// PRO — Proveedores y catálogo. Plan §5.5
import { proveedoresService } from "../../src/lib/modules/proveedores";
// sugerenciasDeProveedor (plan PRO-05) la EXPONE el módulo Compras, no Proveedores:
// lee el catálogo del proveedor para pre-llenar líneas de una OC.
import { comprasService } from "../../src/lib/modules/compras";
import { caso, check, eq, prisma, adminId, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.5 Proveedores ==");
  const usuarioId = await adminId();

  // PRO-01
  caso("PRO-01", "crear proveedor con datos fiscales; listar; obtener");
  const prov = await proveedoresService.crear(
    { nombre: "Distribuidora Veterinaria QA", rfc: "DVQ960101AB1", regimenFiscal: "601", codigoPostal: "06700", email: "ventas@dvqa.mx", telefono: "5512345678", contacto: "Juan Pérez", diasCredito: 30 },
    { usuarioId },
  );
  S.proveedorId = prov.id;
  check(!!prov.codigo, `proveedor creado (${prov.codigo})`);
  const lista = await proveedoresService.listar();
  check(lista.some((p) => p.id === prov.id), "aparece en listar");
  const obtenido = await proveedoresService.obtener(prov.id);
  eq(obtenido?.nombre, "Distribuidora Veterinaria QA", "obtener por id");

  // PRO-02
  caso("PRO-02", "actualizar (condiciones de pago, contacto) → persiste + audit");
  const edit = await proveedoresService.actualizar({ id: prov.id, diasCredito: 45, contacto: "María López" }, { usuarioId });
  eq(edit.diasCredito, 45, "diasCredito actualizado");
  eq(edit.contacto, "María López", "contacto actualizado");
  const audit = await prisma.auditLog.findFirst({ where: { entidad: "proveedor", accion: "editar", entidadId: prov.id } });
  check(!!audit, "AuditLog proveedor.editar presente");

  // PRO-03
  caso("PRO-03", "agregarLineaCatalogo (med, ali); actualizarLineaCatalogo; listarCatalogo");
  const lineaMed = await proveedoresService.agregarLineaCatalogo({ proveedorId: prov.id, productoId: S.medId, codigoProveedor: "PROV-MED-01", costoUnitario: 48, esPreferido: true }, { usuarioId });
  await proveedoresService.agregarLineaCatalogo({ proveedorId: prov.id, productoId: S.aliId, codigoProveedor: "PROV-ALI-01", costoUnitario: 195 }, { usuarioId });
  S.lineaMedId = lineaMed.id;
  const edited = await proveedoresService.actualizarLineaCatalogo({ lineaId: lineaMed.id, costoUnitario: 47.5 }, { usuarioId });
  eq(edited.costoUnitario, 47.5, "costo de línea actualizado");
  const catalogo = await proveedoresService.listarCatalogo(prov.id);
  eq(catalogo.length, 2, "2 líneas en catálogo");

  // PRO-04
  caso("PRO-04", "eliminarLineaCatalogo → ya no aparece");
  const lineaTmp = await proveedoresService.agregarLineaCatalogo({ proveedorId: prov.id, productoId: S.accId, costoUnitario: 18 }, { usuarioId });
  await proveedoresService.eliminarLineaCatalogo({ lineaId: lineaTmp.id }, { usuarioId });
  const catalogo2 = await proveedoresService.listarCatalogo(prov.id);
  check(!catalogo2.some((l) => l.id === lineaTmp.id), "línea eliminada no aparece");

  // PRO-05 (método de comprasService que consume el catálogo del proveedor)
  caso("PRO-05", "sugerenciasDeProveedor propone productos del catálogo (vía comprasService)");
  const sugerencias = await comprasService.sugerenciasDeProveedor(prov.id);
  check(sugerencias.some((s) => s.productoId === S.medId), "sugiere el medicamento del catálogo");
}
