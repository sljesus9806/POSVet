// DSH — Dashboard (datos que alimentan la pantalla de inicio, PR #19). Plan §5.12
// El dashboard es UI; en capa A verificamos los datos/derivaciones que consume y las
// decisiones de permiso (hasPermission) que ocultan/muestran tarjetas y navegación.
import { reportesService } from "../../src/lib/modules/reportes";
import { cobranzaService } from "../../src/lib/modules/cobranza";
import { inventarioService } from "../../src/lib/modules/inventario";
import { ventasService } from "../../src/lib/modules/ventas";
import { usuariosService } from "../../src/lib/modules/usuarios";
import { caso, check, S } from "./_harness";

// Réplica de hasPermission (src/lib/auth-helpers.ts) para la verificación visual de RBAC.
function puede(u: { roles: string[]; permisos: string[] }, codigo: string): boolean {
  if (u.roles.includes("ADMIN")) return true;
  return u.permisos.includes(codigo);
}

export async function run(): Promise<void> {
  console.log("\n== 5.12 Dashboard ==");
  const desde = new Date(); desde.setHours(0, 0, 0, 0);
  const hasta = new Date(); hasta.setHours(23, 59, 59, 999);

  // DSH-01 — datos del dashboard tras toda la operación
  caso("DSH-01", "ventas de hoy>0, por cobrar>0, alertas reflejan INV-03/PRD-04, caja del día existe");
  const vdd = await reportesService.ventasDelDia({ desde, hasta });
  check(vdd.totalVendido > 0 && vdd.porHora.length > 0, `ventas hoy=${vdd.totalVendido}, franjas=${vdd.porHora.length}`);
  const cob = await cobranzaService.resumen();
  check(cob.totalPorCobrar > 0, `por cobrar=${cob.totalPorCobrar}`);
  const bajo = await inventarioService.alertasBajoStock();
  const caduca = await inventarioService.alertasPorCaducar(30);
  check(bajo.some((a) => a.productoId === S.aliId), "alerta de bajo stock (ali) presente");
  check(caduca.some((a) => a.loteId === S.loteProximoId), "alerta por caducar (lote próximo) presente");
  const cajas = await ventasService.listarCajas({ limit: 5 });
  check(cajas.length > 0, `caja(s) del día visibles (${cajas.length})`);

  // DSH-02 — RBAC visual (decisiones de permiso por rol)
  caso("DSH-02", "RBAC visual: CAJERO no ve 'Por cobrar'(cuentas/reportes) ; READONLY no muta; ALMACENISTA ve inventario");
  const cajero = await usuariosService.obtenerPorId(S.users.CAJERO);
  const readonly = await usuariosService.obtenerPorId(S.users.READONLY);
  const almacen = await usuariosService.obtenerPorId(S.users.ALMACENISTA);
  // El POS muestra "Por cobrar" gated por reportes/cuentas-pagar; el CAJERO no tiene esos permisos.
  check(cajero ? !puede(cajero, "reportes:leer") && !puede(cajero, "cuentas-pagar:leer") : false, "CAJERO sin acceso a reportes/CxP");
  check(readonly ? !puede(readonly, "ventas:crear") && !puede(readonly, "inventario:editar") : false, "READONLY no muta nada");
  check(almacen ? puede(almacen, "inventario:leer") && puede(almacen, "inventario:editar") : false, "ALMACENISTA ve y ajusta inventario");
}
