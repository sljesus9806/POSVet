// USR — Usuarios y RBAC. Plan §5.2 (la verificación de permisos por rol está en 20-transversales)
import { usuariosService } from "../../src/lib/modules/usuarios";
import { prisma, caso, check, eq, lanza, adminId, SEED, S } from "./_harness";

const PWD = "QaPassword123";

export async function run(): Promise<void> {
  console.log("\n== 5.2 Usuarios y RBAC ==");
  const usuarioId = await adminId();

  // USR-01
  caso("USR-01", "listarRolesDisponibles=5 y listar incluye admin");
  const roles = await usuariosService.listarRolesDisponibles();
  eq(roles.length, 5, "5 roles del sistema");
  const lista = await usuariosService.listar({ empresaId: SEED.empresaId });
  check(lista.some((u) => u.email === SEED.adminEmail), "admin presente");

  // USR-02 — un usuario por rol (reutilizados en RBAC)
  caso("USR-02", "crear un usuario de cada rol (CAJERO/ALMACENISTA/SUPERVISOR/READONLY)");
  S.users = {};
  for (const rol of ["CAJERO", "ALMACENISTA", "SUPERVISOR", "READONLY"] as const) {
    const u = await usuariosService.crear(
      {
        empresaId: SEED.empresaId,
        email: `${rol.toLowerCase()}.qa@posvet.local`,
        nombre: `QA ${rol}`,
        password: PWD,
        roles: [rol],
      },
      { usuarioId },
    );
    S.users[rol] = u.id;
    check(u.roles.includes(rol), `${rol} creado (${u.id})`);
  }

  // USR-03 — actualizar (cambiar roles + desactivar) sobre un usuario temporal
  caso("USR-03", "actualizar usuario: renombra, cambia roles y desactiva + audit");
  const temp = await usuariosService.crear(
    { empresaId: SEED.empresaId, email: "temp.qa@posvet.local", nombre: "Temp QA", password: PWD, roles: ["CAJERO"] },
    { usuarioId },
  );
  const tempEditado = await usuariosService.actualizar(
    { id: temp.id, email: "temp.qa@posvet.local", nombre: "Temp QA Editado", activo: false, roles: ["READONLY"] },
    { usuarioId },
  );
  eq(tempEditado.nombre, "Temp QA Editado", "renombrado");
  eq(tempEditado.activo, false, "desactivado");
  check(tempEditado.roles.includes("READONLY") && !tempEditado.roles.includes("CAJERO"), "roles cambiados");
  const auditUsr = await prisma.auditLog.findFirst({ where: { entidad: "usuario", accion: "editar", entidadId: temp.id } });
  check(!!auditUsr, "AuditLog usuario.editar presente");

  // USR-04 — cambiarPassword y autenticar con la nueva
  caso("USR-04", "cambiarPassword y autenticar con la nueva contraseña");
  await usuariosService.cambiarPassword({ id: S.users.CAJERO, nuevaPassword: "NuevaClave999" }, { usuarioId });
  const auth = await usuariosService.autenticar({ email: "cajero.qa@posvet.local", password: "NuevaClave999" });
  check(auth.email === "cajero.qa@posvet.local", "autenticación con nueva clave OK");

  // USR-05 — autenticar admin del seed
  caso("USR-05", "autenticar OK con admin del seed");
  const adminAuth = await usuariosService.autenticar({ email: SEED.adminEmail, password: SEED.adminPassword });
  check(adminAuth.roles.includes("ADMIN"), "admin autenticado con rol ADMIN");

  // Usuario dedicado para pruebas de bloqueo
  const lock = await usuariosService.crear(
    { empresaId: SEED.empresaId, email: "lock.qa@posvet.local", nombre: "Lock QA", password: PWD, roles: ["READONLY"] },
    { usuarioId },
  );

  // USR-06 ✗ — password mala incrementa intentosFallidos
  caso("USR-06", "autenticar con password incorrecta → CredencialesInvalidasError + intentosFallidos++");
  await lanza("CredencialesInvalidasError", () => usuariosService.autenticar({ email: "lock.qa@posvet.local", password: "malísima" }));
  const trasFallo = await prisma.usuario.findUnique({ where: { id: lock.id } });
  check((trasFallo?.intentosFallidos ?? 0) >= 1, `intentosFallidos=${trasFallo?.intentosFallidos}`);

  // USR-07 ✗ — 5 intentos → bloqueo; autenticar bloqueado aún con pass correcta
  caso("USR-07", "5 intentos fallidos → bloqueo 15 min (UsuarioBloqueadoError con pass correcta)");
  // ya van >=1; completar hasta 5 fallos
  for (let i = 0; i < 4; i++) {
    try { await usuariosService.autenticar({ email: "lock.qa@posvet.local", password: "malísima" }); } catch { /* esperado */ }
  }
  const bloqueado = await prisma.usuario.findUnique({ where: { id: lock.id } });
  check(!!bloqueado?.bloqueadoHasta && bloqueado.bloqueadoHasta > new Date(), `bloqueadoHasta=${bloqueado?.bloqueadoHasta?.toISOString()}`);
  await lanza("UsuarioBloqueadoError", () => usuariosService.autenticar({ email: "lock.qa@posvet.local", password: PWD }), "bloqueado aun con pass correcta");

  // USR-08 — desbloquear y autenticar de nuevo
  caso("USR-08", "desbloquear permite autenticar de nuevo");
  await usuariosService.desbloquear({ id: lock.id }, { usuarioId });
  const desbloqueado = await usuariosService.autenticar({ email: "lock.qa@posvet.local", password: PWD });
  check(desbloqueado.id === lock.id, "autenticación tras desbloqueo OK");

  // USR-09 ✗ — email duplicado
  caso("USR-09", "crear con email duplicado → EmailEnUsoError");
  await lanza(
    "EmailEnUsoError",
    () => usuariosService.crear({ empresaId: SEED.empresaId, email: SEED.adminEmail, nombre: "Dup", password: PWD, roles: ["READONLY"] }, { usuarioId }),
  );

  // USR-10 ✗ — admin se auto-desactiva
  caso("USR-10", "admin se auto-desactiva → AutoDesactivacionError");
  await lanza(
    "AutoDesactivacionError",
    () => usuariosService.actualizar({ id: usuarioId, email: SEED.adminEmail, nombre: "Administrador", activo: false, roles: ["ADMIN"] }, { usuarioId }),
  );
}
