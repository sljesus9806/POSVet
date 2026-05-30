// INV — Inventario y kardex. Plan §5.4
import { inventarioService } from "../../src/lib/modules/inventario";
import { caso, check, eq, lanza, adminId, num, prisma, stock, SEED, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 5.4 Inventario ==");
  const usuarioId = await adminId();
  const bodega = SEED.ubicacionBodega;
  const tienda = SEED.ubicacionTienda;

  // INV-01 — entradas de stock inicial a Bodega (productos QA empiezan en 0)
  caso("INV-01", "registrarEntrada de stock inicial a Bodega → movimiento ENTRADA y stock correcto");
  await inventarioService.registrarEntrada({ productoId: S.medId, ubicacionId: bodega, cantidad: 100, costoUnitario: 50 }, { usuarioId });
  await inventarioService.registrarEntrada({ productoId: S.aliId, ubicacionId: bodega, cantidad: 50, costoUnitario: 200 }, { usuarioId });
  await inventarioService.registrarEntrada({ productoId: S.accId, ubicacionId: bodega, cantidad: 200, costoUnitario: 20 }, { usuarioId });
  eq(await stock(S.medId, bodega), 100, "med bodega = 100");
  eq(await stock(S.aliId, bodega), 50, "ali bodega = 50");
  const movEntrada = await prisma.inventarioMovimiento.findFirst({ where: { productoId: S.medId, ubicacionId: bodega, motivo: "COMPRA", tipo: "ENTRADA" }, orderBy: { fecha: "desc" } });
  check(!!movEntrada, "movimiento ENTRADA/COMPRA registrado");

  // INV-02 — listarStock y stockDeProducto
  caso("INV-02", "listarStock por ubicación y stockDeProducto multi-ubicación");
  const stockBodega = await inventarioService.listarStock({ ubicacionId: bodega });
  check(stockBodega.some((s) => s.productoId === S.medId), "med aparece en stock de bodega");
  const resumen = await inventarioService.stockDeProducto(S.medId);
  eq(resumen?.stockTotal, 100, "stock total med = 100 (solo bodega)");

  // INV-03 — stock mínimo por debajo (med) y por encima (ali → alerta)
  caso("INV-03", "definirStockMinimo: med min<stock (sin alerta), ali min>stock (con alerta)");
  await inventarioService.definirStockMinimo({ productoId: S.medId, ubicacionId: bodega, stockMinimo: 10 }, { usuarioId });
  await inventarioService.definirStockMinimo({ productoId: S.aliId, ubicacionId: bodega, stockMinimo: 80 }, { usuarioId });
  const invAli = await prisma.inventario.findUnique({ where: { productoId_ubicacionId: { productoId: S.aliId, ubicacionId: bodega } } });
  eq(num(invAli?.stockMinimo), 80, "stockMinimo ali = 80");

  // INV-04 — ajustes MERMA y CONTEO con observación
  caso("INV-04", "ajustarStock MERMA(-) y CONTEO(±) → kardex + stockResultante coherente");
  const antesMerma = await stock(S.medId, bodega);
  const merma = await inventarioService.ajustarStock({ productoId: S.medId, ubicacionId: bodega, delta: -5, motivo: "AJUSTE_MERMA", observaciones: "QA merma" }, { usuarioId });
  eq(merma.stock, antesMerma - 5, "stock tras merma");
  eq(num(merma.mov.stockResultante), antesMerma - 5, "stockResultante del movimiento coherente");
  const conteo = await inventarioService.ajustarStock({ productoId: S.medId, ubicacionId: bodega, delta: 3, motivo: "AJUSTE_CONTEO", observaciones: "QA conteo" }, { usuarioId });
  eq(conteo.stock, antesMerma - 2, "stock tras conteo (+3)");

  // INV-05 — transferencia Bodega→Tienda
  caso("INV-05", "crearTransferencia Bodega→Tienda → descuenta origen, suma destino, 2 movimientos, COMPLETADA");
  const origenAntes = await stock(S.medId, bodega);
  const destinoAntes = await stock(S.medId, tienda);
  const transf = await inventarioService.crearTransferencia(
    { origenId: bodega, destinoId: tienda, lineas: [{ productoId: S.medId, cantidad: 20 }], observaciones: "QA transfer" },
    { usuarioId },
  );
  eq(await stock(S.medId, bodega), origenAntes - 20, "origen descontado");
  eq(await stock(S.medId, tienda), destinoAntes + 20, "destino sumado");
  eq(transf.estado, "COMPLETADA", "estado COMPLETADA");
  const movsTransf = await prisma.inventarioMovimiento.count({ where: { referenciaTipo: "transferencia", referenciaId: transf.id } });
  eq(movsTransf, 2, "2 movimientos de transferencia");
  const lista = await inventarioService.listarTransferencias();
  check(lista.some((t) => t.id === transf.id), "listarTransferencias incluye la nueva");

  // INV-06 — alertas
  caso("INV-06", "alertasBajoStock incluye ali; alertasPorCaducar(30) incluye lote próximo");
  const bajo = await inventarioService.alertasBajoStock();
  check(bajo.some((a) => a.productoId === S.aliId), `bajo stock: ${bajo.map((a) => a.sku).join(",")}`);
  const porCaducar = await inventarioService.alertasPorCaducar(30);
  check(porCaducar.some((a) => a.loteId === S.loteProximoId), "lote próximo (~20d) aparece en 30d");

  // INV-07 — kardex
  caso("INV-07", "listarMovimientos (kardex) traza las operaciones");
  const movs = await inventarioService.listarMovimientos({ productoId: S.medId });
  check(movs.length >= 4, `med tiene ${movs.length} movimientos`);

  // INV-08 ✗ — stock negativo
  caso("INV-08", "ajuste que deja stock negativo → StockInsuficienteError");
  await lanza("StockInsuficienteError", () => inventarioService.ajustarStock({ productoId: S.medId, ubicacionId: bodega, delta: -100000, motivo: "AJUSTE_MERMA" }, { usuarioId }));
}
