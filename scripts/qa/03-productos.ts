// PRD — Productos y categorías. Plan §5.3
import { productosService, categoriasService } from "../../src/lib/modules/productos";
import { caso, check, eq, lanza, adminId, prisma, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.3 Productos y categorías ==");
  const usuarioId = await adminId();

  // PRD-01 — categorías
  caso("PRD-01", "categoriasService.listar (seed); crear; actualizar");
  const cats = await categoriasService.listar();
  check(cats.length >= 6, `seed tiene ${cats.length} categorías`);
  const nuevaCat = await categoriasService.crear({ nombre: "Suplementos QA", descripcion: "Vitaminas" }, { usuarioId });
  check(!!nuevaCat.id, "categoría creada");
  S.catId = nuevaCat.id;
  const catEdit = await categoriasService.actualizar({ id: nuevaCat.id, nombre: "Suplementos QA 2" }, { usuarioId });
  eq(catEdit.nombre, "Suplementos QA 2", "categoría renombrada");

  // PRD-02 — medicamento completo + 3 precios
  caso("PRD-02", "crear medicamento (IVA, receta, controlada, lab, vía) + precios PUBLICO/MAYOREO/VETERINARIO");
  const med = await productosService.crear(
    {
      sku: "MED-QA-001",
      nombre: "Medicamento QA Inyectable",
      unidadMedida: "FRASCO",
      tipo: "MEDICAMENTO",
      categoriaId: S.catId,
      requiereReceta: true,
      sustanciaControlada: true,
      laboratorio: "LabQA",
      viaAdministracion: "Intramuscular",
      ivaAplicable: 0.16,
      ultimoCosto: 50,
      precios: [
        { tipo: "PUBLICO", precio: 116 },
        { tipo: "MAYOREO", precio: 100 },
        { tipo: "VETERINARIO", precio: 92.8 },
      ],
    },
    { usuarioId },
  );
  S.medId = med.id;
  eq(med.precios.length, 3, "3 listas de precio");
  check(med.requiereReceta && med.sustanciaControlada, "flags receta/controlada");

  // PRD-03 — alimento, accesorio, servicio
  caso("PRD-03", "crear alimento, accesorio y servicio");
  const ali = await productosService.crear(
    { sku: "ALI-QA-001", nombre: "Alimento QA 10kg", unidadMedida: "BULTO", tipo: "ALIMENTO", ivaAplicable: 0.16, ultimoCosto: 200, precios: [{ tipo: "PUBLICO", precio: 348 }, { tipo: "MAYOREO", precio: 300 }] },
    { usuarioId },
  );
  const acc = await productosService.crear(
    { sku: "ACC-QA-001", nombre: "Accesorio QA", unidadMedida: "PZA", tipo: "ACCESORIO", ivaAplicable: 0.16, ultimoCosto: 20, precios: [{ tipo: "PUBLICO", precio: 58 }] },
    { usuarioId },
  );
  const serv = await productosService.crear(
    { sku: "SERV-QA-001", nombre: "Consulta QA", unidadMedida: "SERV", tipo: "SERVICIO", ivaAplicable: 0.16, ultimoCosto: 0, precios: [{ tipo: "PUBLICO", precio: 350 }] },
    { usuarioId },
  );
  S.aliId = ali.id; S.accId = acc.id; S.servId = serv.id;
  check(!!ali.id && !!acc.id && serv.tipo === "SERVICIO", "3 productos creados");

  // PRD-04 — lotes (uno lejano, uno próximo para alertas)
  caso("PRD-04", "crearLote: uno con caducidad lejana y otro próxima (para alertas)");
  const lejano = new Date(); lejano.setDate(lejano.getDate() + 400);
  const proximo = new Date(); proximo.setDate(proximo.getDate() + 20);
  const loteLejano = await productosService.crearLote({ productoId: med.id, lote: "QA-LOTE-LEJANO", caducidad: lejano, cantidad: 10, costoUnitario: 50 }, { usuarioId });
  const loteProximo = await productosService.crearLote({ productoId: med.id, lote: "QA-LOTE-PROXIMO", caducidad: proximo, cantidad: 5, costoUnitario: 50 }, { usuarioId });
  check(!!loteLejano.id && !!loteProximo.id, "2 lotes creados");
  S.loteProximoId = loteProximo.id;

  // PRD-05 — actualizar precios + nombre
  caso("PRD-05", "actualizar producto (precio y nombre) → persiste + audit");
  await productosService.actualizar({ id: med.id, nombre: "Medicamento QA Inyectable v2", precios: [{ tipo: "PUBLICO", precio: 130.5 }] }, { usuarioId });
  const medV2 = await productosService.obtener(med.id);
  eq(medV2?.nombre, "Medicamento QA Inyectable v2", "nombre actualizado");
  eq(medV2?.precios.find((p) => p.tipo === "PUBLICO")?.precio, 130.5, "precio PUBLICO actualizado");
  const auditPrd = await prisma.auditLog.findFirst({ where: { entidad: "producto", accion: "editar", entidadId: med.id } });
  check(!!auditPrd, "AuditLog producto.editar presente");

  // PRD-06 — filtros y obtener
  caso("PRD-06", "listar con filtros (texto/tipo) y obtener por id");
  const porTexto = await productosService.listar({ q: "Medicamento QA" });
  check(porTexto.some((p) => p.id === med.id), "filtro por texto encuentra el medicamento");
  const porTipo = await productosService.listar({ tipo: "SERVICIO" });
  check(porTipo.some((p) => p.id === serv.id), "filtro por tipo SERVICIO");
  const obtenido = await productosService.obtener(med.id);
  check(obtenido?.id === med.id, "obtener por id");

  // PRD-07 ✗ — SKU/código duplicado y precio negativo
  caso("PRD-07", "SKU duplicado → SkuDuplicadoError; precio negativo → ZodError");
  await lanza(
    "SkuDuplicadoError",
    () => productosService.crear({ sku: "MED-QA-001", nombre: "Dup SKU", unidadMedida: "PZA", tipo: "ACCESORIO", precios: [{ tipo: "PUBLICO", precio: 10 }] }, { usuarioId }),
  );
  await lanza(
    "ZodError",
    () => productosService.crear({ sku: "NEG-QA-001", nombre: "Precio negativo", unidadMedida: "PZA", tipo: "ACCESORIO", precios: [{ tipo: "PUBLICO", precio: -5 }] }, { usuarioId }),
  );
}
