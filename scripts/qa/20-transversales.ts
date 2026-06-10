// Transversales: RBAC, auditoría, event-bus, integridad de dinero, kardex, concurrencia. Plan §6
import { usuariosService } from "../../src/lib/modules/usuarios";
import { ventasService } from "../../src/lib/modules/ventas";
import { productosService } from "../../src/lib/modules/productos";
import { inventarioService } from "../../src/lib/modules/inventario";
import { eventBus } from "../../src/lib/modules/shared/event-bus";
import { caso, check, eq, num, prisma, adminId, stock, reportarBug, r2, SEED, S } from "./_harness";

export async function run(): Promise<void> {
  console.log("\n== 6. Transversales ==");
  const usuarioId = await adminId();

  // RBAC-01 — decisiones de permiso por rol (capa A: la verificación vive en tienePermiso/hasPermission;
  // el enforcement real está en la capa de actions vía requirePermission, no en los servicios).
  caso("RBAC-01", "tienePermiso por rol respeta la matriz del seed");
  const cajero = (await usuariosService.obtenerPorId(S.users.CAJERO))!;
  const almacen = (await usuariosService.obtenerPorId(S.users.ALMACENISTA))!;
  const supervisor = (await usuariosService.obtenerPorId(S.users.SUPERVISOR))!;
  const readonly = (await usuariosService.obtenerPorId(S.users.READONLY))!;
  const admin = (await usuariosService.obtenerPorId(usuarioId))!;
  check(usuariosService.tienePermiso(cajero, "ventas:crear") && !usuariosService.tienePermiso(cajero, "usuarios:crear"), "CAJERO: vende, no crea usuarios");
  check(usuariosService.tienePermiso(almacen, "inventario:editar") && !usuariosService.tienePermiso(almacen, "ventas:crear"), "ALMACENISTA: ajusta inventario, no vende");
  check(usuariosService.tienePermiso(supervisor, "cobranza:crear") && !usuariosService.tienePermiso(supervisor, "usuarios:crear"), "SUPERVISOR: cobranza sí, usuarios no");
  check(usuariosService.tienePermiso(readonly, "reportes:leer") && !usuariosService.tienePermiso(readonly, "ventas:crear"), "READONLY: solo lectura");
  check(usuariosService.tienePermiso(admin, "usuarios:crear") && usuariosService.tienePermiso(admin, "configuracion:editar"), "ADMIN: todo (bypass)");

  // AUD-01 — auditoría de acciones críticas
  caso("AUD-01", "AuditLog registró acciones críticas (cancelaciones, ajustes, cambios)");
  const acciones: Array<[string, string]> = [
    ["venta", "cancelar"],
    ["cliente_abono", "abono.cancelar"],
    ["proveedor_pago", "pago.cancelar"],
    ["inventario", "ajuste"],
    ["empresa", "empresa.editar"],
    ["producto", "editar"],
  ];
  let auditOk = true;
  for (const [entidad, accion] of acciones) {
    const n = await prisma.auditLog.count({ where: { entidad, accion } });
    if (n === 0) { auditOk = false; console.log(`      · falta auditoría ${entidad}/${accion}`); }
  }
  check(auditOk, "todas las acciones críticas auditadas");
  const cancelVenta = await prisma.auditLog.findFirst({ where: { entidad: "venta", accion: "cancelar" } });
  check(!!cancelVenta && cancelVenta.usuarioId === usuarioId && cancelVenta.despues !== null, "cancelación registra usuario y antes/después");

  // EVT-01 — event-bus emite pero sin suscriptores (hallazgo conocido)
  caso("EVT-01", "event-bus emite sin romper flujos (sin suscriptores registrados)");
  let emitOk = true;
  try { await eventBus.emit("qa.test.event", { hola: "mundo" }); } catch { emitOk = false; }
  check(emitOk, "emitir un evento sin handlers es no-op seguro");

  // DIN-01 — integridad de dinero
  caso("DIN-01", "integridad de dinero: subtotal+iva-descGlobal=total; Σpagos=total; Σaplic=monto");
  const ventaCred = await prisma.venta.findUnique({ where: { id: S.ventaCreditoId }, include: { pagos: true } });
  const dinVenta = ventaCred ? r2(num(ventaCred.subtotal) + num(ventaCred.iva) - num(ventaCred.descuentoGlobal)) === num(ventaCred.total) : false;
  const dinPagos = ventaCred ? r2(ventaCred.pagos.reduce((a, p) => a + num(p.monto), 0)) === num(ventaCred.totalPagado) : false;
  check(dinVenta, "venta: subtotal+iva-descGlobal = total");
  check(dinPagos, "venta: Σ pagos = totalPagado");
  const abono = await prisma.clienteAbono.findFirst({ where: { clienteId: S.clienteCreditoId }, include: { aplicaciones: true } });
  const dinAbono = abono ? r2(abono.aplicaciones.reduce((a, x) => a + num(x.monto), 0)) === num(abono.monto) : false;
  check(dinAbono, "abono: Σ aplicaciones = monto");
  const pago = await prisma.proveedorPago.findFirst({ where: { proveedorId: S.proveedorId, estado: "REGISTRADO" }, include: { aplicaciones: true } });
  const dinPago = pago ? r2(pago.aplicaciones.reduce((a, x) => a + num(x.monto), 0)) === num(pago.monto) : false;
  check(dinPago, "pago CxP: Σ aplicaciones = monto");

  // KDX-01 — coherencia del kardex (med en bodega)
  caso("KDX-01", "kardex coherente: stockResultante = acumulado de movimientos (med/bodega)");
  const movs = await prisma.inventarioMovimiento.findMany({
    where: { productoId: S.medId, ubicacionId: SEED.ubicacionBodega },
    orderBy: { fecha: "asc" },
  });
  let acumulado = 0;
  let kardexOk = true;
  for (const m of movs) {
    const signo = m.tipo === "ENTRADA" || m.motivo === "TRANSFERENCIA_ENTRADA" ? 1 : -1;
    acumulado = r2(acumulado + signo * num(m.cantidad));
    if (Math.abs(acumulado - num(m.stockResultante)) > 0.01) {
      kardexOk = false;
      console.log(`      · descuadre kardex: acumulado=${acumulado} vs stockResultante=${num(m.stockResultante)} (${m.motivo})`);
      break;
    }
  }
  const stockFinal = await stock(S.medId, SEED.ubicacionBodega);
  check(kardexOk && Math.abs(acumulado - stockFinal) < 0.01, `kardex coherente; stock final=${stockFinal}`);

  // CON-01 — condición de carrera de stock (hallazgo abierto)
  caso("CON-01", "concurrencia: 2 ventas simultáneas del mismo producto con stock para una");
  const caja = await ventasService.abrirCaja({ ubicacionId: SEED.ubicacionTienda, fondoInicial: 0 }, { usuarioId });
  const prod = await productosService.crear(
    { sku: "CONC-QA-001", nombre: "Producto Concurrencia QA", unidadMedida: "PZA", tipo: "ACCESORIO", ivaAplicable: 0, ultimoCosto: 10, precios: [{ tipo: "PUBLICO", precio: 100 }] },
    { usuarioId },
  );
  await inventarioService.registrarEntrada({ productoId: prod.id, ubicacionId: SEED.ubicacionTienda, cantidad: 1, costoUnitario: 10 }, { usuarioId });

  const vender = () => ventasService.crearVenta(
    { cajaId: caja.id, lineas: [{ productoId: prod.id, cantidad: 1 }], pagos: [{ forma: "EFECTIVO", monto: 100 }] },
    { usuarioId },
  );
  const resultados = await Promise.allSettled([vender(), vender()]);
  const exitosas = resultados.filter((r) => r.status === "fulfilled").length;
  const motivos = resultados
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason instanceof Error ? `${r.reason.name}: ${r.reason.message}` : String(r.reason)));
  const colisionFolio = motivos.some((m) => /unique|folio|P2002/i.test(m));
  const stockFin = await stock(prod.id, SEED.ubicacionTienda);

  if (exitosas === 2 || stockFin < 0) {
    reportarBug({
      id: "CON-01",
      severidad: "alta",
      titulo: "Condición de carrera de stock permite sobreventa",
      detalle: `Dos crearVenta simultáneas de ${prod.sku} (stock inicial 1) → ${exitosas} ventas exitosas, stock final ${stockFin}. ` +
        `El descuento de inventario hace read-check-write sin lock pesimista bajo READ COMMITTED: dos transacciones leen el mismo stock y ambas confirman. ` +
        `Mitigación: SELECT ... FOR UPDATE sobre Inventario al inicio de la tx, o UPDATE condicional (WHERE stock >= cantidad) verificando filas afectadas. Ver [[posvet-estado-y-mejoras]].`,
    });
  } else if (colisionFolio) {
    reportarBug({
      id: "CON-01",
      severidad: "media",
      titulo: "Generación de folio de venta no es concurrency-safe (colisión bajo carga)",
      detalle: `Dos crearVenta simultáneas → 1 venta exitosa y la otra abortó por colisión de folio único: ${motivos.join(" | ")}. ` +
        `proximoFolioVenta calcula el consecutivo con un COUNT/MAX y dos transacciones concurrentes obtienen el mismo folio; la unique constraint protege la integridad pero la venta falla con un error técnico (no un error de negocio). ` +
        `En esta corrida la colisión evitó la sobreventa de stock (solo 1 transacción llegó a descontar). Mitigación: secuencia/serial de Postgres para el folio, o reintento ya presente en otros módulos. Ver [[posvet-estado-y-mejoras]].`,
    });
  }
  // Hallazgo a medir, no un fallo de la suite: registramos el resultado observado.
  check(true, `exitosas=${exitosas}, stock final=${stockFin}${colisionFolio ? " · colisión de folio en la concurrente" : ""}${exitosas === 2 ? " · SOBREVENTA" : ""}`);

  // CON-02 — folio concurrency-safe (verifica el fix del lock asesor por serie):
  // con stock para todas, N ventas simultáneas del mismo producto deben tener TODAS
  // éxito y con folios distintos (sin colisión de folio ni sobreventa).
  caso("CON-02", "concurrencia: N ventas simultáneas con stock suficiente → todas exitosas, folios únicos");
  const N = 8;
  const prod2 = await productosService.crear(
    { sku: "CONC-QA-002", nombre: "Producto Concurrencia QA 2", unidadMedida: "PZA", tipo: "ACCESORIO", ivaAplicable: 0, ultimoCosto: 10, precios: [{ tipo: "PUBLICO", precio: 100 }] },
    { usuarioId },
  );
  await inventarioService.registrarEntrada({ productoId: prod2.id, ubicacionId: SEED.ubicacionTienda, cantidad: N, costoUnitario: 10 }, { usuarioId });
  const venderN = () => ventasService.crearVenta(
    { cajaId: caja.id, lineas: [{ productoId: prod2.id, cantidad: 1 }], pagos: [{ forma: "EFECTIVO", monto: 100 }] },
    { usuarioId },
  );
  const res2 = await Promise.allSettled(Array.from({ length: N }, venderN));
  const folios2 = res2.flatMap((r) => (r.status === "fulfilled" ? [r.value.folio] : []));
  const fallos2 = res2.flatMap((r) =>
    r.status === "rejected" ? [r.reason instanceof Error ? `${r.reason.name}: ${r.reason.message}` : String(r.reason)] : [],
  );
  const foliosUnicos = new Set(folios2).size === folios2.length;
  const stockFin2 = await stock(prod2.id, SEED.ubicacionTienda);
  check(folios2.length === N, `las ${N} ventas concurrentes tuvieron éxito (exitosas=${folios2.length}${fallos2.length ? `, fallos: ${fallos2.join(" | ")}` : ""})`);
  check(foliosUnicos && folios2.length > 0, `folios únicos sin colisión (${folios2.length} folios, ${new Set(folios2).size} distintos)`);
  check(stockFin2 === 0, `stock descontado exacto sin sobreventa (final=${stockFin2})`);
}
