// Secuencia de arranque del POSVet de escritorio. La usa tanto Electron como el
// test headless. Pasos:
//   1. Arranca un Postgres embebido (datos en la carpeta del usuario).
//   2. Crea la BD si no existe.
//   3. Aplica las migraciones (SQL de prisma/migrations) — sin la CLI de Prisma.
//   4. Siembra datos iniciales en la primera corrida (roles, permisos, admin).
//   5. Arranca el servidor Next standalone apuntando a esa BD.
// Devuelve { url, stop } para que el caller abra la ventana y cierre limpio.

import { spawn } from "node:child_process";
import net from "node:net";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const PG_USER = "posvet";
const PG_PASSWORD = "posvet";
const PG_DB = "posvet";

function log(...args) {
  console.log("[boot]", ...args);
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// Aplica las migraciones de prisma/migrations que aún no se han corrido.
// Registra las aplicadas en una tabla propia para ser idempotente, sin
// depender de `prisma migrate` (que no existe en la app empaquetada).
async function aplicarMigraciones(connectionString, root) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS __desktop_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    );
    const { rows } = await client.query(
      "SELECT name FROM __desktop_migrations",
    );
    const aplicadas = new Set(rows.map((r) => r.name));

    const dir = path.join(root, "prisma", "migrations");
    const carpetas = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    let nuevas = 0;
    for (const nombre of carpetas) {
      if (aplicadas.has(nombre)) continue;
      const sql = readFileSync(
        path.join(dir, nombre, "migration.sql"),
        "utf8",
      );
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO __desktop_migrations (name) VALUES ($1)",
          [nombre],
        );
        await client.query("COMMIT");
        nuevas++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migración ${nombre} falló: ${err.message}`);
      }
    }
    log(`migraciones: ${nuevas} nueva(s), ${aplicadas.size} ya aplicadas`);
    return aplicadas.size + nuevas;
  } finally {
    await client.end();
  }
}

// Corre el seed solo si la BD está vacía (sin usuarios).
async function sembrarSiVacia(databaseUrl, root) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  let vacia = true;
  try {
    const { rows } = await client.query(
      `SELECT to_regclass('public."Usuario"') IS NOT NULL AS existe`,
    );
    if (rows[0]?.existe) {
      const r = await client.query('SELECT COUNT(*)::int AS n FROM "Usuario"');
      vacia = r.rows[0].n === 0;
    }
  } finally {
    await client.end();
  }
  if (!vacia) {
    log("seed: omitido (ya hay datos)");
    return;
  }
  log("seed: BD vacía, sembrando datos iniciales…");
  // En la app empaquetada se incluye un seed compilado (seed.mjs) que corre con
  // node a secas; en dev usamos tsx sobre el seed.ts original.
  const seedCompilado = path.join(root, "prisma", "seed.mjs");
  const args = existsSync(seedCompilado)
    ? [seedCompilado]
    : [
        path.join(root, "node_modules", "tsx", "dist", "cli.mjs"),
        path.join(root, "prisma", "seed.ts"),
      ];
  await ejecutar(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1", // usar el binario de Electron como Node puro
      DATABASE_URL: databaseUrl,
      SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? "admin@posvet.local",
      SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? "admin12345",
      SEED_ADMIN_NOMBRE: process.env.SEED_ADMIN_NOMBRE ?? "Administrador",
    },
  });
}

function ejecutar(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("error", reject);
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} salió con ${code}`)),
    );
  });
}

async function esperarServidor(url, intentos = 40) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(`${url}/login`, { redirect: "manual" });
      if (res.status > 0) return true;
    } catch {
      // todavía no levanta
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("El servidor Next no respondió a tiempo");
}

/**
 * Arranca todo el stack. `dataDir` es donde viven los datos de Postgres
 * (persistentes entre sesiones). Devuelve { url, stop }.
 */
export async function boot({ dataDir, authSecret, appRoot = ROOT }) {
  const root = appRoot;
  const pgPort = await freePort();
  const nextPort = await freePort();
  const databaseUrl = `postgresql://${PG_USER}:${PG_PASSWORD}@127.0.0.1:${pgPort}/${PG_DB}?schema=public`;

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: PG_USER,
    password: PG_PASSWORD,
    port: pgPort,
    persistent: true,
  });

  const yaInicializado = existsSync(path.join(dataDir, "PG_VERSION"));
  if (!yaInicializado) {
    log("inicializando cluster de Postgres…");
    await pg.initialise();
  }
  log(`arrancando Postgres en :${pgPort}`);
  await pg.start();

  try {
    await pg.createDatabase(PG_DB);
  } catch {
    // ya existe
  }

  await aplicarMigraciones(databaseUrl, root);
  await sembrarSiVacia(databaseUrl, root);

  log(`arrancando servidor Next en :${nextPort}`);
  const server = spawn(
    process.execPath,
    [path.join(root, ".next", "standalone", "server.js")],
    {
      cwd: path.join(root, ".next", "standalone"),
      stdio: "inherit",
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1", // usar el binario de Electron como Node puro
        DATABASE_URL: databaseUrl,
        AUTH_SECRET: authSecret,
        AUTH_URL: `http://127.0.0.1:${nextPort}`,
        AUTH_TRUST_HOST: "true",
        PORT: String(nextPort),
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
      },
    },
  );

  const url = `http://127.0.0.1:${nextPort}`;
  await esperarServidor(url);
  log(`listo en ${url}`);

  async function stop() {
    log("deteniendo…");
    server.kill();
    await pg.stop().catch(() => {});
  }

  return { url, databaseUrl, stop };
}
