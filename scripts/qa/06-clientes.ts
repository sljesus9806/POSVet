// CLI — Clientes. Plan §5.6
import { clientesService } from "../../src/lib/modules/clientes";
import { caso, check, eq, lanza, prisma, adminId, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.6 Clientes ==");
  const usuarioId = await adminId();

  // CLI-01 — 4 tipos; uno con crédito, otro sin
  caso("CLI-01", "crear PUBLICO, MAYOREO, VETERINARIO (con crédito) y GRANJA");
  const publico = await clientesService.crear({ nombre: "Cliente Público QA", tipoCliente: "PUBLICO", lineaCredito: 0, diasCredito: 0 }, { usuarioId });
  const mayoreo = await clientesService.crear({ nombre: "Mayorista QA", tipoCliente: "MAYOREO", lineaCredito: 0, diasCredito: 0 }, { usuarioId });
  const vet = await clientesService.crear({ nombre: "Clínica Vet QA", tipoCliente: "VETERINARIO", lineaCredito: 5000, diasCredito: 30 }, { usuarioId });
  const granja = await clientesService.crear({ nombre: "Granja QA", tipoCliente: "GRANJA", lineaCredito: 0, diasCredito: 0 }, { usuarioId });
  const credChico = await clientesService.crear({ nombre: "Cliente Crédito Chico QA", tipoCliente: "VETERINARIO", lineaCredito: 100, diasCredito: 15 }, { usuarioId });
  S.clientePublicoId = publico.id;
  S.clienteMayoreoId = mayoreo.id;
  S.clienteCreditoId = vet.id;
  S.clienteCreditoChicoId = credChico.id;
  eq(vet.lineaCredito, 5000, "VETERINARIO con línea 5000");
  eq(vet.tipoPrecioEfectivo, "VETERINARIO", "tipo de precio efectivo VETERINARIO");
  eq(granja.tipoPrecioEfectivo, "MAYOREO", "GRANJA mapea a precio MAYOREO");
  eq(publico.lineaCredito, 0, "PUBLICO sin crédito");

  // CLI-02 — datos fiscales completos
  caso("CLI-02", "crear con datos fiscales (RFC, régimen, uso CFDI, CP)");
  const fiscal = await clientesService.crear(
    { nombre: "Cliente Fiscal QA SA de CV", tipoCliente: "MAYOREO", rfc: "XAXX010101000", regimenFiscal: "601", usoCFDI: "G03", codigoPostal: "06700", lineaCredito: 0, diasCredito: 0 },
    { usuarioId },
  );
  const fiscalDet = await clientesService.obtener(fiscal.id);
  eq(fiscalDet?.rfc, "XAXX010101000", "RFC persistido");
  eq(fiscalDet?.usoCFDI, "G03", "usoCFDI persistido");

  // CLI-03 — listar (filtros) y obtener
  caso("CLI-03", "listar con filtro por tipo y obtener");
  const soloVet = await clientesService.listar({ tipo: "VETERINARIO" });
  check(soloVet.length >= 2 && soloVet.every((c) => c.tipoCliente === "VETERINARIO"), `filtro tipo VETERINARIO (${soloVet.length})`);
  const det = await clientesService.obtener(vet.id);
  eq(det?.id, vet.id, "obtener por id");

  // CLI-04 — actualizar y baja lógica
  caso("CLI-04", "actualizar y baja lógica (activo=false, no se borra)");
  const tmp = await clientesService.crear({ nombre: "Cliente Baja QA", tipoCliente: "PUBLICO", lineaCredito: 0, diasCredito: 0 }, { usuarioId });
  const baja = await clientesService.actualizar({ id: tmp.id, nombre: "Cliente Baja QA (inactivo)", activo: false }, { usuarioId });
  eq(baja.activo, false, "desactivado");
  const enDb = await prisma.cliente.findUnique({ where: { id: tmp.id } });
  check(!!enDb && enDb.activo === false, "sigue en BD pero inactivo");

  // CLI-05 ✗ — validaciones
  caso("CLI-05", "crédito negativo y nombre inválido → ZodError");
  await lanza("ZodError", () => clientesService.crear({ nombre: "Crédito Negativo", tipoCliente: "PUBLICO", lineaCredito: -100, diasCredito: 0 }, { usuarioId }), "lineaCredito negativa");
  await lanza("ZodError", () => clientesService.crear({ nombre: "A", tipoCliente: "PUBLICO", lineaCredito: 0, diasCredito: 0 }, { usuarioId }), "nombre demasiado corto");
}
