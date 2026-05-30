// CMP — Compras (OC + recepción) y costo promedio ponderado. Plan §5.7
import { comprasService } from "../../src/lib/modules/compras";
import { productosService } from "../../src/lib/modules/productos";
import { caso, check, eq, lanza, lanzaAlguno, prisma, adminId, num, stock, SEED, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.7 Compras ==");
  const usuarioId = await adminId();
  const bodega = SEED.ubicacionBodega;

  // Producto dedicado de stock 0 para medir costo promedio con precisión
  const cmp = await productosService.crear(
    { sku: "CMP-QA-001", nombre: "Producto Compra QA", unidadMedida: "PZA", tipo: "ACCESORIO", ivaAplicable: 0.16, ultimoCosto: 0, precios: [{ tipo: "PUBLICO", precio: 300 }] },
    { usuarioId },
  );
  S.cmpProdId = cmp.id;

  // CMP-01 — crear OC borrador con líneas + totales
  caso("CMP-01", "crearOrden (borrador) con líneas → totales correctos");
  const oc = await comprasService.crearOrden(
    {
      proveedorId: S.proveedorId,
      ubicacionDestinoId: bodega,
      lineas: [
        { productoId: cmp.id, cantidad: 10, costoUnitario: 100, ivaTasa: 0.16 },
        { productoId: S.medId, cantidad: 5, costoUnitario: 50, ivaTasa: 0.16 },
      ],
    },
    { usuarioId },
  );
  S.ocRecibidaId = oc.id;
  eq(oc.subtotal, 1250, "subtotal = 10*100 + 5*50");
  eq(oc.iva, 200, "iva = 16% del subtotal");
  eq(oc.total, 1450, "total = subtotal + iva");
  eq(oc.estado, "BORRADOR", "estado BORRADOR");
  const lineaCmp = oc.lineas.find((l) => l.productoId === cmp.id)!;
  const lineaMed = oc.lineas.find((l) => l.productoId === S.medId)!;

  // CMP-02 — enviar
  caso("CMP-02", "enviarOrden BORRADOR→ENVIADA");
  const enviada = await comprasService.enviarOrden({ ordenCompraId: oc.id }, { usuarioId });
  eq(enviada.estado, "ENVIADA", "estado ENVIADA");

  // CMP-03 — recepción parcial
  caso("CMP-03", "registrarRecepcion parcial → stock Bodega, costoPromedio, RECIBIDA_PARCIAL");
  const stockCmpAntes = await stock(cmp.id, bodega);
  await comprasService.registrarRecepcion(
    { ordenCompraId: oc.id, lineas: [{ ocLineaId: lineaCmp.id, cantidad: 6, costoUnitario: 100 }] },
    { usuarioId },
  );
  eq(await stock(cmp.id, bodega), stockCmpAntes + 6, "stock bodega +6");
  const cmpTrasParcial = await prisma.producto.findUnique({ where: { id: cmp.id } });
  eq(num(cmpTrasParcial?.costoPromedio), 100, "costoPromedio = 100 (stock previo 0)");
  eq(num(cmpTrasParcial?.ultimoCosto), 100, "ultimoCosto = 100");
  const ocParcial = await comprasService.obtenerOrden(oc.id);
  eq(ocParcial?.estado, "RECIBIDA_PARCIAL", "estado RECIBIDA_PARCIAL");
  const kardexRec = await prisma.inventarioMovimiento.findFirst({ where: { productoId: cmp.id, referenciaTipo: "recepcion" } });
  check(!!kardexRec, "kardex de recepción presente");

  // CMP-04 — recepción del resto → total
  caso("CMP-04", "registrarRecepcion del resto → RECIBIDA_TOTAL + costo promedio ponderado");
  const futura = new Date(); futura.setDate(futura.getDate() + 300);
  await comprasService.registrarRecepcion(
    {
      ordenCompraId: oc.id,
      lineas: [
        { ocLineaId: lineaCmp.id, cantidad: 4, costoUnitario: 150 },
        { ocLineaId: lineaMed.id, cantidad: 5, costoUnitario: 50, lote: "CMP-LOTE-MED", caducidad: futura.toISOString() },
      ],
    },
    { usuarioId },
  );
  const ocTotal = await comprasService.obtenerOrden(oc.id);
  eq(ocTotal?.estado, "RECIBIDA_TOTAL", "estado RECIBIDA_TOTAL");
  const cmpFinal = await prisma.producto.findUnique({ where: { id: cmp.id } });
  // (6*100 + 4*150) / 10 = 120
  eq(num(cmpFinal?.costoPromedio), 120, "costo promedio ponderado = 120");

  // CMP-05 — consultas
  caso("CMP-05", "listarOrdenes / obtenerOrden / listarRecepciones / obtenerRecepcion");
  const ordenes = await comprasService.listarOrdenes();
  check(ordenes.some((o) => o.id === oc.id), "listarOrdenes incluye la OC");
  const recepciones = await comprasService.listarRecepciones({ ordenCompraId: oc.id });
  eq(recepciones.length, 2, "2 recepciones");
  const recDet = await comprasService.obtenerRecepcion(recepciones[0].id);
  check(!!recDet && recDet.lineas.length > 0, "detalle de recepción con líneas");

  // CMP-06 — cancelar OC en borrador
  caso("CMP-06", "cancelarOrden sobre OC en borrador → CANCELADA");
  const ocBorrador = await comprasService.crearOrden(
    { proveedorId: S.proveedorId, ubicacionDestinoId: bodega, lineas: [{ productoId: cmp.id, cantidad: 2, costoUnitario: 100, ivaTasa: 0 }] },
    { usuarioId },
  );
  const cancelada = await comprasService.cancelarOrden({ ordenCompraId: ocBorrador.id, motivo: "QA cancelación" }, { usuarioId });
  eq(cancelada.estado, "CANCELADA", "estado CANCELADA");

  // CMP-07 ✗ — recepción > pendiente y cancelar OC ya recibida
  caso("CMP-07", "recepción > cantidad pedida y cancelar OC recibida → errores controlados");
  const ocExcede = await comprasService.crearOrden(
    { proveedorId: S.proveedorId, ubicacionDestinoId: bodega, lineas: [{ productoId: cmp.id, cantidad: 3, costoUnitario: 100, ivaTasa: 0 }] },
    { usuarioId },
  );
  await comprasService.enviarOrden({ ordenCompraId: ocExcede.id }, { usuarioId });
  const ocExcedeDet = await comprasService.obtenerOrden(ocExcede.id);
  const lineaExcede = ocExcedeDet!.lineas[0];
  await lanza("RecepcionExcedeOcError", () => comprasService.registrarRecepcion({ ordenCompraId: ocExcede.id, lineas: [{ ocLineaId: lineaExcede.id, cantidad: 99, costoUnitario: 100 }] }, { usuarioId }), "recibir más de lo pedido");
  await lanzaAlguno(["TransicionOcInvalidaError"], () => comprasService.cancelarOrden({ ordenCompraId: oc.id, motivo: "QA no debe poder" }, { usuarioId }), "cancelar OC ya recibida");
}
