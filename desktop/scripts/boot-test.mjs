// Verificación headless de la secuencia de arranque del escritorio:
// Postgres embebido + migraciones + seed + servidor Next, todo SIN Docker.
//
//   node desktop/scripts/boot-test.mjs
//
// Usa una carpeta de datos temporal y la borra al final.

import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { boot } from "../electron/boot.mjs";

const dataDir = mkdtempSync(path.join(tmpdir(), "posvet-pg-"));
let handle;

try {
  console.log(`\n== Arrancando stack de escritorio (datos: ${dataDir}) ==\n`);
  handle = await boot({
    dataDir,
    authSecret: randomBytes(32).toString("base64"),
  });

  // 1) La BD tiene el esquema y el seed
  const client = new pg.Client({ connectionString: handle.databaseUrl });
  await client.connect();
  const usuarios = await client.query('SELECT COUNT(*)::int n FROM "Usuario"');
  const roles = await client.query('SELECT COUNT(*)::int n FROM "Rol"');
  const permisos = await client.query('SELECT COUNT(*)::int n FROM "Permiso"');
  await client.end();

  // 2) El servidor responde
  const login = await fetch(`${handle.url}/login`);

  console.log("\n== RESULTADOS ==");
  console.log(`migraciones+seed -> usuarios: ${usuarios.rows[0].n}, roles: ${roles.rows[0].n}, permisos: ${permisos.rows[0].n}`);
  console.log(`servidor Next    -> GET /login: HTTP ${login.status}`);

  const ok =
    usuarios.rows[0].n > 0 &&
    roles.rows[0].n > 0 &&
    login.status === 200;
  console.log(`\n${ok ? "✓ ARRANQUE DE ESCRITORIO OK" : "✗ FALLÓ"}\n`);
  process.exitCode = ok ? 0 : 1;
} catch (err) {
  console.error("✗ Error:", err);
  process.exitCode = 1;
} finally {
  if (handle) await handle.stop();
  rmSync(dataDir, { recursive: true, force: true });
}
