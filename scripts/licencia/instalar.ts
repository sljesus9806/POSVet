// Instala un token de licencia en la BD de ESTE equipo (lado cliente).
//
//   npm run lic:instalar -- <token>
//   npm run lic:instalar -- --archivo .licencia/emitidas/lic_xxxx.lic
//   npm run lic:emitir -- --cliente "X" | npm run lic:instalar
//
// El id de instalación se deriva del hostname (puede forzarse con --instalacion).

import { readFileSync } from "node:fs";
import { hostname } from "node:os";
import { licenciaService } from "../../src/lib/modules/licencia";
import { prisma } from "../../src/lib/modules/shared/db";

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function leerToken(): Promise<string> {
  const archivo = arg("archivo");
  if (archivo) return readFileSync(archivo, "utf8");

  const posicional = process.argv[2];
  if (posicional && !posicional.startsWith("--")) return posicional;

  // stdin (modo pipe)
  return readFileSync(0, "utf8");
}

async function main() {
  const token = (await leerToken()).trim();
  if (!token) {
    console.error("No se recibió token (argumento, --archivo o stdin).");
    process.exit(1);
  }
  const instalacion = arg("instalacion") ?? hostname();
  const row = await licenciaService.instalar(token, instalacion);
  console.log(
    `Licencia instalada: ${row.licenseId} para "${row.cliente}" (${row.modo}).`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
