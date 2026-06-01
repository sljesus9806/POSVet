// Provisionador semi-manual de un cliente POSVet en la nube.
//
//   node deploy/provisionar.mjs <slug> [--nombre "Negocio"]
//   ej: node deploy/provisionar.mjs serengueti --nombre "Veterinaria Serengueti"
//
// Pasos: crea la BD pos_<slug> en el Postgres compartido, aplica migraciones,
// siembra (solo si está vacía) y levanta el contenedor del cliente enrutado a
// http://<slug>.<BASE_DOMAIN> vía Traefik.
//
// Requiere el stack base arriba:  cd deploy && docker compose up -d

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEPLOY_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DEPLOY_DIR, "..");
const DB_CONTAINER = "posvet-saas-db";

function leerEnv(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const linea of readFileSync(file, "utf8").split("\n")) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("error", reject);
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} → ${code}`)),
    );
  });
}

function capture(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "inherit"], ...opts });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("error", reject);
    p.on("exit", (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(`${cmd} → ${code}`)),
    );
  });
}

function arg(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const slug = process.argv[2];
  if (!slug || slug.startsWith("--")) {
    console.error('Uso: node deploy/provisionar.mjs <slug> [--nombre "Negocio"]');
    process.exit(1);
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    console.error("El slug debe ser minúsculas, números y guiones (ej: serengueti).");
    process.exit(1);
  }
  const nombre = arg("nombre") ?? slug;

  const env = leerEnv(path.join(DEPLOY_DIR, ".env"));
  const PGUSER = env.POSTGRES_USER ?? "posvet";
  const PGPASS = env.POSTGRES_PASSWORD ?? "posvet";
  const IMAGE = env.POSVET_IMAGE ?? "posvet:latest";
  const BASE_DOMAIN = env.BASE_DOMAIN ?? "localhost";

  const dbName = `pos_${slug.replace(/-/g, "_")}`;
  const container = `posvet-${slug}`;
  const host = `${slug}.${BASE_DOMAIN}`;
  const urlHost = `postgresql://${PGUSER}:${PGPASS}@localhost:5435/${dbName}?schema=public`;
  const urlContainer = `postgresql://${PGUSER}:${PGPASS}@db:5432/${dbName}?schema=public`;

  // 0) ¿El stack base está arriba?
  const corriendo = await capture("docker", [
    "ps", "--filter", `name=${DB_CONTAINER}`, "--format", "{{.Names}}",
  ]).catch(() => "");
  if (!corriendo.includes(DB_CONTAINER)) {
    console.error(
      `No encuentro el contenedor ${DB_CONTAINER}. Levanta el stack base:\n  cd deploy && docker compose up -d`,
    );
    process.exit(1);
  }

  // 1) Crear la BD si no existe.
  console.log(`\n[1/5] BD ${dbName}…`);
  const existe = await capture("docker", [
    "exec", DB_CONTAINER, "psql", "-U", PGUSER, "-d", "postgres", "-tAc",
    `SELECT 1 FROM pg_database WHERE datname='${dbName}'`,
  ]);
  if (existe.trim() === "1") {
    console.log("    ya existe.");
  } else {
    await run("docker", ["exec", DB_CONTAINER, "createdb", "-U", PGUSER, dbName]);
    console.log("    creada.");
  }

  // 2) Migraciones (desde el host).
  console.log(`[2/5] migraciones…`);
  await run("npx", ["prisma", "migrate", "deploy"], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: urlHost },
  });

  // 3) Seed solo si la BD está vacía.
  console.log(`[3/5] seed…`);
  const usuarios = await capture("docker", [
    "exec", DB_CONTAINER, "psql", "-U", PGUSER, "-d", dbName, "-tAc",
    'SELECT COUNT(*) FROM "Usuario"',
  ]);
  if (parseInt(usuarios.trim(), 10) > 0) {
    console.log("    omitido (ya hay datos).");
  } else {
    await run("npx", ["tsx", "prisma/seed.ts"], {
      cwd: ROOT,
      env: {
        ...process.env,
        DATABASE_URL: urlHost,
        SEED_ADMIN_NOMBRE: process.env.SEED_ADMIN_NOMBRE ?? `Admin ${nombre}`,
      },
    });
  }

  // 3.5) Licencia del cliente. Offline a su nombre (se muestra "Licenciado a:").
  // Como tú hospedas, el corte se hace apagando el contenedor; la licencia da
  // identidad y consistencia con la versión de escritorio.
  console.log(`[lic] licencia…`);
  const usuariosLic = await capture("docker", [
    "exec", DB_CONTAINER, "psql", "-U", PGUSER, "-d", dbName, "-tAc",
    'SELECT COUNT(*) FROM "Licencia"',
  ]).catch(() => "0");
  if (parseInt(usuariosLic.trim(), 10) > 0) {
    console.log("    ya tiene licencia.");
  } else {
    const salida = await capture(
      "npx",
      ["tsx", "scripts/licencia/emitir.ts", "--cliente", nombre, "--modo", "offline", "--meses", "120"],
      { cwd: ROOT },
    );
    const token = salida.trim().split("\n").pop();
    await run(
      "npx",
      ["tsx", "scripts/licencia/instalar.ts", token, "--instalacion", slug],
      { cwd: ROOT, env: { ...process.env, DATABASE_URL: urlHost } },
    );
  }

  // 4) AUTH_SECRET persistente por cliente.
  const tenantsDir = path.join(DEPLOY_DIR, "tenants");
  mkdirSync(tenantsDir, { recursive: true });
  const secretFile = path.join(tenantsDir, `${slug}.secret`);
  let authSecret;
  if (existsSync(secretFile)) {
    authSecret = readFileSync(secretFile, "utf8").trim();
  } else {
    authSecret = randomBytes(32).toString("base64");
    writeFileSync(secretFile, authSecret, { mode: 0o600 });
  }

  // 5) (Re)levantar el contenedor del cliente.
  console.log(`[4/5] contenedor ${container}…`);
  await capture("docker", ["rm", "-f", container]).catch(() => {});
  await run("docker", [
    "run", "-d",
    "--name", container,
    "--restart", "unless-stopped",
    "--network", "posvet-saas-net",
    "-e", `DATABASE_URL=${urlContainer}`,
    "-e", `AUTH_SECRET=${authSecret}`,
    "-e", `AUTH_URL=http://${host}`,
    "-e", "AUTH_TRUST_HOST=true",
    "-e", "PORT=3000",
    "-e", "HOSTNAME=0.0.0.0",
    IMAGE,
  ]);

  // 6) Ruta en Traefik (file provider): Host(<host>) -> http://<container>:3000
  const dynDir = path.join(DEPLOY_DIR, "dynamic");
  mkdirSync(dynDir, { recursive: true });
  const ruta = [
    "http:",
    "  routers:",
    `    ${slug}:`,
    `      rule: "Host(\`${host}\`)"`,
    `      service: ${slug}`,
    "      entryPoints: [web]",
    "  services:",
    `    ${slug}:`,
    "      loadBalancer:",
    "        servers:",
    `          - url: "http://${container}:3000"`,
    "",
  ].join("\n");
  writeFileSync(path.join(dynDir, `${slug}.yml`), ruta);

  console.log(`[5/5] listo.\n`);
  console.log(`  Cliente:   ${nombre} (${slug})`);
  console.log(`  POS:       http://${host}`);
  console.log(`  BD:        ${dbName}`);
  console.log(`  Admin:     admin@posvet.local / admin12345\n`);
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
